import type { Metadata } from 'next';

import { CustomerCatalogue } from '@/components/marketplace/customer-catalogue';

export const metadata: Metadata = { title: 'Services' };

export default function ServicesPage() {
  return <CustomerCatalogue />;
}
