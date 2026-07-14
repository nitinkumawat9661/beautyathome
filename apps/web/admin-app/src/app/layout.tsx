import type { Metadata } from 'next';

import { AuthProvider } from '@/components/auth-provider';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'BeautyAtHome Operations',
    template: '%s | BeautyAtHome Operations',
  },
  description: 'Restricted marketplace operations workspace.',
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
