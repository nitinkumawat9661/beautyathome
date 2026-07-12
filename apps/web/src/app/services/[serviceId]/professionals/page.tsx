import type { Metadata } from 'next';

import { ProfessionalResults } from '@/components/marketplace/professional-results';

export const metadata: Metadata = { title: 'Professionals' };

export default function ProfessionalsForServicePage() {
  return <ProfessionalResults />;
}
