import type { Metadata } from 'next';

import { ProfessionalApplicationDetail } from '@/components/professional-application-detail';

export const metadata: Metadata = {
  title: 'Application review',
};

export default async function ProfessionalApplicationPage({
  params,
}: Readonly<{ params: Promise<{ applicationId: string }> }>) {
  const { applicationId } = await params;
  return <ProfessionalApplicationDetail applicationId={applicationId} />;
}
