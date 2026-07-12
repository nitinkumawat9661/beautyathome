import {
  AdminProfessionalProfileSchema,
  AdminVerificationApplicationSchema,
  ModeratedMediaAssetSchema,
  ProfessionalCertificateSchema,
  ProfessionalOwnProfileSchema,
  ProfessionalVerificationApplicationSchema,
  PublicProfessionalProfileSchema,
} from '@beautyathome/marketplace';
import type { Prisma } from '@beautyathome/database';

export const professionalProfileInclude = {
  user: true,
  city: true,
  serviceAreas: { include: { serviceArea: true } },
  portfolioAssets: { orderBy: { displayOrder: 'asc' as const } },
  certificates: { orderBy: { issuedOn: 'desc' as const } },
  verificationApps: {
    orderBy: { version: 'desc' as const },
    take: 1,
    include: { _count: { select: { notes: true } } },
  },
} satisfies Prisma.ProfessionalProfileInclude;

export type HydratedProfessional = Prisma.ProfessionalProfileGetPayload<{
  include: typeof professionalProfileInclude;
}>;

function metrics(profile: HydratedProfessional) {
  return {
    averageRating:
      profile.averageRating === null ? null : Number(profile.averageRating),
    ratingCount: profile.ratingCount,
    completedJobs: profile.completedJobs,
  };
}

function moderatedAsset(asset: {
  id: string;
  uploadId: string;
  moderationStatus: string;
  userSafeRejectionReason: string | null;
}) {
  return ModeratedMediaAssetSchema.parse({
    id: asset.id,
    uploadId: asset.uploadId,
    moderationStatus: asset.moderationStatus,
    publicAsset: null,
    userSafeRejectionReason: asset.userSafeRejectionReason,
  });
}

function certificate(
  certificate: HydratedProfessional['certificates'][number],
) {
  return ProfessionalCertificateSchema.parse({
    id: certificate.id,
    title: certificate.title,
    issuer: certificate.issuer,
    issuedOn: certificate.issuedOn.toISOString().slice(0, 10),
    expiresOn: certificate.expiresOn?.toISOString().slice(0, 10) ?? null,
    moderationStatus: certificate.moderationStatus,
    userSafeRejectionReason: certificate.userSafeRejectionReason,
  });
}

export function presentOwnProfessional(profile: HydratedProfessional) {
  const latest = profile.verificationApps[0];
  const profileImage =
    profile.profileImageUploadId && profile.profileImageModerationStatus
      ? moderatedAsset({
          id: profile.id,
          uploadId: profile.profileImageUploadId,
          moderationStatus: profile.profileImageModerationStatus,
          userSafeRejectionReason: null,
        })
      : null;

  return ProfessionalOwnProfileSchema.parse({
    id: profile.id,
    displayName: profile.displayName,
    profileImage,
    biography: profile.biography,
    experienceYears: profile.experienceYears,
    languageCodes: profile.languages,
    serviceAreas: profile.serviceAreas.map(({ serviceArea }) => ({
      id: serviceArea.id,
      cityId: serviceArea.cityId,
      name: serviceArea.name,
      slug: serviceArea.slug,
    })),
    verificationStatus: profile.verificationStatus,
    launchEligibility: {
      policyCode: 'PHASE_1_VERIFIED_FEMALE_PROFESSIONAL',
      policyVersion: profile.eligibilityPolicyVersion,
      status: profile.launchEligibilityStatus,
      reviewedAt: profile.eligibilityReviewedAt?.toISOString() ?? null,
    },
    accountStatus: profile.user.status,
    isServiceActive: profile.isServiceActive,
    portfolio: profile.portfolioAssets.map(moderatedAsset),
    certificates: profile.certificates.map(certificate),
    metrics: metrics(profile),
    userSafeVerificationReason: latest?.userSafeDecisionReason ?? null,
    version: profile.version,
    updatedAt: profile.updatedAt.toISOString(),
  });
}

export function presentAdminProfessional(profile: HydratedProfessional) {
  const own = presentOwnProfessional(profile);
  return AdminProfessionalProfileSchema.parse({
    ...own,
    internalProfessionalScore:
      profile.internalScore !== null &&
      profile.internalScoreVersion &&
      profile.internalScoreUpdatedAt
        ? {
            value: Number(profile.internalScore),
            version: profile.internalScoreVersion,
            updatedAt: profile.internalScoreUpdatedAt.toISOString(),
            restricted: true,
          }
        : null,
    internalVerificationNotesCount:
      profile.verificationApps[0]?._count.notes ?? 0,
  });
}

export function presentPublicProfessional(profile: HydratedProfessional) {
  if (
    !profile.displayName ||
    profile.experienceYears === null ||
    profile.verificationStatus !== 'APPROVED'
  ) {
    return null;
  }
  return PublicProfessionalProfileSchema.parse({
    id: profile.id,
    displayName: profile.displayName,
    profileImage: null,
    biography: profile.biography,
    experienceYears: profile.experienceYears,
    languageCodes: profile.languages,
    serviceAreas: profile.serviceAreas.map(({ serviceArea }) => ({
      id: serviceArea.id,
      cityId: serviceArea.cityId,
      name: serviceArea.name,
      slug: serviceArea.slug,
    })),
    verificationStatus: 'APPROVED',
    portfolio: [],
    certificates: profile.certificates
      .filter((item) => item.moderationStatus === 'APPROVED')
      .map((item) => {
        const value = certificate(item);
        return {
          id: value.id,
          title: value.title,
          issuer: value.issuer,
          issuedOn: value.issuedOn,
          expiresOn: value.expiresOn,
        };
      }),
    metrics: metrics(profile),
  });
}

export function presentOwnApplication(application: {
  id: string;
  version: number;
  status: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  userSafeDecisionReason: string | null;
  correctionAllowed: boolean;
}) {
  return ProfessionalVerificationApplicationSchema.parse({
    id: application.id,
    version: application.version,
    status: application.status,
    submittedAt: application.submittedAt?.toISOString() ?? null,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    userSafeDecisionReason: application.userSafeDecisionReason,
    correctionAllowed: application.correctionAllowed,
  });
}

export function presentAdminApplication(application: {
  id: string;
  professionalId: string;
  version: number;
  status: string;
  eligibilityPolicyVersionAcknowledged: string;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  userSafeDecisionReason: string | null;
  correctionAllowed: boolean;
  internalNote: string | null;
  reviewedByUserId: string | null;
}) {
  return AdminVerificationApplicationSchema.parse({
    ...presentOwnApplication(application),
    professionalId: application.professionalId,
    eligibilityPolicyVersionAcknowledged:
      application.eligibilityPolicyVersionAcknowledged,
    internalNote: application.internalNote,
    reviewerAdminId: application.reviewedByUserId,
  });
}
