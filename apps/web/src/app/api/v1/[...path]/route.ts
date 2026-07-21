import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const configuredApiUrl = process.env.UPSTREAM_API_URL?.trim();
const protectionBypassSecret = process.env.UPSTREAM_VERCEL_PROTECTION_BYPASS_SECRET?.trim();
const upstreamRequestOrigin = process.env.UPSTREAM_API_REQUEST_ORIGIN?.trim();
const requestTimeoutMs = 15_000;

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function upstreamApiBaseUrl(): string {
  const value = configuredApiUrl || 'http://localhost:4000';
  const parsed = new URL(value);

  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
    throw new Error('The upstream API must use HTTPS.');
  }

  return parsed
    .toString()
    .replace(/\/+$/, '')
    .replace(/\/api\/v1$/, '');
}

function forwardedRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  for (const name of [
    'accept',
    'authorization',
    'content-type',
    'cookie',
    'user-agent',
    'x-device-fingerprint',
    'x-device-name',
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set('origin', upstreamRequestOrigin || request.nextUrl.origin);

  if (protectionBypassSecret) {
    headers.set('x-vercel-protection-bypass', protectionBypassSecret);
  }

  return headers;
}

function forwardedResponseHeaders(response: Response): Headers {
  const headers = new Headers();

  for (const name of ['cache-control', 'content-type', 'www-authenticate', 'x-request-id']) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  const responseHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  const setCookies =
    responseHeaders.getSetCookie?.() ??
    (response.headers.get('set-cookie') ? [response.headers.get('set-cookie') as string] : []);

  for (const cookie of setCookies) {
    headers.append('set-cookie', cookie);
  }

  return headers;
}

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  try {
    const { path } = await context.params;
    const encodedPath = path.map((segment) => encodeURIComponent(segment)).join('/');

    const upstreamUrl = new URL(`${upstreamApiBaseUrl()}/api/v1/${encodedPath}`);
    upstreamUrl.search = request.nextUrl.search;

    const method = request.method.toUpperCase();
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

    const response = await fetch(upstreamUrl, {
      method,
      headers: forwardedRequestHeaders(request),
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(requestTimeoutMs),
    });

    return new Response(response.body, {
      status: response.status,
      headers: forwardedResponseHeaders(response),
    });
  } catch {
    return Response.json(
      {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The application API is unavailable.',
          requestId: 'unavailable',
        },
      },
      {
        status: 503,
        headers: {
          'cache-control': 'no-store',
        },
      },
    );
  }
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  proxy as OPTIONS,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
