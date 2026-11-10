# PropertyHub (proptech-web)

A property marketplace for Bangkok where people buy, sell and rent condos, houses, townhouses, land and commercial space. Every listing shows the walking distance to the nearest BTS or MRT station.

**Status:** Phase 1. The frontend runs on mock data. The NestJS backend comes later, and the data layer (`src/lib/api`) is ready to switch over without UI changes.

## Tech stack

| Layer | Stack | Status |
| --- | --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui + Radix UI, Lucide | In use |
| Backend | NestJS, REST + OpenAPI, Prisma, JWT auth | Planned |
| Database | PostgreSQL + PostGIS, Redis | Planned |
| Storage | S3-compatible object storage + CDN for listing photos | Planned |
| DevOps | GitHub Actions, Docker, Vercel (web) | Planned |

## How to run

Requires Node.js 20.9 or later (22 recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run lint       # ESLint
npx tsc --noEmit   # type check
npm run build      # production build
npm start          # serve the production build
```

Set `NEXT_PUBLIC_API_URL` once the backend API is available.
