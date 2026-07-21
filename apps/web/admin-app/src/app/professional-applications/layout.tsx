import { AdminGate } from '@/components/admin-gate';
import { AdminShell } from '@/components/admin-shell';

export default function ProfessionalApplicationsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AdminGate>
      <AdminShell>{children}</AdminShell>
    </AdminGate>
  );
}
