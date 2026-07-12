import {
  AvailabilitySource,
  AvailabilityStatus,
  DateOverrideKind,
  LaunchEligibilityStatus,
  ProfessionalServiceState,
  Prisma,
  UserStatus,
  VerificationStatus,
} from '@beautyathome/database';
import {
  AvailabilitySlotSchema,
  type AvailabilityRangeQuery,
  type DateAvailabilityOverridesReplace,
  type WeeklyAvailabilityReplace,
  isPriceWithinPolicy,
  minutesFromLocalTime,
} from '@beautyathome/marketplace';
import { HttpStatus, Injectable } from '@nestjs/common';

import { runSerializable } from '../common/database/serializable';
import { AppException } from '../common/errors/app.exception';
import { CursorService } from '../common/pagination/cursor.service';
import {
  localDateBoundsUtc,
  utcToLocalScheduleParts,
} from '../common/time/zoned-time';
import type { AuthenticatedActor } from '../common/types/authenticated-request';
import { PrismaService } from '../database/prisma/prisma.service';
import type { AvailabilitySlotCreate } from './availability.validation';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cursors: CursorService,
  ) {}

  async getOwn(actor: AuthenticatedActor, query: AvailabilityRangeQuery) {
    const profile = await this.profile(actor.userId);
    const slotPage = await this.listSlots(profile.id, profile.cityId, query);
    const schedule = await this.prisma.availabilitySchedule.findFirst({
      where: { professionalId: profile.id, isActive: true },
      include: {
        weeklyRules: {
          orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
        },
        overrides: {
          where: {
            localDate: {
              gte: new Date(query.fromDate + 'T00:00:00.000Z'),
              lte: new Date(query.toDate + 'T00:00:00.000Z'),
            },
          },
          include: { intervals: { orderBy: { startMinute: 'asc' } } },
          orderBy: { localDate: 'asc' },
        },
      },
    });
    if (!schedule) {
      return {
        schedule: null,
        slots: slotPage.data,
        pageInfo: slotPage.pageInfo,
      };
    }
    return {
      schedule: {
        id: schedule.id,
        cityId: schedule.cityId,
        timeZone: schedule.timeZone,
        version: schedule.version,
        rules: schedule.weeklyRules.map((rule) => ({
          id: rule.id,
          weekday: rule.weekday,
          startLocalTime: this.localTime(rule.startMinute),
          endLocalTime: this.localTime(rule.endMinute),
        })),
        overrides: schedule.overrides.map((override) => ({
          id: override.id,
          date: override.localDate.toISOString().slice(0, 10),
          kind: override.kind,
          reason: override.reason,
          intervals: override.intervals.map((interval) => ({
            startLocalTime: this.localTime(interval.startMinute),
            endLocalTime: this.localTime(interval.endMinute),
          })),
          version: override.version,
        })),
      },
      slots: slotPage.data,
      pageInfo: slotPage.pageInfo,
    };
  }

  async replaceWeekly(
    actor: AuthenticatedActor,
    input: WeeklyAvailabilityReplace,
  ) {
    const profile = await this.profile(actor.userId);
    const city = await this.profileCity(profile.cityId);
    if (input.timeZone !== city.timeZone) this.invalidTimezone();

    try {
      await runSerializable(this.prisma, async (transaction) => {
        const existing = await transaction.availabilitySchedule.findFirst({
          where: {
            professionalId: profile.id,
            cityId: city.id,
            isActive: true,
          },
        });
        if (
          existing &&
          (input.expectedVersion === undefined ||
            input.expectedVersion !== existing.version)
        ) {
          this.optimisticConflict();
        }
        const schedule = existing
          ? await transaction.availabilitySchedule.update({
              where: { id: existing.id },
              data: { version: { increment: 1 } },
            })
          : await transaction.availabilitySchedule.create({
              data: {
                professionalId: profile.id,
                cityId: city.id,
                timeZone: city.timeZone,
              },
            });
        await transaction.availabilityWeeklyRule.deleteMany({
          where: { scheduleId: schedule.id },
        });
        if (input.rules.length > 0) {
          await transaction.availabilityWeeklyRule.createMany({
            data: input.rules.map((rule) => ({
              scheduleId: schedule.id,
              weekday: rule.weekday,
              startMinute: minutesFromLocalTime(rule.startLocalTime),
              endMinute: minutesFromLocalTime(rule.endLocalTime),
            })),
          });
        }
      });
    } catch (error: unknown) {
      this.translateOverlap(error);
    }

    return this.getOwn(actor, this.defaultRange(city.timeZone));
  }

  async replaceOverrides(
    actor: AuthenticatedActor,
    input: DateAvailabilityOverridesReplace,
  ) {
    const profile = await this.profile(actor.userId);
    const city = await this.profileCity(profile.cityId);
    if (input.timeZone !== city.timeZone) this.invalidTimezone();

    try {
      await runSerializable(this.prisma, async (transaction) => {
        const existing = await transaction.availabilitySchedule.findFirst({
          where: {
            professionalId: profile.id,
            cityId: city.id,
            isActive: true,
          },
        });
        if (
          existing &&
          (input.expectedVersion === undefined ||
            input.expectedVersion !== existing.version)
        ) {
          this.optimisticConflict();
        }
        const schedule = existing
          ? await transaction.availabilitySchedule.update({
              where: { id: existing.id },
              data: { version: { increment: 1 } },
            })
          : await transaction.availabilitySchedule.create({
              data: {
                professionalId: profile.id,
                cityId: city.id,
                timeZone: city.timeZone,
              },
            });
        await transaction.availabilityDateOverride.deleteMany({
          where: { scheduleId: schedule.id },
        });
        for (const override of input.overrides) {
          await transaction.availabilityDateOverride.create({
            data: {
              scheduleId: schedule.id,
              localDate: new Date(override.date + 'T00:00:00.000Z'),
              kind:
                override.kind === 'UNAVAILABLE'
                  ? DateOverrideKind.UNAVAILABLE
                  : DateOverrideKind.AVAILABLE,
              reason:
                override.kind === 'UNAVAILABLE'
                  ? (override.reason ?? null)
                  : null,
              intervals:
                override.kind === 'AVAILABLE'
                  ? {
                      create: override.intervals.map((interval) => ({
                        startMinute: minutesFromLocalTime(
                          interval.startLocalTime,
                        ),
                        endMinute: minutesFromLocalTime(interval.endLocalTime),
                      })),
                    }
                  : undefined,
            },
          });
          if (override.kind === 'UNAVAILABLE') {
            const bounds = localDateBoundsUtc(override.date, city.timeZone);
            await transaction.availabilitySlot.updateMany({
              where: {
                professionalId: profile.id,
                cityId: city.id,
                status: AvailabilityStatus.AVAILABLE,
                startsAt: { gte: bounds.startsAt, lt: bounds.endsAt },
              },
              data: {
                status: AvailabilityStatus.BLOCKED,
                version: { increment: 1 },
              },
            });
          }
        }
      });
    } catch (error: unknown) {
      this.translateOverlap(error);
    }

    return this.getOwn(actor, this.defaultRange(city.timeZone));
  }

  async createSlot(actor: AuthenticatedActor, input: AvailabilitySlotCreate) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const now = new Date();
    if (
      startsAt <= now ||
      endsAt <= startsAt ||
      startsAt > new Date(now.getTime() + 92 * 86_400_000) ||
      endsAt.getTime() - startsAt.getTime() > 24 * 60 * 60 * 1_000
    ) {
      this.invalidInterval(
        'Slots must be future intervals within the 92-day publication horizon.',
      );
    }

    try {
      return await runSerializable(this.prisma, async (transaction) => {
        const profile = await transaction.professionalProfile.findUnique({
          where: { userId: actor.userId },
          include: { user: true },
        });
        if (!profile) this.notFound();
        this.assertApproved(profile);
        if (!profile.cityId) {
          throw new AppException(
            'CATALOG_CITY_UNAVAILABLE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'Complete the Sikar service-area profile before setting availability.',
          );
        }
        const city = await transaction.city.findFirst({
          where: { id: profile.cityId, status: 'ACTIVE' },
        });
        if (!city) {
          throw new AppException(
            'CATALOG_CITY_UNAVAILABLE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'Complete the Sikar service-area profile before setting availability.',
          );
        }
        if (input.displayTimeZone !== city.timeZone) this.invalidTimezone();
        const offering = await transaction.professionalService.findFirst({
          where: {
            professionalId: profile.id,
            serviceId: input.serviceId,
            cityId: city.id,
            state: ProfessionalServiceState.ENABLED,
            service: {
              status: 'ACTIVE',
              category: { status: 'ACTIVE' },
              cityAvailability: {
                some: { cityId: city.id, status: 'ACTIVE' },
              },
            },
            pricePolicy: {
              status: 'ACTIVE',
              effectiveFrom: { lte: now },
              OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
            },
          },
          include: { pricePolicy: true },
        });
        if (!offering || !offering.pricePolicy) {
          throw new AppException(
            'PROFESSIONAL_NOT_ELIGIBLE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'Enable a service with a current city price policy before publishing availability.',
          );
        }
        if (!isPriceWithinPolicy(offering.pricePaise, offering.pricePolicy)) {
          throw new AppException(
            'CATALOG_PRICE_OUT_OF_RANGE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'Update the service price to the current platform range before publishing availability.',
          );
        }
        if (
          endsAt.getTime() - startsAt.getTime() <
          offering.estimatedDurationMinutes * 60_000
        ) {
          throw new AppException(
            'CATALOG_DURATION_OUT_OF_RANGE',
            HttpStatus.UNPROCESSABLE_ENTITY,
            'The slot must be long enough for the Professional service duration.',
          );
        }

        await this.assertWithinSchedule(
          transaction,
          profile.id,
          city.id,
          city.timeZone,
          startsAt,
          endsAt,
        );
        const overlap = await transaction.availabilitySlot.findFirst({
          where: {
            professionalId: profile.id,
            status: {
              in: [
                AvailabilityStatus.AVAILABLE,
                AvailabilityStatus.HELD,
                AvailabilityStatus.BOOKED,
              ],
            },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        });
        if (overlap) this.overlap();

        const slot = await transaction.availabilitySlot.create({
          data: {
            professionalId: profile.id,
            cityId: city.id,
            serviceId: input.serviceId,
            startsAt,
            endsAt,
            displayTimeZone: city.timeZone,
            status: AvailabilityStatus.AVAILABLE,
            source: AvailabilitySource.AD_HOC,
          },
        });
        return this.presentSlot(slot);
      });
    } catch (error: unknown) {
      this.translateOverlap(error);
    }
  }

  async deleteSlot(actor: AuthenticatedActor, slotId: string) {
    return runSerializable(this.prisma, async (transaction) => {
      const profile = await transaction.professionalProfile.findUnique({
        where: { userId: actor.userId },
      });
      if (!profile) this.notFound();
      const slot = await transaction.availabilitySlot.findFirst({
        where: { id: slotId, professionalId: profile.id },
      });
      if (!slot) this.notFound();
      const deleted = await transaction.availabilitySlot.deleteMany({
        where: {
          id: slotId,
          professionalId: profile.id,
          status: AvailabilityStatus.AVAILABLE,
          startsAt: { gt: new Date() },
          version: slot.version,
        },
      });
      if (deleted.count !== 1) {
        throw new AppException(
          'AVAILABILITY_SLOT_RESERVED',
          HttpStatus.CONFLICT,
          'Only an unreserved future availability slot can be removed.',
        );
      }
      return { deleted: true, id: slotId };
    });
  }

  async listPublic(professionalId: string, query: AvailabilityRangeQuery) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: {
        id: professionalId,
        user: { status: UserStatus.ACTIVE },
        verificationStatus: VerificationStatus.APPROVED,
        launchEligibilityStatus: LaunchEligibilityStatus.ELIGIBLE,
        isServiceActive: true,
      },
    });
    if (!profile) this.notFound();
    return this.listSlots(profile.id, profile.cityId, query);
  }

  private async listSlots(
    professionalId: string,
    cityId: string | null,
    query: AvailabilityRangeQuery,
  ) {
    const city = await this.profileCity(cityId);
    const startsAt = localDateBoundsUtc(query.fromDate, city.timeZone).startsAt;
    const endsAt = localDateBoundsUtc(query.toDate, city.timeZone).endsAt;
    const limit = query.limit ?? 100;
    const fingerprint = this.cursors.fingerprint({
      ...query,
      after: undefined,
      professionalId,
      cityId: city.id,
      resource: 'availability-slots',
    });
    const cursor = this.cursors.decode(query.after, fingerprint);
    const slots = await this.prisma.availabilitySlot.findMany({
      where: {
        professionalId,
        cityId: city.id,
        serviceId: query.serviceId,
        status: AvailabilityStatus.AVAILABLE,
        startsAt: { gte: startsAt, lt: endsAt },
      },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
      take: limit + 1,
    });
    const hasNextPage = slots.length > limit;
    const page = slots.slice(0, limit);
    const last = page.at(-1);
    return {
      data: page.map((slot) => this.presentSlot(slot)),
      pageInfo: {
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? this.cursors.encode({
                id: last.id,
                sortValue: last.startsAt.toISOString(),
                fingerprint,
              })
            : null,
      },
    };
  }

  private async assertWithinSchedule(
    transaction: Prisma.TransactionClient,
    professionalId: string,
    cityId: string,
    timeZone: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const localStart = utcToLocalScheduleParts(startsAt, timeZone);
    const localEnd = utcToLocalScheduleParts(endsAt, timeZone);
    if (
      localStart.date !== localEnd.date ||
      localEnd.minuteOfDay <= localStart.minuteOfDay
    ) {
      this.invalidInterval(
        'A bookable slot must start and end on the same local calendar date.',
      );
    }
    const schedule = await transaction.availabilitySchedule.findFirst({
      where: { professionalId, cityId, isActive: true },
      include: {
        weeklyRules: true,
        overrides: {
          where: {
            localDate: new Date(localStart.date + 'T00:00:00.000Z'),
          },
          include: { intervals: true },
          take: 1,
        },
      },
    });
    if (!schedule) return;

    const override = schedule.overrides[0];
    if (override?.kind === DateOverrideKind.UNAVAILABLE) {
      this.outsideSchedule();
    }
    const intervals =
      override?.kind === DateOverrideKind.AVAILABLE
        ? override.intervals
        : schedule.weeklyRules.filter(
            (rule) => rule.weekday === localStart.weekday,
          );
    const allowed = intervals.some(
      (interval) =>
        interval.startMinute <= localStart.minuteOfDay &&
        interval.endMinute >= localEnd.minuteOfDay,
    );
    if (!allowed) this.outsideSchedule();
  }

  private presentSlot(slot: {
    id: string;
    professionalId: string;
    serviceId: string;
    startsAt: Date;
    endsAt: Date;
    displayTimeZone: string;
    status: string;
    version: number;
  }) {
    return AvailabilitySlotSchema.parse({
      id: slot.id,
      professionalId: slot.professionalId,
      serviceId: slot.serviceId,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      displayTimeZone: slot.displayTimeZone,
      status: slot.status,
      version: slot.version,
    });
  }

  private async profile(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!profile) this.notFound();
    return profile;
  }

  private async profileCity(cityId: string | null) {
    const city = cityId
      ? await this.prisma.city.findFirst({
          where: { id: cityId, status: 'ACTIVE' },
        })
      : null;
    if (!city) {
      throw new AppException(
        'CATALOG_CITY_UNAVAILABLE',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Complete the Sikar service-area profile before setting availability.',
      );
    }
    return city;
  }

  private assertApproved(
    profile: Awaited<ReturnType<AvailabilityService['profile']>>,
  ): void {
    if (
      profile.user.status !== UserStatus.ACTIVE ||
      profile.verificationStatus !== VerificationStatus.APPROVED ||
      profile.launchEligibilityStatus !== LaunchEligibilityStatus.ELIGIBLE ||
      !profile.isServiceActive
    ) {
      throw new AppException(
        'PROFESSIONAL_NOT_APPROVED',
        HttpStatus.UNPROCESSABLE_ENTITY,
        'Approval is required before publishing availability slots.',
      );
    }
  }

  private defaultRange(timeZone: string): AvailabilityRangeQuery {
    const fromDate = utcToLocalScheduleParts(new Date(), timeZone).date;
    const toDate = new Date(
      Date.parse(fromDate + 'T00:00:00.000Z') + 31 * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);
    return { fromDate, toDate };
  }

  private localTime(minutes: number): string {
    return (
      String(Math.floor(minutes / 60)).padStart(2, '0') +
      ':' +
      String(minutes % 60).padStart(2, '0')
    );
  }

  private translateOverlap(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'P2004' || error.code === 'P2002')
    ) {
      this.overlap();
    }
    throw error;
  }

  private invalidTimezone(): never {
    throw new AppException(
      'AVAILABILITY_INVALID_INTERVAL',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Availability must use the server-owned city timezone.',
    );
  }

  private invalidInterval(message: string): never {
    throw new AppException(
      'AVAILABILITY_INVALID_INTERVAL',
      HttpStatus.UNPROCESSABLE_ENTITY,
      message,
    );
  }

  private outsideSchedule(): never {
    throw new AppException(
      'AVAILABILITY_OUTSIDE_SCHEDULE',
      HttpStatus.UNPROCESSABLE_ENTITY,
      'The slot must fit the weekly schedule or the date-specific override.',
    );
  }

  private optimisticConflict(): never {
    throw new AppException(
      'OPTIMISTIC_LOCK_CONFLICT',
      HttpStatus.CONFLICT,
      'The availability schedule changed. Reload it and retry.',
    );
  }

  private overlap(): never {
    throw new AppException(
      'AVAILABILITY_OVERLAP',
      HttpStatus.CONFLICT,
      'Availability intervals cannot overlap.',
    );
  }

  private notFound(): never {
    throw new AppException(
      'RESOURCE_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      'Availability resource not found.',
    );
  }
}
