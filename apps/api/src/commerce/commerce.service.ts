import { createHash, createHmac } from 'node:crypto';
import {
  AssignmentStatus,
  AvailabilityStatus,
  BookingStatus,
  PaymentAttemptStatus,
  PaymentStatus,
  Prisma,
  RefundStatus,
  ServiceOtpPurpose,
  ServiceOtpStatus,
  WalletEntryDirection,
  WalletEntryState,
  WithdrawalStatus,
} from '@beautyathome/database';
import {
  assertWithdrawalAllowed,
  rankAssignmentCandidates,
  type AssignmentCandidate,
} from '@beautyathome/booking';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { runSerializable } from '../common/database/serializable';
import { AppException } from '../common/errors/app.exception';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma/prisma.service';
import { CommerceDomainService } from './commerce-domain.service';
import { MockRazorpayGateway } from './providers/payment-gateway';
import { MockPayoutProvider } from './providers/payout-provider';
import type {
  AdminDecision,
  AdminOverride,
  BookingAction,
  BookingCancel,
  BookingCreateRequest,
  BookingDecision,
  BookingListQuery,
  CommissionRuleCreate,
  OtpVerify,
  PaymentConfirm,
  PayoutAccountCreate,
  ReminderRequest,
  ReviewRequest,
  WebhookInput,
  WithdrawalCreate,
} from './commerce.validation';

const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PAYMENT_PENDING,
  BookingStatus.REQUESTED,
  BookingStatus.ACCEPTED,
  BookingStatus.CONFIRMED,
  BookingStatus.EN_ROUTE,
  BookingStatus.ARRIVED,
  BookingStatus.START_OTP_PENDING,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETION_OTP_PENDING,
];

@Injectable()
export class CommerceService {
  private readonly payment: MockRazorpayGateway;
  private readonly payout = new MockPayoutProvider();
  constructor(
    private readonly prisma: PrismaService,
    private readonly domain: CommerceDomainService,
    config: ConfigService<Environment, true>,
  ) {
    this.payment = new MockRazorpayGateway(
      config.get('PAYMENT_MOCK_SECRET', { infer: true }) ??
        'development-payment-secret-change-me',
    );
  }

  async createBooking(
    actor: AuthenticatedActor,
    input: BookingCreateRequest,
    idempotencyKey: string,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { idempotencyKey },
      });
      if (existing) return this.bookingView(existing);
      const [slot, address] = await Promise.all([
        tx.availabilitySlot.findUnique({
          where: { id: input.availabilitySlotId },
        }),
        tx.customerAddress.findFirst({
          where: {
            id: input.addressId,
            customerUserId: actor.userId,
            deletedAt: null,
          },
        }),
      ]);
      if (
        !slot ||
        slot.status !== AvailabilityStatus.AVAILABLE ||
        slot.serviceId !== input.serviceId ||
        slot.cityId !== input.cityId
      )
        this.conflict('The selected slot is no longer available.');
      if (!address || address.serviceAreaId !== input.serviceAreaId)
        this.notFound('Saved address is unavailable for this service area.');
      const offering = await tx.professionalService.findUnique({
        where: {
          professionalId_serviceId_cityId: {
            professionalId: slot.professionalId,
            serviceId: input.serviceId,
            cityId: input.cityId,
          },
        },
        include: {
          professional: true,
          service: { include: { category: true } },
        },
      });
      if (
        !offering ||
        offering.state !== 'ENABLED' ||
        !offering.professional.isServiceActive ||
        offering.professional.verificationStatus !== 'APPROVED'
      )
        this.conflict('No eligible Professional is available for this slot.');
      if (
        input.assignmentMode === 'SELECTED_PROFESSIONAL' &&
        input.selectedProfessionalId !== slot.professionalId
      )
        this.conflict('The selected Professional does not own this slot.');
      const area = await tx.professionalServiceArea.findUnique({
        where: {
          professionalId_serviceAreaId: {
            professionalId: slot.professionalId,
            serviceAreaId: input.serviceAreaId,
          },
        },
      });
      if (!area)
        this.conflict('The Professional does not serve this address area.');
      const candidate: AssignmentCandidate = {
        id: slot.professionalId,
        verified: offering.professional.verificationStatus === 'APPROVED',
        active: offering.professional.isServiceActive,
        serviceEnabled: offering.state === 'ENABLED',
        slotAvailable: slot.status === AvailabilityStatus.AVAILABLE,
        serviceAreaMatch: true,
        cityMatch: offering.cityId === input.cityId,
        distanceKm: null,
        score: Number(offering.professional.internalScore ?? 0),
        rating: Number(offering.professional.averageRating ?? 0),
        acceptanceRateBasisPoints: 0,
        pricePaise: offering.pricePaise,
        maximumPricePaise: offering.pricePaise,
      };
      if (
        input.assignmentMode === 'BEST_AVAILABLE' &&
        rankAssignmentCandidates([candidate])[0]?.id !== slot.professionalId
      )
        this.conflict('No eligible Professional matched automatic assignment.');
      const conflicting = await tx.booking.findFirst({
        where: { slotId: slot.id, status: { in: ACTIVE_BOOKING_STATUSES } },
      });
      if (conflicting) this.conflict('The selected slot is already reserved.');
      const rule = await tx.commissionRule.findFirst({
        where: {
          active: true,
          effectiveFrom: { lte: new Date() },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
          AND: [
            { OR: [{ cityId: input.cityId }, { cityId: null }] },
            {
              OR: [
                { categoryId: offering.service.categoryId },
                { categoryId: null },
              ],
            },
          ],
        },
        orderBy: [
          { promotionalOverride: 'desc' },
          { priority: 'desc' },
          { effectiveFrom: 'desc' },
        ],
      });
      if (!rule) this.conflict('No effective commission rule is configured.');
      const price = offering.pricePaise;
      const commission = this.domain.commission(price, {
        rateBasisPoints: rule.rateBasisPoints,
        fixedFeePaise: Number(rule.fixedFeePaise),
      });
      const booking = await tx.booking.create({
        data: {
          customerUserId: actor.userId,
          cityId: input.cityId,
          serviceAreaId: input.serviceAreaId,
          serviceId: input.serviceId,
          addressId: input.addressId,
          slotId: slot.id,
          selectedProfessionalId: input.selectedProfessionalId,
          assignedProfessionalId: slot.professionalId,
          assignmentMode: input.assignmentMode,
          servicePricePaise: BigInt(price),
          totalPaise: BigInt(price),
          advancePaise: BigInt(price),
          remainingPaise: 0n,
          serviceNameSnapshot: offering.service.name,
          addressSnapshot: {
            maskedAddress: address.maskedAddress,
            serviceAreaId: address.serviceAreaId,
          },
          scheduledStart: slot.startsAt,
          scheduledEnd: slot.endsAt,
          quoteExpiresAt: new Date(Date.now() + 15 * 60_000),
          idempotencyKey,
          history: {
            create: {
              toStatus: BookingStatus.DRAFT,
              actorUserId: actor.userId,
              actorRole: actor.activeRole,
              reasonCode: 'BOOKING_CREATED',
            },
          },
          commission: {
            create: {
              ruleId: rule.id,
              ruleVersion: rule.version,
              calculationSnapshot: {
                rateBasisPoints: rule.rateBasisPoints,
                fixedFeePaise: Number(rule.fixedFeePaise),
                categoryId: offering.service.categoryId,
                cityId: input.cityId,
              },
              grossPaise: BigInt(commission.grossPaise),
              commissionPaise: BigInt(commission.commissionPaise),
              netPaise: BigInt(commission.netPaise),
            },
          },
        },
      });
      return this.bookingView(booking);
    });
  }

  async listBookings(
    actor: AuthenticatedActor,
    query: BookingListQuery,
    admin = false,
  ) {
    const professionalId =
      !admin && actor.activeRole === 'PROFESSIONAL'
        ? await this.professionalId(actor.userId)
        : null;
    return this.prisma.booking
      .findMany({
        where: {
          ...(admin
            ? {}
            : professionalId
              ? { assignedProfessionalId: professionalId }
              : { customerUserId: actor.userId }),
          ...(query.status ? { status: query.status } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      })
      .then((rows) => rows.map((row) => this.bookingView(row)));
  }
  async getBooking(actor: AuthenticatedActor, id: string, admin = false) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        history: { orderBy: { createdAt: 'asc' } },
        assignments: true,
        payments: { include: { attempts: true } },
        refunds: true,
        commission: true,
      },
    });
    const professionalId =
      actor.activeRole === 'PROFESSIONAL'
        ? await this.professionalId(actor.userId)
        : null;
    if (
      !booking ||
      (!admin &&
        booking.customerUserId !== actor.userId &&
        booking.assignedProfessionalId !== professionalId)
    )
      this.notFound('Booking not found.');
    return this.safeView(booking);
  }

  async createPaymentOrder(
    actor: AuthenticatedActor,
    bookingId: string,
    idempotencyKey: string,
  ) {
    const prepared = await runSerializable(this.prisma, async (tx) => {
      const booking = await this.ownedCustomerBooking(tx, actor, bookingId);
      if (
        booking.status !== BookingStatus.DRAFT &&
        booking.status !== BookingStatus.PAYMENT_PENDING
      )
        this.conflict('Payment is not allowed in this booking state.');
      const existing = await tx.payment.findUnique({
        where: { idempotencyKey },
      });
      if (existing?.providerOrderId) return { payment: existing, booking };
      if (booking.status === BookingStatus.DRAFT)
        await this.transition(
          tx,
          booking,
          BookingStatus.PAYMENT_PENDING,
          actor,
          'PAYMENT_ORDER_REQUESTED',
        );
      const payment =
        existing ??
        (await tx.payment.create({
          data: {
            bookingId,
            provider: 'razorpay-mock',
            amountPaise: booking.advancePaise,
            idempotencyKey,
            status: PaymentStatus.CREATED,
            attempts: { create: { status: PaymentAttemptStatus.CREATED } },
          },
        }));
      return { payment, booking };
    });
    if (prepared.payment.providerOrderId)
      return this.safeView(prepared.payment);
    const order = await this.payment.createOrder({
      amountPaise: Number(prepared.payment.amountPaise),
      receipt: bookingId,
      idempotencyKey,
    });
    const payment = await this.prisma.payment.update({
      where: { id: prepared.payment.id },
      data: { providerOrderId: order.orderId, status: PaymentStatus.PENDING },
    });
    return { ...this.safeView(payment), order };
  }

  async confirmPayment(
    actor: AuthenticatedActor,
    bookingId: string,
    input: PaymentConfirm,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = await this.ownedCustomerBooking(tx, actor, bookingId);
      const payment = await tx.payment.findFirst({
        where: { bookingId, providerOrderId: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      if (!payment?.providerOrderId) this.notFound('Payment order not found.');
      if (payment.status === PaymentStatus.CAPTURED)
        return this.safeView(payment);
      if (
        !this.payment.verifySignature({
          orderId: payment.providerOrderId,
          paymentId: input.paymentId,
          signature: input.signature,
        })
      ) {
        await tx.paymentAttempt.create({
          data: {
            paymentId: payment.id,
            status: PaymentAttemptStatus.FAILED,
            failureCode: 'INVALID_SIGNATURE',
          },
        });
        this.conflict('Payment signature verification failed.');
      }
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: input.paymentId,
          status: PaymentStatus.CAPTURED,
          capturedAt: new Date(),
          attempts: {
            create: {
              status: PaymentAttemptStatus.SUCCEEDED,
              providerReference: input.paymentId,
            },
          },
        },
      });
      if (booking.status === BookingStatus.PAYMENT_PENDING) {
        await this.transition(
          tx,
          booking,
          BookingStatus.REQUESTED,
          actor,
          'PAYMENT_CAPTURED',
        );
        await tx.bookingAssignment.upsert({
          where: {
            bookingId_professionalId: {
              bookingId,
              professionalId: booking.assignedProfessionalId!,
            },
          },
          create: {
            bookingId,
            professionalId: booking.assignedProfessionalId!,
            rank: 1,
            scoreSnapshot: { assignmentMode: booking.assignmentMode },
            status: AssignmentStatus.OFFERED,
            expiresAt: new Date(Date.now() + 10 * 60_000),
          },
          update: {},
        });
      }
      return this.safeView(updated);
    });
  }

  async webhook(input: WebhookInput) {
    if (
      !this.payment.verifySignature({
        orderId: input.orderId,
        paymentId: input.paymentId,
        signature: input.signature,
      })
    )
      this.conflict('Webhook signature verification failed.');
    return runSerializable(this.prisma, async (tx) => {
      const existing = await tx.paymentWebhookEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: 'razorpay',
            providerEventId: input.eventId,
          },
        },
      });
      if (existing) return { duplicate: true };
      await tx.paymentWebhookEvent.create({
        data: {
          provider: 'razorpay',
          providerEventId: input.eventId,
          eventType: input.eventType,
          payloadHash: input.payloadHash,
          processedAt: new Date(),
        },
      });
      if (input.eventType === 'payment.captured') {
        const payment = await tx.payment.findUnique({
          where: { providerOrderId: input.orderId },
        });
        if (!payment) this.notFound('Webhook payment order not found.');
        if (payment.status !== PaymentStatus.CAPTURED) {
          const booking = await tx.booking.findUnique({
            where: { id: payment.bookingId },
          });
          if (!booking) this.notFound('Webhook booking not found.');
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              providerPaymentId: input.paymentId,
              status: PaymentStatus.CAPTURED,
              capturedAt: new Date(),
              attempts: {
                create: {
                  status: PaymentAttemptStatus.SUCCEEDED,
                  providerReference: input.paymentId,
                },
              },
            },
          });
          if (booking.status === BookingStatus.PAYMENT_PENDING) {
            await this.transition(
              tx,
              booking,
              BookingStatus.REQUESTED,
              null,
              'PAYMENT_WEBHOOK_CAPTURED',
            );
            if (booking.assignedProfessionalId) {
              await tx.bookingAssignment.upsert({
                where: {
                  bookingId_professionalId: {
                    bookingId: booking.id,
                    professionalId: booking.assignedProfessionalId,
                  },
                },
                create: {
                  bookingId: booking.id,
                  professionalId: booking.assignedProfessionalId,
                  rank: 1,
                  scoreSnapshot: { assignmentMode: booking.assignmentMode },
                  status: AssignmentStatus.OFFERED,
                  expiresAt: new Date(Date.now() + 10 * 60_000),
                },
                update: {},
              });
            }
          }
        }
      }
      return { duplicate: false };
    });
  }

  async professionalDecision(
    actor: AuthenticatedActor,
    bookingId: string,
    accept: boolean,
    input: BookingDecision,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = await this.professionalBooking(tx, actor, bookingId);
      if (booking.status !== BookingStatus.REQUESTED)
        this.conflict('Booking request is no longer actionable.');
      const assignment = await tx.bookingAssignment.findUnique({
        where: {
          bookingId_professionalId: {
            bookingId,
            professionalId: booking.assignedProfessionalId!,
          },
        },
      });
      if (
        !assignment ||
        assignment.status !== AssignmentStatus.OFFERED ||
        assignment.expiresAt <= new Date()
      )
        this.conflict('Booking request expired.');
      if (!accept) {
        await tx.bookingAssignment.update({
          where: { id: assignment.id },
          data: {
            status: AssignmentStatus.DECLINED,
            respondedAt: new Date(),
            declineReasonCode: input.reasonCode ?? 'PROFESSIONAL_DECLINED',
          },
        });
        const next =
          booking.assignmentMode === 'BEST_AVAILABLE'
            ? BookingStatus.REJECTED
            : BookingStatus.REFUND_PENDING;
        return this.bookingView(
          await this.transition(
            tx,
            booking,
            next,
            actor,
            input.reasonCode ?? 'PROFESSIONAL_DECLINED',
          ),
        );
      }
      const overlap = await tx.booking.findFirst({
        where: {
          id: { not: booking.id },
          assignedProfessionalId: booking.assignedProfessionalId,
          status: { in: ACTIVE_BOOKING_STATUSES },
          scheduledStart: { lt: booking.scheduledEnd },
          scheduledEnd: { gt: booking.scheduledStart },
        },
      });
      if (overlap)
        this.conflict('Professional already has an overlapping booking.');
      await tx.bookingAssignment.update({
        where: { id: assignment.id },
        data: { status: AssignmentStatus.ACCEPTED, respondedAt: new Date() },
      });
      await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { status: AvailabilityStatus.BOOKED, version: { increment: 1 } },
      });
      const accepted = await this.transition(
        tx,
        booking,
        BookingStatus.ACCEPTED,
        actor,
        'PROFESSIONAL_ACCEPTED',
      );
      return this.bookingView(
        await this.transition(
          tx,
          accepted,
          BookingStatus.CONFIRMED,
          actor,
          'BOOKING_CONFIRMED',
        ),
      );
    });
  }

  async action(
    actor: AuthenticatedActor,
    bookingId: string,
    to: BookingStatus,
    input: BookingAction,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = await this.professionalBooking(tx, actor, bookingId);
      if (booking.version !== input.expectedVersion)
        this.conflict('Booking changed; refresh and retry.');
      return this.bookingView(
        await this.transition(tx, booking, to, actor, `PROFESSIONAL_${to}`),
      );
    });
  }

  async issueServiceOtp(
    actor: AuthenticatedActor,
    bookingId: string,
    purpose: ServiceOtpPurpose,
  ) {
    const professionalId = await this.professionalId(actor.userId);
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, assignedProfessionalId: professionalId },
    });
    if (!booking) this.notFound('Booking not found.');
    const expected =
      purpose === ServiceOtpPurpose.START
        ? BookingStatus.ARRIVED
        : BookingStatus.IN_PROGRESS;
    if (booking.status !== expected)
      this.conflict('OTP cannot be requested in this booking state.');
    const issued = this.domain.issueOtp(this.otpSecret(bookingId, purpose));
    const challenge = await runSerializable(this.prisma, async (tx) => {
      await tx.serviceOtpChallenge.updateMany({
        where: { bookingId, purpose, status: ServiceOtpStatus.ACTIVE },
        data: { status: ServiceOtpStatus.REVOKED },
      });
      const created = await tx.serviceOtpChallenge.create({
        data: {
          bookingId,
          purpose,
          codeHash: issued.codeHash,
          expiresAt: issued.expiresAt,
          maxAttempts: issued.maxAttempts,
        },
      });
      await this.transition(
        tx,
        booking,
        purpose === ServiceOtpPurpose.START
          ? BookingStatus.START_OTP_PENDING
          : BookingStatus.COMPLETION_OTP_PENDING,
        actor,
        `${purpose}_OTP_ISSUED`,
      );
      return created;
    });
    return {
      id: challenge.id,
      expiresAt: challenge.expiresAt,
      delivery: 'customer-secure-channel',
    };
  }

  async verifyServiceOtp(
    actor: AuthenticatedActor,
    bookingId: string,
    purpose: ServiceOtpPurpose,
    input: OtpVerify,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = await this.professionalBooking(tx, actor, bookingId);
      const challenge = await tx.serviceOtpChallenge.findFirst({
        where: { id: input.challengeId, bookingId, purpose },
      });
      if (!challenge) this.notFound('OTP challenge not found.');
      let valid = false;
      try {
        valid = this.domain.verifyOtp(
          this.otpSecret(bookingId, purpose),
          input.code,
          challenge.codeHash,
          {
            expiresAt: challenge.expiresAt,
            attempts: challenge.attempts,
            consumedAt: challenge.consumedAt,
          },
        );
      } catch {
        this.conflict('OTP is expired, used, or locked.');
      }
      if (!valid) {
        const attempts = challenge.attempts + 1;
        await tx.serviceOtpChallenge.update({
          where: { id: challenge.id },
          data: {
            attempts,
            status:
              attempts >= challenge.maxAttempts
                ? ServiceOtpStatus.LOCKED
                : ServiceOtpStatus.ACTIVE,
          },
        });
        this.conflict('OTP is invalid.');
      }
      await tx.serviceOtpChallenge.update({
        where: { id: challenge.id },
        data: { status: ServiceOtpStatus.CONSUMED, consumedAt: new Date() },
      });
      const to =
        purpose === ServiceOtpPurpose.START
          ? BookingStatus.IN_PROGRESS
          : BookingStatus.COMPLETED;
      const completed = await this.transition(
        tx,
        booking,
        to,
        actor,
        `${purpose}_OTP_VERIFIED`,
      );
      if (purpose === ServiceOtpPurpose.COMPLETION)
        await this.creditWallet(tx, completed);
      return this.bookingView(completed);
    });
  }

  async cancel(
    actor: AuthenticatedActor,
    bookingId: string,
    input: BookingCancel,
    admin = false,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = admin
        ? await tx.booking.findUnique({ where: { id: bookingId } })
        : await this.ownedCustomerBooking(tx, actor, bookingId);
      if (!booking) this.notFound('Booking not found.');
      if (booking.version !== input.expectedVersion)
        this.conflict('Booking changed; refresh and retry.');
      const payment = await tx.payment.findFirst({
        where: { bookingId, status: PaymentStatus.CAPTURED },
      });
      const cancelled = await this.transition(
        tx,
        booking,
        BookingStatus.CANCELLED,
        actor,
        input.reasonCode,
        input.reason,
      );
      if (!payment) return this.bookingView(cancelled);
      const policy = this.domain.refund(
        Number(payment.amountPaise),
        booking.scheduledStart,
        new Date(),
      );
      if (policy.refundPaise > 0) {
        await tx.refund.create({
          data: {
            bookingId,
            paymentId: payment.id,
            amountPaise: BigInt(policy.refundPaise),
            policyVersion: 'CANCELLATION_V1',
            refundBasisPoints: policy.refundBasisPoints,
            reasonCode: input.reasonCode,
            status: RefundStatus.REQUESTED,
            idempotencyKey: `cancel:${booking.id}:${booking.version}`,
          },
        });
        return this.bookingView(
          await this.transition(
            tx,
            cancelled,
            BookingStatus.REFUND_PENDING,
            actor,
            'REFUND_REQUESTED',
          ),
        );
      }
      return this.bookingView(cancelled);
    });
  }

  async wallet(actor: AuthenticatedActor) {
    const professionalId = await this.professionalId(actor.userId);
    const account = await this.prisma.walletAccount.findUnique({
      where: { professionalId },
      include: { entries: { orderBy: { createdAt: 'desc' } } },
    });
    const entries = account?.entries ?? [];
    const now = new Date();
    const pending = entries.filter(
      (e) =>
        e.state === WalletEntryState.PENDING &&
        (!e.availableAt || e.availableAt > now),
    );
    const available = entries.filter(
      (e) =>
        e.state === WalletEntryState.AVAILABLE ||
        (e.state === WalletEntryState.PENDING &&
          e.availableAt &&
          e.availableAt <= now),
    );
    const sum = (items: typeof entries) =>
      items.reduce(
        (total, entry) =>
          total +
          (entry.direction === WalletEntryDirection.CREDIT
            ? Number(entry.amountPaise)
            : -Number(entry.amountPaise)),
        0,
      );
    return {
      pendingPaise: sum(pending),
      availablePaise: sum(available),
      entries: entries.map((entry) => this.safeView(entry)),
    };
  }

  async professionalWithdrawals(actor: AuthenticatedActor) {
    const professionalId = await this.professionalId(actor.userId);
    return this.prisma.withdrawal
      .findMany({
        where: { wallet: { professionalId } },
        orderBy: { requestedAt: 'desc' },
      })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }

  async payoutAccounts(actor: AuthenticatedActor) {
    const professionalId = await this.professionalId(actor.userId);
    return this.prisma.payoutAccount
      .findMany({ where: { professionalId }, orderBy: { createdAt: 'desc' } })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }

  async createPayoutAccount(
    actor: AuthenticatedActor,
    input: PayoutAccountCreate,
  ) {
    const professionalId = await this.professionalId(actor.userId);
    return this.prisma.payoutAccount
      .create({
        data: {
          professionalId,
          provider: input.provider,
          encryptedDetails: createHmac(
            'sha256',
            process.env.PAYMENT_MOCK_SECRET ??
              'development-payment-secret-change-me',
          )
            .update(input.accountReference)
            .digest('hex'),
          detailsKeyVersion: 'mock-v1',
          maskedLabel: input.maskedLabel,
          beneficiaryReference: `beneficiary_${createHash('sha256').update(input.accountReference).digest('hex').slice(0, 16)}`,
          status: 'VERIFIED',
        },
      })
      .then((row) => this.safeView(row));
  }

  async withdraw(actor: AuthenticatedActor, input: WithdrawalCreate) {
    const professionalId = await this.professionalId(actor.userId);
    return runSerializable(this.prisma, async (tx) => {
      const existing = await tx.withdrawal.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.safeView(existing);
      const account = await tx.walletAccount.findUnique({
        where: { professionalId },
        include: { entries: true },
      });
      const payout = await tx.payoutAccount.findFirst({
        where: {
          id: input.payoutAccountId,
          professionalId,
          status: 'VERIFIED',
        },
      });
      if (!account || !payout)
        this.notFound('Verified payout account or wallet not found.');
      const now = new Date();
      const available = account.entries
        .filter(
          (e) =>
            e.state === WalletEntryState.AVAILABLE ||
            (e.state === WalletEntryState.PENDING &&
              e.availableAt &&
              e.availableAt <= now),
        )
        .reduce(
          (total, e) =>
            total +
            (e.direction === WalletEntryDirection.CREDIT
              ? Number(e.amountPaise)
              : -Number(e.amountPaise)),
          0,
        );
      try {
        assertWithdrawalAllowed(input.amountPaise, available);
      } catch (error) {
        this.conflict(
          error instanceof Error ? error.message : 'Withdrawal unavailable.',
        );
      }
      const withdrawal = await tx.withdrawal.create({
        data: {
          walletId: account.id,
          payoutAccountId: payout.id,
          amountPaise: BigInt(input.amountPaise),
          destinationSnapshot: {
            maskedLabel: payout.maskedLabel,
            provider: payout.provider,
          },
          idempotencyKey: input.idempotencyKey,
        },
      });
      await tx.walletLedgerEntry.create({
        data: {
          walletId: account.id,
          withdrawalId: withdrawal.id,
          entryType: 'WITHDRAWAL_RESERVATION',
          direction: WalletEntryDirection.DEBIT,
          state: WalletEntryState.RESERVED,
          amountPaise: BigInt(input.amountPaise),
          idempotencyKey: `reserve:${withdrawal.id}`,
        },
      });
      return this.safeView(withdrawal);
    });
  }

  async review(
    actor: AuthenticatedActor,
    bookingId: string,
    input: ReviewRequest,
  ) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = await this.ownedCustomerBooking(tx, actor, bookingId);
      if (
        booking.status !== BookingStatus.COMPLETED ||
        !booking.assignedProfessionalId
      )
        this.conflict('Only completed verified bookings can be reviewed.');
      const review = await tx.review.create({
        data: {
          bookingId,
          customerUserId: actor.userId,
          professionalId: booking.assignedProfessionalId,
          rating: input.rating,
          comment: input.comment,
        },
      });
      return this.safeView(review);
    });
  }

  async reminder(
    actor: AuthenticatedActor,
    bookingId: string,
    input: ReminderRequest,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerUserId: actor.userId,
        status: BookingStatus.COMPLETED,
      },
    });
    if (!booking?.assignedProfessionalId)
      this.conflict('Reminder requires a completed booking.');
    const days =
      input.schedule === 'DAYS_15'
        ? 15
        : input.schedule === 'DAYS_30'
          ? 30
          : input.schedule === 'DAYS_45'
            ? 45
            : null;
    const remindAt =
      input.schedule === 'CUSTOM'
        ? new Date(input.remindAt)
        : new Date(Date.now() + (days ?? 15) * 86_400_000);
    return this.prisma.rebookingReminder
      .create({
        data: {
          bookingId,
          customerUserId: actor.userId,
          professionalId: booking.assignedProfessionalId,
          remindAt,
        },
      })
      .then((row) => this.safeView(row));
  }

  paymentAttempts() {
    return this.prisma.paymentAttempt
      .findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }
  refunds() {
    return this.prisma.refund
      .findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }
  walletEntries() {
    return this.prisma.walletLedgerEntry
      .findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }
  withdrawals() {
    return this.prisma.withdrawal
      .findMany({ orderBy: { requestedAt: 'desc' }, take: 100 })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }
  commissionRules() {
    return this.prisma.commissionRule
      .findMany({ orderBy: [{ priority: 'desc' }, { effectiveFrom: 'desc' }] })
      .then((rows) => rows.map((row) => this.safeView(row)));
  }
  createCommissionRule(input: CommissionRuleCreate) {
    return this.prisma.commissionRule
      .create({
        data: {
          ...input,
          fixedFeePaise: BigInt(input.fixedFeePaise),
          effectiveFrom: new Date(input.effectiveFrom),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        },
      })
      .then((row) => this.safeView(row));
  }

  async decideWithdrawal(id: string, input: AdminDecision) {
    return runSerializable(this.prisma, async (tx) => {
      const current = await tx.withdrawal.findUnique({
        where: { id },
        include: { payoutAccount: true },
      });
      if (!current || current.status !== input.expectedStatus)
        this.conflict('Withdrawal changed; refresh and retry.');
      if (input.action === 'REJECT')
        return this.safeView(
          await tx.withdrawal.update({
            where: { id },
            data: {
              status: WithdrawalStatus.REJECTED,
              internalNote: input.internalNote,
              decidedAt: new Date(),
            },
          }),
        );
      const provider = await this.payout.createPayout({
        withdrawalId: id,
        amountPaise: Number(current.amountPaise),
        beneficiaryReference: current.payoutAccount.beneficiaryReference!,
        idempotencyKey: current.idempotencyKey,
      });
      return this.safeView(
        await tx.withdrawal.update({
          where: { id },
          data: {
            status: WithdrawalStatus.PROCESSING,
            providerPayoutId: provider.providerPayoutId,
            internalNote: input.internalNote,
            decidedAt: new Date(),
          },
        }),
      );
    });
  }

  async decideRefund(id: string, input: AdminDecision) {
    return runSerializable(this.prisma, async (tx) => {
      const refund = await tx.refund.findUnique({ where: { id } });
      if (!refund || refund.status !== input.expectedStatus)
        this.conflict('Refund changed; refresh and retry.');
      const status =
        input.action === 'REJECT'
          ? RefundStatus.CANCELLED
          : RefundStatus.PROCESSING;
      return this.safeView(
        await tx.refund.update({ where: { id }, data: { status } }),
      );
    });
  }

  async override(actor: AuthenticatedActor, id: string, input: AdminOverride) {
    return runSerializable(this.prisma, async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) this.notFound('Booking not found.');
      if (booking.version !== input.expectedVersion)
        this.conflict('Booking changed; refresh and retry.');
      return this.bookingView(
        await this.transition(
          tx,
          booking,
          input.toStatus,
          actor,
          input.reasonCode,
          input.reason,
        ),
      );
    });
  }

  private async transition(
    tx: Prisma.TransactionClient,
    booking: { id: string; status: BookingStatus; version: number },
    to: BookingStatus,
    actor: AuthenticatedActor | null,
    reasonCode: string,
    reason?: string,
  ) {
    this.domain.transition(booking.status, to);
    const updated = await tx.booking.update({
      where: { id: booking.id, version: booking.version },
      data: {
        status: to,
        version: { increment: 1 },
        ...(to === BookingStatus.COMPLETED ? { completedAt: new Date() } : {}),
        ...(to === BookingStatus.CANCELLED
          ? { cancelledAt: new Date(), cancellationReasonCode: reasonCode }
          : {}),
      },
    });
    await tx.bookingStatusHistory.create({
      data: {
        bookingId: booking.id,
        fromStatus: booking.status,
        toStatus: to,
        actorUserId: actor?.userId,
        actorRole: actor?.activeRole,
        reasonCode,
        reason,
      },
    });
    return updated;
  }
  private async creditWallet(
    tx: Prisma.TransactionClient,
    booking: {
      id: string;
      assignedProfessionalId: string | null;
      completedAt: Date | null;
    },
  ) {
    if (!booking.assignedProfessionalId || !booking.completedAt)
      throw new Error(
        'Completed booking lacks Professional or completion time',
      );
    const commission = await tx.bookingCommission.findUnique({
      where: { bookingId: booking.id },
    });
    if (!commission) throw new Error('Commission snapshot missing');
    const wallet = await tx.walletAccount.upsert({
      where: { professionalId: booking.assignedProfessionalId },
      create: { professionalId: booking.assignedProfessionalId },
      update: {},
    });
    await tx.bookingCommission.update({
      where: { id: commission.id },
      data: { recognizedAt: booking.completedAt },
    });
    await tx.walletLedgerEntry.create({
      data: {
        walletId: wallet.id,
        bookingId: booking.id,
        entryType: 'BOOKING_EARNING',
        direction: WalletEntryDirection.CREDIT,
        state: WalletEntryState.PENDING,
        amountPaise: commission.netPaise,
        availableAt: this.domain.clearance(booking.completedAt),
        idempotencyKey: `earning:${booking.id}`,
      },
    });
  }
  private ownedCustomerBooking(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedActor,
    id: string,
  ) {
    return tx.booking
      .findFirst({ where: { id, customerUserId: actor.userId } })
      .then((row) => {
        if (!row) this.notFound('Booking not found.');
        return row;
      });
  }
  private async professionalBooking(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedActor,
    id: string,
  ) {
    const profile = await tx.professionalProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true },
    });
    if (!profile) this.notFound('Professional profile not found.');
    const row = await tx.booking.findFirst({
      where: { id, assignedProfessionalId: profile.id },
    });
    if (!row) this.notFound('Booking not found.');
    return row;
  }
  private async professionalId(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) this.notFound('Professional profile not found.');
    return profile.id;
  }
  private otpSecret(bookingId: string, purpose: ServiceOtpPurpose) {
    return createHash('sha256')
      .update(
        `${process.env.OTP_HMAC_SECRET ?? 'development-only'}:${bookingId}:${purpose}`,
      )
      .digest('hex');
  }
  private bookingView<
    T extends {
      servicePricePaise: bigint;
      platformFeePaise: bigint;
      discountPaise: bigint;
      rewardPaise: bigint;
      taxPaise: bigint;
      totalPaise: bigint;
      advancePaise: bigint;
      remainingPaise: bigint;
    },
  >(booking: T) {
    return {
      ...booking,
      servicePricePaise: Number(booking.servicePricePaise),
      platformFeePaise: Number(booking.platformFeePaise),
      discountPaise: Number(booking.discountPaise),
      rewardPaise: Number(booking.rewardPaise),
      taxPaise: Number(booking.taxPaise),
      totalPaise: Number(booking.totalPaise),
      advancePaise: Number(booking.advancePaise),
      remainingPaise: Number(booking.remainingPaise),
    };
  }
  private safeView<T>(value: T): T {
    return JSON.parse(
      JSON.stringify(value, (_key, field: unknown) =>
        typeof field === 'bigint' ? Number(field) : field,
      ),
    ) as T;
  }
  private conflict(message: string): never {
    throw new AppException('CONFLICT', HttpStatus.CONFLICT, message);
  }
  private notFound(message: string): never {
    throw new AppException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND, message);
  }
}
