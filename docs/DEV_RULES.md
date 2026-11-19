# Dev rules and code structure

Short rules for anyone working on this repo, people and AI agents alike. Scope is the frontend only for now. Backend and infra rules come later.

## 1. Workflow

1. **Start from an issue.** Work is tracked as GitHub issues titled `[FE-n] …`. Issues are tracking only and may be thin.
   Fill the gaps from `docs/design-handoff.md` (board IDs), the design canvas and existing code. If a decision really changes the outcome, ask first.
2. **Read before you edit.** Before changing code, read the files you will touch, the nearby code, `README.md`, this file and `docs/DEV_LOG.md`.
   Reuse existing components, helpers and patterns. Do not create duplicates.
3. **Branch before any edit.** Never edit on `main`.
4. **Check before handing over.** Run `pnpm format`, `pnpm lint`, `pnpm typecheck` and `pnpm test:run`. Run `pnpm build` for route or config changes, and `pnpm build && pnpm e2e` for UI changes.
5. **Hand over and do not commit.** The owner reviews, commits and opens the PR by hand.
   AI agents leave changes uncommitted and suggest commit message(s), with which files go in each.
6. **Log it.** Add a row to `docs/DEV_LOG.md` when the issue is done.

## 2. Git flow

Branch from an up-to-date `main`:

| Prefix      | Use                            | Example                       |
| ----------- | ------------------------------ | ----------------------------- |
| `feat/`     | New feature or page            | `feat/9-guides-mortgage`      |
| `fix/`      | Bug fix                        | `fix/search-pagination-reset` |
| `chore/`    | Tooling, deps, CI, config      | `chore/upgrade-next`          |
| `docs/`     | Docs only                      | `docs/dev-log-and-rules`      |
| `refactor/` | Change with no behavior change | `refactor/query-keys`         |

- Branch name: `<prefix>/<issue-no>-<short-slug>` when there is an issue.
- Commits use Conventional Commits with the issue number: `feat(search): add map view (#3)`.
- One commit per issue when a branch covers several issues.
- PRs go to `main`. CI (format, lint, typecheck, test, build) must pass.

## 3. Frontend stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI (shadcn style), Lucide icons, TanStack Query, MSW mock API, Zod, Vitest + Testing Library, pnpm.

> Next.js 16 differs from older versions. Check `node_modules/next/dist/docs/` before using a Next API you are unsure of (see `AGENTS.md`).

## 4. Code structure

```
src/
  app/                 Routes only. Pages stay thin and render a view component.
    (site)/            Public pages with header and footer. @modal holds intercepted modals such as (.)login.
    (auth)/            Login, register, recovery, onboarding
    (post)/            Post-listing wizard
  components/
    ui/                Shared primitives: button, dialog, field, select, tabs, empty-state, query-state…
    <feature>/         Feature components: search, property, project, post, auth, favorites, account, home, layout…
  lib/                 Pure logic and hooks: formatting, URL params, validation, compare… (unit tested)
    api/               client.ts (fetch) → endpoints.ts (typed calls) → queries.ts (TanStack Query hooks and keys)
  mocks/               MSW handlers and mock stores (localStorage-backed where needed)
  data/                Static mock datasets used by the mocks
  providers/           React providers and small client stores (query, session, favorites)
  types/               api.ts is the API contract shared with the backend (DTOs, pagination, errors)
  test/                Test helpers: renderWithClient, next/navigation mock
```

## 5. Conventions

**Files and naming**

- Files use kebab-case (`property-card.tsx`). Components use PascalCase with named exports.
- Tests sit next to the code as `*.test.ts(x)`.
- Import with the `@/` alias.

**Components**

- Server components by default. Add `"use client"` only where state, effects or browser APIs are needed.
- Check `components/ui` first. Add a new primitive there only when two or more features need it.
- Variants use `cva`. Merge classes with `cn()` from `@/lib/utils`.
- Every data view handles loading (skeleton), error (retry) and empty states. See `ui/query-state.tsx` and `ui/empty-state.tsx`.

**Styling**

- Tailwind only, no CSS modules or inline styles.
- Use the design tokens in `src/app/globals.css` (`brand`, `ink`, `slate`, `mist`, `line`…), not raw hex values.
- Build mobile first. Text must meet WCAG AA contrast.
- Prettier sorts Tailwind classes (print width 120, double quotes, trailing commas).

**Data**

- Components never call `fetch` directly. Use `lib/api/queries.ts` hooks.
- A new endpoint needs a type in `types/api.ts`, then `endpoints.ts`, then `queries.ts`, then an MSW handler in `mocks/handlers.ts`.
- Filters and search state live in the URL query string (see `lib/search-params.ts`).
- Forms use Zod schemas with `lib/use-zod-form.ts` and `lib/validation.ts`.

**Copy**

- UI text is Thai. Code, comments and docs are English.

**Tests**

- Unit test pure logic in `lib/`. Add component tests for key interactions.
- Use `renderWithClient` from `src/test/render.tsx`. MSW node handlers run automatically, and `failingHandler` tests error states.
- Browser tests live in `e2e/` (Playwright + axe). Add a page to `e2e/a11y.spec.ts` when you add a route; select by role and label, as users do.

## 6. Backend and infra

Not decided yet. Phase 1 uses the MSW mock API. Setting `NEXT_PUBLIC_API_URL` switches to the real API later.
