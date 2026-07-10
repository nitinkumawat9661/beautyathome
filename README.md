# BeautyAtHome

BeautyAtHome is a female-only beauty service marketplace for India. This repository is a pnpm and Turborepo monorepo containing the Next.js web application, NestJS API, shared packages, and PostgreSQL/Prisma infrastructure.

## Requirements

- Node.js 24
- pnpm 11.10.0
- PostgreSQL 18, or Docker for the local database stack

## Local setup

1. Copy `.env.example` to `.env` and adjust local credentials if required.
2. Run `pnpm install`.
3. Run `pnpm db:generate`.
4. Run `pnpm dev`.

The web app uses port `3000`, the API uses port `4000`, and PostgreSQL uses port `5432` by default.

## Quality gates

- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

Project requirements and architecture documentation remain under `docs/`.
