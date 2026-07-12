'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RoleGate } from '@/components/role-gate';
import { getBooking } from '@/lib/api/commerce-client';
export function AdminBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    void getBooking(bookingId, 'admin').then((value) =>
      setData(value as unknown as Record<string, unknown>),
    );
  }, [bookingId]);
  return (
    <RoleGate allowedRoles={['ADMIN']} signInPath="/admin/sign-in">
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10">
        <h1 className="text-3xl font-semibold">Booking audit timeline</h1>
        <pre className="mt-6 overflow-auto rounded-xl border p-5 text-xs">
          {data ? JSON.stringify(data, null, 2) : 'Loading timeline…'}
        </pre>
      </main>
    </RoleGate>
  );
}
