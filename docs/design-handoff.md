# PropertyHub: Design handoff

A short guide from the design canvas to the frontend. The design is settled enough to build from, and details will be tuned during FE work.

- **Design canvas:** https://claude.ai/artifact/Ci648yU7eMKCE4wNumaU3C (private, so ask the owner to share it)
- **Board IDs:** each frame on the canvas has an ID such as `A1`, `B14` or `C5`. Issues and PRs should reference these IDs.
- **Canvas pages:** each page is one group. Group A is buyer, B is account, C is lister, D is content and system, and E is admin.
- **Build order:** build every page as a mock FE first (MSW + TanStack Query), get the UX stable, then connect the BE.
- **Images:** they are violet placeholders on the canvas. Real images come from the API.

---

## 1. Design tokens

Tokens already live in `src/app/globals.css` under `@theme`. New tokens are marked **new** and should be added there before building the groups that need them.

### Color

| Token                      | Hex                    | Use                                                     |
| -------------------------- | ---------------------- | ------------------------------------------------------- |
| `brand`                    | `#7047EB`              | Primary buttons, active states, focus ring              |
| `brand-strong`             | `#5530D0`              | Hover state, violet text on white (passes AA)           |
| `violet-700`               | `#4424A8`              | "Best value" text, selected chip text                   |
| `brand-soft` / `violet-50` | `#F3EFFE`              | Selected background, placeholders                       |
| `violet-100`               | `#E6DEFD`              | Focus halo, badges                                      |
| `violet-200`               | `#CBBCFA`              | Soft borders, quick-reply chips, secondary chart series |
| `ink`                      | `#1A1630`              | Text, dark buttons, admin sidebar, footer               |
| `hero`                     | `#261A5C`              | Hero section, dark promo cards                          |
| `slate`                    | `#5E5872`              | Secondary text (6.4:1 on white)                         |
| `mist`                     | `#F5F3F9`              | Section background, account and seller page background  |
| `line`                     | `#E4E0EC`              | Hairlines, card borders                                 |
| `line-strong`              | `#CFC9DB`              | Input and outline-button borders                        |
| `bts-sukhumvit`            | `#437F25`              | Station badges (`N8`, `E5`, …)                          |
| `bts-silom`                | `#005A44`              | Station badges (`S2`, …)                                |
| `mrt-blue`                 | `#1F4E9C`              | Station badges (`BL22`, …)                              |
| `tag-sale` **new**         | `#E11D48`              | "ขาย" tag, unread badge                                 |
| `tag-rent` **new**         | `#0369A1`              | "เช่า" tag                                              |
| `success` **new**          | `#0B6B3A` on `#DCFCE7` | Confirmed, published, verified                          |
| `warning` **new**          | `#92400E` on `#FEF3C7` | Pending, expiring, safety callout (border `#F59E0B`)    |
| `danger` **new**           | `#BE123C` on `#FFE4E6` | Error, rejected, destructive actions (border `#FDA4AF`) |

Transit colors only identify a line. Never use them for decoration.

### Typography

- **Fonts:** `DM Sans` for Latin and numbers, `IBM Plex Sans Thai` for Thai. Both are already loaded through fontsource. Use weights 400, 500 and 600 only.
- **Body text:** 15px on the site. Admin uses 14px for denser tables.
- **Line height:** 1.5 for UI text and 1.8 to 1.85 for article body.

| Role           | Size / weight                                     |
| -------------- | ------------------------------------------------- |
| Page H1 (site) | 28–36px / 600, letter-spacing -0.015em to -0.02em |
| Section H2     | 22px / 600                                        |
| Card H2        | 17–19px / 600                                     |
| Body           | 15px / 400 (article body: 17px)                   |
| Meta / help    | 13px / 400 `slate`                                |
| Badge / label  | 11–12px / 600                                     |
| Price (card)   | 20–22px / 600                                     |

### Spacing, radius and elevation

- **Spacing:** use a 4px base. Common values are 8, 12, 16, 20, 24, 32, 48 and 64.
- **Container:** `max-width: 1280px` with 32px side padding, or 16px on mobile. Use 1180px for the post wizard and 920 to 1000px for checkout and success pages.
- **Radius:**

  | Size   | Use                          |
  | ------ | ---------------------------- |
  | 3–4px  | Tags and station badges      |
  | 6px    | Inputs and buttons           |
  | 8–10px | Cards                        |
  | 12px   | Modals and large panels      |
  | 16px   | Top corners of bottom sheets |
  | Full   | Pills and chips              |

- **Shadows:** use them only for overlays. Popovers use `0 12px 32px rgba(26,22,48,.12)` and modals use `0 24px 64px rgba(26,22,48,.30)`.
- **Scrim:** `ink` at 45–50% opacity.

### Sizing and motion

- **Touch targets:** at least 44px. The bottom nav is 64px high and sticky action bars are 48–50px.
- **Breakpoints:** mobile frames are 390px wide and desktop frames are 1440px. Pages use a fluid container in between, and sidebars collapse below 1000px.
- **Motion:** use the existing `sheet-in` (220ms) and `fade-in` (180ms) animations. Respect `prefers-reduced-motion`.

---

## 2. Layout shells

| Shell                                      | Used by                                                       | Notes                                                                                                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SiteShell` (exists)                       | Home, search, property, projects, agents, guides, help, legal | Header has buy, rent, new projects and guides links plus "ลงประกาศฟรี" and the account menu. Includes the footer.                                                                                      |
| `AccountShell` **new**                     | B7, B8, B9, B17                                               | Header with an avatar pill and a 240px left sidebar. Sidebar items: โปรไฟล์และการตั้งค่า, รายการโปรด, การค้นหาที่บันทึกไว้, นัดดูทรัพย์, ข้อความ, สำหรับผู้ลงประกาศ.                                   |
| `SellerShell` **new**                      | C8–C10, C14–C16                                               | Header with a "สำหรับผู้ลงประกาศ" badge, credit pill and "ลงประกาศใหม่" button. The 248px sidebar shows the package card plus overview, listings, leads, messages, packages, billing and verification. |
| `PostWizardShell` **new**                  | C1–C5, C7                                                     | Minimal header with draft-save status and "ออกและทำต่อทีหลัง". Has a stepper, a content column with a 320px live-preview aside, and a sticky footer with back and next.                                |
| `AdminShell` **new**                       | E1–E10                                                        | Dark `ink` sidebar with grouped navigation and an "ADMIN" tag. The top bar has global search and an environment label. Desktop only.                                                                   |
| `MobileBottomNav` (exists as `mobile-nav`) | All main mobile pages                                         | Tabs are ค้นหา, รายการโปรด, ข้อความ (unread badge) and บัญชี. **Hide it** on auth pages, multi-step forms, the chat room and while a bottom sheet is open.                                             |

---

## 3. Reusable components

Status shows whether a component **exists** in `src/components`, needs to be **extended**, or is **new**.

| Component                                                    | Boards                  | Status            | Notes                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                                                     | all                     | exists            | Variants: `primary`, `outline`, `ink`, `ghost`, `danger`, `danger-solid`, `success` (admin). Heights 36/40/44/48.                                      |
| `Input` / `TextField`                                        | B, C, D                 | new               | Label above, hint or error below, optional suffix (`ตร.ม.`, `฿`, `%`). Error state uses a `danger` border with a 3px `#FFE4E6` ring.                   |
| `Select`, `Tabs`, `Dialog`, `Sheet`, `Popover`, `Pagination` | many                    | exist             | `Sheet` is reused for the mobile bottom sheet (B18, A4).                                                                                               |
| `SegmentedControl`                                           | C1, C3, D3              | new               | Buy/rent toggle style, filled `brand` for the selected item.                                                                                           |
| `Chip` / `FilterChip`                                        | A, D11, C3              | extend            | `on` = ink fill. The checked amenity chip uses violet.                                                                                                 |
| `Toggle` (switch)                                            | B7, C3, D7              | new               | 44×26, `role="switch"`.                                                                                                                                |
| `RadioCard`                                                  | C1, C5, C14, D6         | new               | Selected = 2px brand border and `#FAF8FF` background.                                                                                                  |
| `Stepper` (horizontal)                                       | C1–C5, C16, C6          | new               | Step states are done (check, clickable), current (ring and halo) and upcoming (disabled). The mobile variant is 5 segment bars plus "ขั้นที่ X จาก 5". |
| `PropertyCard`                                               | everywhere              | exists            | Add a `compact` row variant (favorites, chat, admin) and a `preview` variant (post wizard).                                                            |
| `TransitBadge`                                               | everywhere              | exists            | Line code with line color.                                                                                                                             |
| `PriceTag` / `ModeTag`                                       | cards                   | extend            | Sale and rent tags use the new `tag-*` tokens.                                                                                                         |
| `StatusPill`                                                 | B17, C9, C10, E*        | new               | Maps domain status to tone (see §4).                                                                                                                   |
| `Avatar`                                                     | chat, account, admin    | new               | Initial plus color, with an image fallback.                                                                                                            |
| `EmptyState`                                                 | B11, D11, D14           | new               | Icon, title, body, primary CTA and optional secondary link.                                                                                            |
| `Skeleton`                                                   | lists, detail           | exists (property) | Generalize it.                                                                                                                                         |
| `Toast`                                                      | D6, saves               | new               | Bottom center, ink background, `role="status"`.                                                                                                        |
| `Callout`                                                    | chat, article, checkout | new               | Tones are `info` (violet-50), `warning` (amber, for scam warnings) and `danger`.                                                                       |
| `KpiCard`                                                    | C8, E1, E7, C15         | new               | Label, value (tabular numbers) and delta line.                                                                                                         |
| `DataTable`                                                  | C9, E2, E4, E6, E7, E10 | new               | Sticky header, row selection, bulk-action bar (ink background), pagination footer.                                                                     |
| `BarChart` / `StackedBar`                                    | C8, E1, E7, D3          | new               | Brand and violet-200 only. Must have an `aria-label` summary.                                                                                          |
| `ChatThread`                                                 | B14, B16                | new               | Bubbles (incoming on `mist`, outgoing on `brand`), day divider, read receipt, quick replies, composer.                                                 |
| `ViewingRequestCard`                                         | B14, B16, C10           | new               | Shows requested time, backup time, party size, status and the actions allowed for the viewer's role.                                                   |
| `DateSlotPicker`                                             | B18                     | new               | Day strip plus time grid. Slots are available, selected, backup (dashed) or taken (struck through).                                                    |
| `PhotoUploader`                                              | C4, C7, C16             | new               | Drop zone, sortable grid, cover badge, per-file progress, rejected state with reason.                                                                  |
| `MapPinPicker`                                               | C2                      | new               | Draggable pin, approximate or exact visibility choice, nearest-station list.                                                                           |
| `ListingPreviewCard`                                         | C1–C5, C6               | new               | Live preview while posting.                                                                                                                            |
| `BoostOptions`                                               | C5, C14                 | new               | Promotion radio cards with price, quota note and estimate.                                                                                             |
| `PlanCard`                                                   | C12                     | new               | Highlighted plan variant.                                                                                                                              |
| `BottomActionBar`                                            | A8, A9, C7, B18         | new               | Sticky bottom with 12/16/24 padding and safe area.                                                                                                     |
| `CookieBanner` + `CookiePreferences`                         | D7                      | new               | Equal-weight accept and reject buttons. Non-essential cookies are off by default.                                                                      |
| `ReportDialog`                                               | D6                      | new               | Reason radio cards, details text, scam callout.                                                                                                        |

---

## 4. States

### Every page and component

- **Loading:** show a skeleton shaped like the content, not a spinner. Already done on the property page.
- **Empty:** use `EmptyState` with one clear next step (B11, D11).
- **Error:** show a retry in place for section failures, `error.tsx` (D10 left) for page failures and `not-found.tsx` (D8) for unknown routes.
- **Auth required:** actions such as favorite, message or request a viewing open the login modal (B5) and resume the action after login.
- **Offline:** show a banner, keep cached favorites, and queue chat drafts (D14).
- **Forms:**
  - Validate on blur and on submit, and show the error under the field.
  - Disable the primary button only while submitting.
  - In the wizard, "ถัดไป" shows how many fields need fixing (C3).

### Domain statuses

| Domain          | Statuses                                                                                      | Tone                                                          |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Listing         | `draft`, `pending_review`, `published`, `rejected`, `expired`, `closed`, `sold`/`rented`      | neutral, warning, success, danger, warning, neutral, neutral  |
| Promotion       | `none`, `bump`, `auto_bump`, `featured`, `homepage_pin` (each with `ends_at`)                 | violet                                                        |
| Viewing request | `requested`, `confirmed`, `counter_proposed`, `declined`, `expired`, `cancelled`, `completed` | warning, success, warning, neutral, neutral, neutral, neutral |
| Payment         | `pending`, `paid`, `failed`, `refund_requested`, `refunded`                                   | warning, success, danger, danger, neutral                     |
| Agent KYC       | `not_started`, `in_progress`, `submitted`, `needs_info`, `approved`, `rejected`               | neutral, neutral, warning, warning, success, danger           |
| Report          | `open` (low, medium, high), `awaiting_reporter`, `resolved`, `dismissed`                      | by severity                                                   |
| User            | `active`, `suspended`, `banned`, `pending_kyc`                                                | success, danger, danger, warning                              |

### Special page states

- **Closed or sold listing:** the property page shows D9 and returns HTTP 410. It is removed from favorites with a notice and offers "notify me for this project".
- **No search results:** D11 lists relaxations, each with a result count, plus a "save search" CTA.
- **Planned maintenance:** D10 right side, with a countdown and a promise to compensate paid time.

---

## 5. Routes

Existing routes are marked ✅. The others are proposed and the folder names are open to change.

### A. Buyer

| Route                 | Boards             | Notes                                                              |
| --------------------- | ------------------ | ------------------------------------------------------------------ |
| `/` ✅                | Home               |                                                                    |
| `/search` ✅          | A1–A4, D11         | Filters live in the URL. Mobile filters open as a bottom sheet.    |
| `/property/[slug]` ✅ | (existing), D6, D9 | `?report=1` opens the report dialog. Closed listings get HTTP 410. |
| `/projects`           | A5                 |                                                                    |
| `/projects/[slug]`    | A6, A8             |                                                                    |
| `/agents/[slug]`      | A7, A9             |                                                                    |

### B. Account

| Route                                                  | Boards           | Notes                                                                                |
| ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------ |
| `/login`, `/register`                                  | B1, B2, B6       | Google and LINE sign-in. Logos are placeholders until FE.                            |
| `/verify-email`, `/forgot-password`, `/reset-password` | B3               |                                                                                      |
| `/onboarding`                                          | B4               |                                                                                      |
| Login modal                                            | B5               | Intercepting route `@modal/(.)login`.                                                |
| `/account`                                             | B20 (mobile hub) | **Decided:** mobile shows the account menu, desktop redirects to `/account/profile`. |
| `/account/profile`                                     | B7               | Profile, security, notifications and PDPA.                                           |
| `/account/favorites`                                   | B8, B10, B11     |                                                                                      |
| `/account/saved-searches`                              | B9               |                                                                                      |
| `/account/appointments`                                | B17              |                                                                                      |
| `/compare?ids=`                                        | B12, B13         | Up to 3 on desktop and 2 on mobile.                                                  |
| `/messages`                                            | B14, B15         |                                                                                      |
| `/messages/[threadId]`                                 | B14, B16, B18    | The viewing request opens as a sheet inside the thread.                              |
| `/notifications`                                       | B19              |                                                                                      |

### C. Lister

| Route                    | Boards       | Notes                                                                                                                          |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `/post`                  | C1           | Creates a draft, then redirects.                                                                                               |
| `/post/[draftId]/[step]` | C1–C5, C7    | `step` is one of `type`, `location`, `details`, `photos` or `publish`. Users can only reach steps they have already completed. |
| `/post/[draftId]/done`   | C6           |                                                                                                                                |
| `/dashboard`             | C8           |                                                                                                                                |
| `/dashboard/listings`    | C9, C11, C14 | `?boost=id1,id2` opens the boost dialog.                                                                                       |
| `/dashboard/leads`       | C10          |                                                                                                                                |
| `/dashboard/billing`     | C15          |                                                                                                                                |
| `/dashboard/verify`      | C16          |                                                                                                                                |
| `/pricing`               | C12          | Public page.                                                                                                                   |
| `/checkout/[orderId]`    | C13          |                                                                                                                                |

### D. Content and system

| Route              | Boards  | Notes                                                             |
| ------------------ | ------- | ----------------------------------------------------------------- |
| `/guides`          | D1      |                                                                   |
| `/guides/[slug]`   | D2, D12 |                                                                   |
| `/tools/mortgage`  | D3, D13 |                                                                   |
| `/help`            | D4      |                                                                   |
| `/legal/[doc]`     | D5      | `doc` is one of `privacy`, `terms`, `listing-rules` or `cookies`. |
| Cookie banner      | D7      | Global, in the root layout.                                       |
| `not-found.tsx` ✅ | D8      | Restyle to match D8.                                              |
| `error.tsx`        | D10     |                                                                   |
| `/maintenance`     | D10     |                                                                   |

### E. Admin

**Decided:** admin is a separate app on its own subdomain (for example `admin.propertyhub…`), so the routes below are relative to that app. It reuses the tokens and UI primitives from this repo.

| Route                     | Boards |
| ------------------------- | ------ |
| `/login`                  | E11    |
| `/`                       | E1     |
| `/moderation`             | E2     |
| `/moderation/[listingId]` | E3     |
| `/reports`                | E4     |
| `/kyc`                    | E5     |
| `/users`                  | E6     |
| `/revenue`                | E7     |
| `/promo-slots`            | E8     |
| `/cms`                    | E9     |
| `/settings/roles`         | E10    |

---

## 6. Business rules shown in the designs

These values are working defaults for the designs and may change.

- **Chat:** in-app chat keeps the history. LINE is an extra channel that takes the conversation outside the app.
- **Viewing requests:**
  - Only the **buyer** sends a request, with a time, an optional backup time, party size and a note.
  - The lister can confirm, counter-propose or decline.
  - A request expires after **24 hours** without a reply, and unanswered requests count against the lister's response rate.
  - Buyers can only pick slots inside the lister's availability, and taken slots are shown struck through.
- **Free listings:** owners get 2 free listings that last 60 days. Agents must pass KYC before publishing.
- **Pricing (VAT included):**

  | Product              | Price                                                   |
  | -------------------- | ------------------------------------------------------- |
  | Bump                 | ฿49                                                     |
  | Auto-bump, 7 days    | ฿199                                                    |
  | Featured, 14 days    | ฿590                                                    |
  | Homepage pin, 7 days | ฿1,490 (**24 slots per day**)                           |
  | Agent Pro            | ฿1,290/month (60 listings, 120 bumps, 5 featured slots) |
  | Agency               | ฿3,290/month                                            |

- **Promotion billing:** a promotion is charged and starts only after the listing passes review. If the listing is rejected, the buyer gets a full refund.
- **Moderation (admin):**
  - Review SLA is 2 hours, and paid listings go first.
  - A listing is auto-hidden after 3 reports.
  - Refunds over ฿1,000 need Finance approval.
  - 4 homepage pin slots per day are reserved for partners, with at most 6 pins per district per day.
  - Admins must use 2FA, and every action is written to an audit log.
- **Mortgage calculator:** uses standard amortization. Minimum income assumes a 40% debt-service ratio.

---

## 7. Accessibility and content

- **Contrast:** use `slate` for secondary text only on white or `mist`. Never put brand-colored text on violet backgrounds.
- **Icon-only buttons:** need an `aria-label` in Thai.
- **Tabs and switches:** use the correct ARIA roles (`tablist`, `switch`, `dialog`, `progressbar` for the wizard on mobile).
- **Charts:** each chart has an `aria-label` sentence with the key numbers.
- **Copy:** Thai, short and plain. Write times as `10:00` and use the Buddhist-era year in UI dates (`22 พ.ย. 2569`). Use `฿` with grouped digits.

## 8. Placeholder content to replace before launch

- Article text, search result counts, LINE OA handle, support email and DPO email.
- The privacy policy and terms are layout only and need legal review.
- The Google and LINE marks on the auth pages must be replaced with official assets.
