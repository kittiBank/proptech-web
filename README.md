# PropertyHub (proptech-web)

A property marketplace for Bangkok where people buy, sell and rent condos, houses, townhouses, land and commercial space. Every listing shows the walking distance to the nearest BTS or MRT station.

**Status:** Phase 1. The frontend runs on mock data. The NestJS backend comes later, and the data layer (`src/lib/api`) is ready to switch over without UI changes.

## Tech stack

| Layer    | Stack                                                                                          | Status  |
| -------- | ---------------------------------------------------------------------------------------------- | ------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui + Radix UI, Lucide   | In use  |
| Tooling  | pnpm, ESLint, Prettier (+ Tailwind class sorting), Vitest + Testing Library, GitHub Actions CI | In use  |
| Backend  | NestJS, REST + OpenAPI, Prisma, JWT auth                                                       | Planned |
| Database | PostgreSQL + PostGIS, Redis                                                                    | Planned |
| Storage  | S3-compatible object storage + CDN for listing photos                                          | Planned |
| DevOps   | GitHub Actions, Docker, Vercel (web)                                                           | Planned |

## How to run

Requires Node.js 22 (see `.nvmrc`) and pnpm. Run `corepack enable` once and the pinned pnpm version is used automatically.

```bash
pnpm install
pnpm dev             # http://localhost:3000
```

Other scripts:

```bash
pnpm lint            # ESLint
pnpm typecheck       # tsc --noEmit
pnpm format          # Prettier, writes changes (format:check only reports)
pnpm test            # Vitest in watch mode (test:run runs once)
pnpm build           # production build
pnpm start           # serve the production build
pnpm check:images    # confirm every mock photo URL still loads
```

CI (`.github/workflows/ci.yml`) runs format check, lint, type check, tests and build on every pull request.

## Project layout

- `src/app/(site)/` holds the public pages. Its `layout.tsx` adds the shared header and footer (`components/layout/site-shell.tsx`), so a new page placed here gets them automatically.
- `src/app/not-found.tsx` handles unknown URLs and uses the same shell.
- Tests sit next to the code they cover as `*.test.ts(x)`.

Set `NEXT_PUBLIC_API_URL` once the backend API is available.
