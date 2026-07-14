# Admin portal preview deployment

The operations interface is a separate Next.js application located at `apps/web/admin-app`.
It must be deployed as a separate Vercel project and must not share the customer website domain.

## Vercel project settings

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build:admin`
- Output Directory: `admin-app/.next`
- Node.js version: use the repository `.nvmrc`

## Required Preview environment

- `NEXT_PUBLIC_API_URL`: the protected BeautyAtHome API Preview URL

The API must allow the admin Preview origin for credentialed refresh-cookie requests before login
and review actions are tested.

## Verification checklist

1. Deploy only to the Preview environment.
2. Confirm `/sign-in` sends an admin-only `SIGN_IN` OTP request.
3. Confirm customer, professional, support, and finance sessions cannot enter the application.
4. Confirm application list, detail, start-review, approve, and reject requests use the admin API.
5. Confirm approval provisions the professional role and profile.
6. Confirm all responses use `Cache-Control: no-store` and pages are excluded from indexing.
7. Confirm the public customer deployment has no `/admin` routes.

Do not assign a production domain or merge the feature branch until both admin and customer Preview
checks pass.
