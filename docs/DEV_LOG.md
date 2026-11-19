# Dev log

One row per finished issue, newest first. Keep it short. Details go in the issue, the PR or `git log`.

**How to add a row:** when an issue is done (code ready for review), add a row at the top of the table.
Status is `done` (ready, waiting for commit or PR), `merged` (in `main`) or `partial` (see the note).

| Date done  | Issue | Ticket | Summary                                                                 | Branch / PR                            | Status | Note                                           |
| ---------- | ----- | ------ | ----------------------------------------------------------------------- | -------------------------------------- | ------ | ---------------------------------------------- |
| 2026-11-19 | #10   | FE-9   | Polish: SEO, loading/error, a11y audit, Lighthouse, hero animation, E2E | `feat/10-polish` / PR #32 + this PR    | done   | `/auth/me` returns 200 `null` when signed out  |
| 2026-11-19 | #9    | FE-8   | Guides `/guides`, `/guides/[slug]`, calculator `/tools/mortgage`        | `feat/9-guides-mortgage` / PR #31      | merged | Mock `GET /articles`; calculator inputs in URL |
| 2026-11-19 | —     | —      | Merge mortgage calculator on property page                              | `feat/4-property-detail` / PR #30      | merged |                                                |
| 2026-11-19 | —     | —      | Fix CI: Prettier format of `docs/design-handoff.md`                     | `fix/ci-format-check` / PR #29         | merged | CI was red on main since PR #27                |
| 2026-11-19 | —     | —      | Dev log, dev rules, CLAUDE.md                                           | `docs/dev-log-and-rules` / PR #28      | merged |                                                |
| 2026-11-18 | #8    | FE-7   | Post listing wizard `/post`: 5 steps, preview, drafts                   | `feat/fe4-fe8` / PR #27                | merged | Issue #8 still open on GitHub, close it        |
| 2026-11-18 | #7    | FE-6   | Auth UI: login, register, recovery, onboarding, modal                   | `feat/fe4-fe8` / PR #27                | merged |                                                |
| 2026-11-18 | #6    | FE-5   | Favorites `/account/favorites` + `/compare`                             | `feat/fe4-fe8` / PR #27                | merged |                                                |
| 2026-11-18 | #5    | FE-4   | Projects `/projects`, `/projects/[slug]`                                | `feat/fe4-fe8` / PR #27                | merged |                                                |
| 2026-11-16 | —     | —      | Design handoff doc `docs/design-handoff.md`                             | `main`                                 | merged | Board IDs (A1, B14…) used in issues            |
| 2026-11-16 | #3    | FE-2   | Search `/search`: URL filters, sort, pagination, map                    | `feat/3-search-page`                   | merged |                                                |
| 2026-11-13 | #4    | FE-3   | Property detail `/property/[slug]`                                      | `feat/property-detail-tweaks` / PR #13 | merged | Mortgage calculator merged later in PR #30     |
| 2026-11-11 | #2    | FE-1   | Mock API: MSW + TanStack Query                                          | `feat/2-mock-api-…` / PR #12           | merged |                                                |
| 2026-11-10 | #1    | FE-0   | Foundation: layout, CI, Prettier, Vitest                                | `feat/1-project-foundation` / PR #11   | merged |                                                |

## Up next

Open issues, in planned order: FE-10 (#14, design tokens & shared UI), FE-11 (#15) … FE-22 (#26).
Run `gh issue list` for the current list.
