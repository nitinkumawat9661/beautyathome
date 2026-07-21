import type { Metadata } from 'next';

import { ProfessionalApplicationsList } from '@/components/professional-applications-list';

export const metadata: Metadata = {
  title: 'Professional applications',
};

export default function ProfessionalApplicationsPage() {
  return <ProfessionalApplicationsList />;
}
