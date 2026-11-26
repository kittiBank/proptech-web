# PropertyHub (proptech-web)

A property marketplace for Bangkok where people buy, sell and rent condos, houses, townhouses, land and commercial space. Every listing shows the walking distance to the nearest BTS or MRT station.

**Status:** Phase 1. The frontend calls a mock REST API (MSW) that follows the planned NestJS contract. When the backend is ready, setting `NEXT_PUBLIC_API_URL` switches over without UI changes.

## Tech stack

| Layer    | Stack                                                                                          | Status  |
| -------- | ---------------------------------------------------------------------------------------------- | ------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui + Radix UI, Lucide   | In use  |
| Data     | TanStack Query, MSW mock API                                                                   | In use  |
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
pnpm e2e             # Playwright: main path, axe WCAG 2.1 AA scans, keyboard (run `pnpm build` first)
pnpm e2e:ui          # same, in the Playwright UI
```

CI (`.github/workflows/ci.yml`) runs format check, lint, type check, tests and build on every pull request, plus a second job with the Playwright E2E and accessibility suite (`e2e/`) on desktop and mobile Chromium. Install the browser once locally with `pnpm exec playwright install chromium`.

## Project layout

- `src/app/(site)/` holds the public pages. Its `layout.tsx` adds the shared header and footer (`components/layout/site-shell.tsx`), so a new page placed here gets them automatically.
- `src/app/not-found.tsx` handles unknown URLs and uses the same shell.
- Tests sit next to the code they cover as `*.test.ts(x)`.

## Data layer and mock API

```
component → useQuery(lib/api/queries.ts) → lib/api/endpoints.ts → apiGet (lib/api/client.ts) → fetch
                                                                                     ↓
                                    NEXT_PUBLIC_API_URL set:   the NestJS API
                                    NEXT_PUBLIC_API_URL unset: /mock-api/*, answered by MSW in the browser
```

- `src/types/api.ts` is the request/response contract (DTOs, pagination envelope, NestJS error shape) shared with the backend.
- `src/mocks/` holds the MSW handlers and an in-memory dataset built from `src/data/`. Endpoints: `GET /properties` (filter, sort, paginate), `GET /projects`, `GET /stations`, `GET /categories`.
- Components fetch through TanStack Query and render their own loading skeleton, error panel with retry, and empty state.
- Tests use the same handlers through `msw/node` (`vitest.setup.ts`). Override one with `server.use(failingHandler("/properties"))`.

To use the real API, copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL`. The value is inlined at build time, and MSW is left out of builds that set it.

For planned maintenance, set `MAINTENANCE_MODE=on` (and the window in `MAINTENANCE_STARTS_AT` / `MAINTENANCE_ENDS_AT`). `src/proxy.ts` then answers every site page with a standalone maintenance page and HTTP 503 (preview it at `/maintenance`). The admin app stays up. The proxy also answers 404 for unknown listings.

The admin app (FE-20+) lives at `/admin` (sign in at `/admin/login`; mock credentials are shown on the page). In production it runs on its own subdomain: set `ADMIN_HOST` (e.g. `admin.propertyhub.example`) and `proxy.ts` serves that host from `/admin/*` and hides `/admin` on the public host. Build the admin deployment with `NEXT_PUBLIC_ADMIN_BASE_PATH=` (empty) for clean URLs.

To check loading and error states by hand, add `?mock=<scenario>` to the page URL while the mock API is active:

| Scenario | Behaviour                                         |
| -------- | ------------------------------------------------- |
| `slow`   | Every response takes 3 seconds                    |
| `error`  | Every endpoint answers 500                        |
| `flaky`  | About half the responses answer 503 (retries run) |
| `empty`  | Every list comes back empty                       |

`public/mockServiceWorker.js` is generated by MSW. After upgrading `msw`, regenerate it with `pnpm exec msw init public`.
