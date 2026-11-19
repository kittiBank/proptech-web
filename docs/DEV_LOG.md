# Dev log

One row per finished issue, newest first. Keep it short. Details go in the issue, the PR or `git log`.

**How to add a row:** when an issue is done (code ready for review), add a row at the top of the table.
Status is `done` (ready, waiting for commit or PR), `merged` (in `main`) or `partial` (see the note).

| Date done  | Issue | Ticket | Summary                                               | Branch / PR                            | Status | Note                                                   |
| ---------- | ----- | ------ | ----------------------------------------------------- | -------------------------------------- | ------ | ------------------------------------------------------ |
| 2026-11-18 | #8    | FE-7   | Post listing wizard `/post`: 5 steps, preview, drafts | `feat/fe4-fe8` / PR #27                | merged | Issue #8 still open on GitHub, close it                |
| 2026-11-18 | #7    | FE-6   | Auth UI: login, register, recovery, onboarding, modal | `feat/fe4-fe8` / PR #27                | merged |                                                        |
| 2026-11-18 | #6    | FE-5   | Favorites `/account/favorites` + `/compare`           | `feat/fe4-fe8` / PR #27                | merged |                                                        |
| 2026-11-18 | #5    | FE-4   | Projects `/projects`, `/projects/[slug]`              | `feat/fe4-fe8` / PR #27                | merged |                                                        |
| 2026-11-16 | —     | —      | Design handoff doc `docs/design-handoff.md`           | `main`                                 | merged | Board IDs (A1, B14…) used in issues                    |
| 2026-11-16 | #3    | FE-2   | Search `/search`: URL filters, sort, pagination, map  | `feat/3-search-page`                   | merged |                                                        |
| 2026-11-13 | #4    | FE-3   | Property detail `/property/[slug]`                    | `feat/property-detail-tweaks` / PR #13 | merged | Mortgage lib is on local `feat/4-property-detail` only |
| 2026-11-11 | #2    | FE-1   | Mock API: MSW + TanStack Query                        | `feat/2-mock-api-…` / PR #12           | merged |                                                        |
| 2026-11-10 | #1    | FE-0   | Foundation: layout, CI, Prettier, Vitest              | `feat/1-project-foundation` / PR #11   | merged |                                                        |

## Up next

Open issues, in planned order: FE-8 (#9, guides + mortgage calculator), FE-9 (#10), FE-10 (#14) … FE-22 (#26).
Run `gh issue list` for the current list.
