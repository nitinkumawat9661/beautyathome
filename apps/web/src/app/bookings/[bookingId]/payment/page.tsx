import { Suspense } from 'react';
import { CustomerCommerceScreen } from '@/components/commerce/customer-commerce-screen';
export default function Page() {
  return (
    <Suspense fallback={<main className="p-8">Loading payment…</main>}>
      <CustomerCommerceScreen mode="payment" />
    </Suspense>
  );
}
