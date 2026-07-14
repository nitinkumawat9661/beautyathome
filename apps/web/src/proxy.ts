import { NextResponse, type NextRequest } from 'next/server';

const configuredAdminHosts = new Set(
  (process.env.ADMIN_PORTAL_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean),
);

function requestHost(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  return (forwardedHost ?? request.headers.get('host') ?? '')
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function isLocalDevelopmentHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
}

export function proxy(request: NextRequest) {
  const host = requestHost(request);

  if (!isLocalDevelopmentHost(host) && !configuredAdminHosts.has(host)) {
    return NextResponse.rewrite(new URL('/_not-found', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
