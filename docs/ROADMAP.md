# FairShift: post-hackathon roadmap (agent execution guide)

## Context

FairShift shipped as an 8-hour MVP: Next.js 16, Chakra v3, Supabase, English and Hindi, two sectors. It is deployed on Vercel against the hosted Supabase project `ndpktpsgcpkllxjytrdt`. Now the public demo has to be made safe, the look has to be pushed to a refined skeuomorphic style with dark mode, and the roadmap from the README (`README.md:76`) has to be built. Several coding agents will do the work in parallel, so every task card below stands on its own: what to build, which files to touch, how to prove it is done, and what not to touch.

After approval, this plan is copied into the repo as `docs/ROADMAP.md` so agents can read it there.

### Decisions already made (do not reopen them)
| Topic | Decision |
|---|---|
| Theme default | **Follow the device setting** (`prefers-color-scheme`), with a toggle in the top bar that overrides it and is remembered |
| Skeuomorphism | **Refined**: subtle depth, paper grain, bevels, inset wells. No heavy leather stitching |
| Third-party vendors | **Only an email and SMS provider** (Resend for email; SMS through Supabase phone auth with Twilio). Everything else is built on Postgres, Vercel or GitHub: **no Upstash, no Sentry, no hosted malware scanner** |
| Rate-limit store | Postgres table and RPC (R-S1) |
| Error tracking | Structured server logs plus a health endpoint (R-O1). No Sentry |
| Malware scanning | A `scan_status` column and a stub scanner interface. The UI must never claim "scanned" |
| Scheduled jobs | `pg_cron` for jobs that only touch the database; Vercel Cron for jobs that need storage or email; scheduled GitHub Actions for demo reset and the backup drill |

---

## 0. Rules every agent must follow (read before any task)

**Setup**
```bash
pnpm install
supabase start -x vector,imgproxy,edge-runtime,logflare
pnpm db:reset          # applies migrations + seeds demo data
pnpm dev               # falls back to 3001 if 3000 is taken
```
Demo accounts are listed at the bottom of `scripts/seed.ts` (for example `ravi@demo.fairshift.local`, worker; `priya@…`, payroll; `anita@…`, investigator; `deepak@…`, org_admin).

**Before you open a PR, every one of these must pass:**
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm check
pnpm test:int                         # if you touched SQL, RPCs or RLS
pnpm build && pnpm test:e2e           # if you touched UI or routes (axe: 0 serious/critical)
```

**Hard rules**
1. **Never edit an existing migration.** Add a new file `supabase/migrations/2026MMDDHHMMSS_<what>.sql`. Then run `pnpm db:reset && pnpm db:types && pnpm test:int`, and say in the PR that the migration still has to be applied to hosted project `ndpktpsgcpkllxjytrdt`. The owner applies it, or CI does once R-P2 lands.
2. **Authorisation lives in Postgres**: RLS plus `SECURITY DEFINER` RPCs with `set search_path = ''` (pattern: `supabase/migrations/20261027000400_functions.sql` and `…0600_pin_trigger_search_path.sql`). Never enforce permissions only in React.
3. **The service-role client** (`src/lib/supabase/admin.ts`) is allowed only where `scripts/check-no-service-role.ts` permits it. If you need it somewhere new, update that allowlist and explain why in the PR.
4. **Money is integer paise.** Times are stored in UTC and shown in `Asia/Kolkata`. No floats for money.
5. **Every user-visible string goes through i18n**: add the key to `messages/en/<ns>.json` **and** `messages/hi/<ns>.json` (namespaces are in `src/lib/i18n.ts`). `pnpm check` fails otherwise.
6. **Banned copy**: "theft", "fraud", "illegal", "guaranteed", "100% anonymous". Never claim a feature that is not built.
7. **Colours, shadows and radii come only from theme tokens** (`src/theme/system.ts`). No hex values, `white` or `black` in components.
8. **UI guardrails**: 17px base font, 48px touch targets, status never shown by colour alone (icon plus text, see `src/components/fs/status-meta.ts`), honour `prefers-reduced-motion`.
9. **Privacy**: never log request bodies, incident descriptions, tokens, raw IPs or file contents.
10. Server actions validate input with Zod (copy the `schemas.ts` next to each `actions.ts`) and return `{ ok, error: '<i18n key>' }`. Map RPC errors with `src/lib/rpc-error.ts`.
11. When the plan is silent and you make a choice, add one line to `docs/DECISIONS.md`.
12. Keep the diff to the task. Do not refactor neighbouring code. One task per branch: `feat/<task-id>-<slug>`. Never commit secrets; new env vars go in `.env.example` with a placeholder.

**Definition of Done (every task)**: the "Done when" checks pass, the commands above are green, the PR description lists what was verified and how, and screenshots are attached for UI work in both themes at 360px and 1280px. Update the README "Known limitations" and "Roadmap" sections when an item ships.

---

## 1. Order of work and parallel lanes

```
Phase 0  R-P1 CI, R-P2 migration drift guard  ──► safety net for everything below
Phase 1  security (parallel)      R-S1 rate limit · R-S2 anon spam · R-S3 headers · R-S4 demo reset
Phase 2  design                   R-D1 colour v2 ──► R-D2 → R-D3 (same agent) ──► R-D4 ∥ R-D5 ∥ R-D6 ∥ R-D7 ──► R-D8
Phase 3  correctness (∥ Phase 2)  R-C1 pay estimate · R-C2 snapshot hash · R-C3 rule-set UI · R-C4 TZ tests · R-O1 logging
Phase 4  privacy lifecycle        R-L1 EXIF + scan hook · R-L2 jobs ──► R-L3 retention ──► R-L4 account deletion
Phase 5  roadmap features         R-F1 third sector · R-F2 languages · R-F3 phone OTP + shared device
                                  R-F4 worker-support partner · R-F5 notifications · R-F6 audit API
                                  R-F7 WorkID · R-F8 CareerLift · R-F9 wage arrangements · R-F10 offline PWA · R-F11 backups
```

**Conflict map.** Never give two agents tasks that share these files at the same time:
- `src/theme/system.ts`, `src/components/fs/primitives.tsx`: only R-D1, then R-D2 and R-D3. R-D4 to R-D7 start after them.
- `supabase/migrations/`: any number of agents may add *new* files, but each one rebases and runs `pnpm db:reset` before merging, because timestamps decide the order.
- `src/lib/supabase/database.types.ts`: regenerate it with `pnpm db:types`, never hand-merge it.
- `messages/*/*.json`: on conflict, keep both sides' keys.
- `src/lib/rate-limit.ts` and its callers belong to R-S1. R-S2 and R-F3 call it but do not change it.

---

## Phase 0: Safety net (do first)

### R-P1: GitHub CI
- **Goal:** every PR runs the same checks a human would.
- **Files:** `.github/workflows/ci.yml` (new).
- **Steps:** one job on `ubuntu-latest`. Use `pnpm/action-setup` (version from `packageManager`), then Node 24, then `pnpm install --frozen-lockfile`, then `typecheck`, `lint`, `test`, `check`. Then `supabase/setup-cli`, `supabase start -x vector,imgproxy,edge-runtime,logflare`, write `.env.local` from `supabase status -o env`, and run `pnpm db:reset`, `pnpm test:int`, `pnpm build`, `npx playwright install --with-deps chromium`, `pnpm test:e2e`. Upload `playwright-report/` when it fails. No real secrets.
- **Done when:** a test PR shows green, and a deliberately broken type turns it red.

### R-P2: Migration drift guard
- **Goal:** the hosted schema can never silently fall behind the repo.
- **Files:** `.github/workflows/migrations.yml` (new), `docs/DEPLOY.md` (new).
- **Steps:** on push to `main`, run `supabase link --project-ref ndpktpsgcpkllxjytrdt` (repo secrets `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`), then `supabase migration list`, and fail when a local migration is not applied remotely. Add a manual `workflow_dispatch` job that runs `supabase db push`. Write the runbook in `docs/DEPLOY.md`.
- **Done when:** an unapplied migration fails the workflow with a readable message.

---

## Phase 1: Make the public demo safe

### R-S1: Shared rate limiting (Postgres)
- **Why:** `src/lib/rate-limit.ts` keeps counts in memory, so each Vercel serverless instance starts from zero.
- **Migration:** a `public.rate_limit_hits(key text, window_start timestamptz, count int, primary key (key, window_start))` table, no RLS read access, and an RPC `public.hit_rate_limit(p_key text, p_max int, p_window_seconds int) returns boolean` (security definer; it buckets `now()` into the window, then runs `insert … on conflict do update set count = count + 1 returning count <= p_max`). Grant execute to `anon, authenticated`.
- **Code:** make `rateLimit()` **async** and call the RPC. Keep the in-memory version as `rateLimitMemory` for unit tests. Update every caller (`grep -rn "rateLimit(" src`): `report/new/actions.ts`, `report/[ref]/actions.ts`, `vault/actions.ts`, `track/actions.ts`.
- **New per-IP limits**, keyed by a SHA-256 hash of the first `x-forwarded-for` entry (never store the raw IP): login and sign-up (`src/app/login/actions.ts`, `src/app/signup/actions.ts`) 10 per 15 minutes; anonymous submit 5 per hour; tracker 30 per hour per IP **and** per reference; uploads 20 per hour.
- **Cleanup:** a `pg_cron` job deletes rows older than 1 day. Create the extension here if R-L2 has not landed yet.
- **Done when:** an integration test calls the RPC N+1 times and the last call returns false, and the e2e journeys still pass.

### R-S2: Spam protection on anonymous reports (proof-of-work, no vendor)
- **Why:** `submit_anonymous_incident` can be scripted.
- **Files:** `src/lib/pow.ts` + `src/lib/pow.test.ts` (new). The server issues `{nonce, difficulty, exp}` HMAC-signed with `POW_SECRET`; the client finds `x` so that `sha256(nonce + x)` has N leading zero bits, using Web Crypto. The anonymous path goes through `src/app/(worker)/report/new/report-wizard.tsx` and `actions.ts`. A migration adds a per-org daily cap inside the anonymous-submit RPC: fewer than 50 anonymous incidents per org per IST day, otherwise raise `rate_limited`.
- Tune the difficulty so it solves in under 2 seconds on a low-end phone (start at 18 bits and measure). While it runs, show "Preparing secure submit…" (i18n key).
- **Done when:** unit tests show solve and verify round-trip, and that an expired or tampered challenge is rejected. An integration test shows the 51st anonymous report in a day fails.

### R-S3: Security headers
- **Files:** `next.config.ts`, an `async headers()` block for `/:path*`. Read the CSP guide in `node_modules/next/dist/docs/` first.
- **Set:**
  - `Content-Security-Policy`: `default-src 'self'`; `connect-src 'self' https://ndpktpsgcpkllxjytrdt.supabase.co`, plus the local Supabase URL in dev; `img-src 'self' data: blob:`, plus the Supabase storage host; `style-src 'self' 'unsafe-inline'`, which Emotion requires; `frame-ancestors 'none'`.
  - `X-Frame-Options: DENY`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(self), geolocation=()`.
  - `X-Content-Type-Options: nosniff`.
- **Done when:** `curl -I` on a Vercel preview shows every header, the console shows no CSP violations on any route, and e2e is green.

### R-S4: Hosted demo reset
- **Files:** `scripts/reset-demo.ts` (new) **refuses to run unless** the Supabase URL contains `ndpktpsgcpkllxjytrdt`. It deletes app data in FK order (or truncates the app tables with `cascade`), removes demo storage objects, then reuses the project-pinned remote seed already in `scripts/seed.ts` (commit `3cb65ed`). `.github/workflows/demo-reset.yml` runs on `schedule: '30 20 * * *'` (02:00 IST) and `workflow_dispatch`.
- **Done when:** a manual dispatch resets the hosted demo and the demo logins still work. Running it locally against another URL exits non-zero.

---

## Phase 2: Design system v2 (refined skeuomorphism, light and dark)

Direction: "Ledger & Stamp", pushed further. Dark is a warm charcoal and aged-leather "desk lamp" palette; paper cards are a dimmed cream, never `#FFF`. **Body text at least 7:1 (AAA)**, all other text at least 4.5:1, borders and focus rings at least 3:1 against both neighbours. No pure white and no pure black. Everything goes through `src/theme/system.ts` as tokens, recipes and slot recipes, never one-off styles.

### R-D1: Colour system v2 with colour mode (lands before R-D2 to R-D8)
- **Files:** `src/theme/system.ts`, `src/app/providers.tsx`, `src/components/fs/shell.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `scripts/check-contrast.ts` (new).
- **Steps:**
  1. Turn every semantic token into `{ value: { base: '…', _dark: '…' } }`: `bg`, `bg.surface`, `bg.muted`, `fg`, `fg.muted`, `fg.subtle`, `border`, `ledger.*`, `stamp`, `success`, `warning`, `danger`, `info`, plus a `.fg` text variant for each status. Keep today's light values, which are already AA-fixed (see `docs/DECISIONS.md`), and raise body `fg` to 7:1. Move `shadows.paper/key/keyQuiet` to semantic tokens with `_dark` values.
  2. In `providers.tsx`, wrap the app in the `next-themes` `ThemeProvider` (already installed, 0.4.6) with `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. Remove the "Light theme only" comment. Add `suppressHydrationWarning` to `<html>` in `layout.tsx`.
  3. Add a top-bar toggle in `shell.tsx` that cycles through System, Light and Dark. It needs a 48px target, an icon plus a visually-hidden label, and i18n keys in `common`. `next-themes` persists the choice in localStorage.
  4. `scripts/check-contrast.ts` lists the foreground and background token pairs for both modes, computes the WCAG ratios, and exits 1 below the thresholds. Append it to the `check` script in `package.json`.
- **Done when:** both themes render on every route, the toggle survives a reload, `pnpm check` prints every pair passing, and `tests/e2e/a11y.spec.ts` loops over `page.emulateMedia({ colorScheme: 'light' | 'dark' })` with 0 serious or critical violations.

### R-D2: Remove hardcoded colours (same agent as R-D3, done first)
- **Files:** every `*-view.tsx`, `primitives.tsx`, `PayslipSheet.tsx`, `globals.css`.
- **Steps:** run `grep -rnE "white|black|#[0-9a-fA-F]{3,6}\b|rgba?\(" src` and replace every hit with a token. The only allowed hits are the token definitions in `src/theme/**`. List them in the PR.
- **Done when:** the grep returns only the allowed list.

### R-D3: Skeuomorphic recipes
- **Files:** `src/theme/recipes/{button,card,input,tabs,stamp}.ts` (new), registered in `system.ts` under `theme.recipes` and `theme.slotRecipes`. `primitives.tsx` replaces inline style props with `variant=` props. `BottomNav.tsx` uses the tabs recipe.
- **Look (refined):**
  - Buttons are physical keys: a 1px inner top highlight and a 2px bottom "key edge"; pressed means `translateY(1px)` plus an inset shadow.
  - Cards are paper with layered shadows and a 2–3% noise grain (inline SVG data-URI token, under 2KB).
  - Inputs are recessed wells with an inset shadow.
  - Tabs and the bottom nav are a console strip; the active key looks pressed.
  - Stamps get a −2° to +2° rotation picked deterministically from the label, and ink-bleed edges.
  - Every shadow is a token with a `_dark` value.
- **Gallery:** `src/app/dev/components/page.tsx` shows every variant in both themes. It returns `notFound()` when `NODE_ENV === 'production'`. Delete it before a demo.
- **Done when:** gallery screenshots in both themes are attached and axe is clean on the gallery.

### R-D4: Typography and spacing (after R-D3)
- **Files:** `system.ts` (`textStyles`), `src/components/fs/PayslipSheet.tsx`, `src/app/(worker)/home/home-view.tsx`.
- **Steps:**
  - A heading scale (28/22/19/17).
  - `tabular-nums` on every money value.
  - Body text at most 70ch wide.
  - `line-height: 1.7` or more under `:lang(hi)`.
  - The payslip sheet becomes ruled paper (a repeating-linear-gradient using the `border` token, aligned to the line-height).
  - Tighter Home grid gaps.
- **Done when:** screenshots at 360px and 1280px in en and hi, in both themes, show no clipped Devanagari matras.

### R-D5: Motion and feedback (after R-D3)
- **Files:** `primitives.tsx`, `globals.css`.
- **Steps:** a 120ms key press, a stamp "slam" (scale 1.15 to 1 with rotation, 250ms) when a status becomes Issued or Paid, and a 2px card lift on hover under `@media (hover: hover)`. Wrap all motion in `@media (prefers-reduced-motion: no-preference)`. No sound.
- **Done when:** an e2e assertion with `page.emulateMedia({ reducedMotion: 'reduce' })` sees computed `animation-name: none` on the stamp.

### R-D6: Review console as a "desk" (after R-D3)
- **Files:** `src/app/review/layout.tsx`, `src/app/review/**/*-view.tsx`, `shell.tsx`.
- **Steps:** from 1024px up, a denser layout:
  - a left rail styled as a filing cabinet (each section is a drawer);
  - cases as folder tabs;
  - queue rows with a 4px severity edge strip **plus** a severity text label.

  Below 1024px, keep the stacked layout. Give it its own surface token (`bg.desk`) so it looks clearly different from the worker app.
- **Done when:** desktop screenshots in both themes are attached and axe is clean on `/review/incidents` and `/review/disputes`.

### R-D7: Empty, loading and error states, plus one toast style (after R-D3)
- **Files:** `primitives.tsx` (`EmptyState`, `LoadingState`, `ErrorState` with themed inline SVG illustrations that use `currentColor` and tokens), `src/app/(worker)/loading.tsx`, `src/app/(worker)/error.tsx`, `src/app/review/loading.tsx`, `src/app/review/error.tsx`, `src/components/ui/toaster.tsx` (a paper-slip toast).
- **Done when:** every list view renders `EmptyState` for empty data, and the PR has a screenshot per route per state in both themes.

### R-D8: Visual regression net (last in Phase 2)
- **Files:** `tests/e2e/visual.spec.ts`, plus a `visual` project in `playwright.config.ts`.
- **Cover:** login, home, pay, payslip, report wizard step 1 and the review queue, in light and dark, at 360px and 1280px. Use `toHaveScreenshot({ maxDiffPixelRatio: 0.01, animations: 'disabled' })` and mask dates and reference numbers.
- **Done when:** baselines are generated in CI's Linux image (so fonts match) and committed, and the suite is green twice in a row.

---

## Phase 3: Correctness and observability (runs in parallel with Phase 2)

### R-C1: One server-side pay estimate
- **Why:** Home, Pay, Payslip and dispute each call the loader in `src/app/(worker)/pay/data.ts` separately.
- **Steps:**
  1. Create `src/lib/pay-estimate.ts` exporting `getPayEstimate(workerId, month)`, wrapped in React `cache()`. Move the logic out of `pay/data.ts` and make `pay/data.ts` re-export it.
  2. Callers: `home/page.tsx`, `pay/page.tsx`, `pay/payslips/[id]/page.tsx`, `pay/disputes/[id]/page.tsx`.
  3. A migration adds `pay_estimate_cache(worker_id, month, inputs_hash, result jsonb)` with owner-only RLS. Triggers on shifts, payslips and `wage_rule_sets` delete the affected rows.
- **Done when:** a unit test shows the same inputs give the same output and hash, an integration test shows inserting a shift deletes the cache row, and the four pages show identical numbers.

### R-C2: Dispute snapshots verified on read
- **Steps:** add `src/domain/pay/hash.ts` (canonical JSON with keys sorted, then SHA-256) and reuse it in R-C1. A migration adds `inputs_hash text` to the dispute snapshot table, filled at creation. The worker and review dispute views recompute it and show a "Snapshot verified" or "Snapshot changed" badge (icon plus text).
- **Done when:** an integration test tampers with the row through the admin client and the view shows "changed".

### R-C3: Rule-set management UI
- **Files:** `src/app/review/rule-sets/{page.tsx,rule-sets-view.tsx,actions.ts,schemas.ts}` (new), plus a nav entry in the review layout.
- **Steps:** payroll and org_admin list versions and create a **new version** with `effective_from`; rule sets are never edited in place. Confirm the insert policy in `20261027000300_rls.sql` and add an RPC if it is missing. Zod checks integer paise and multipliers of at least 1.
- **Done when:** an e2e test as `priya@…` creates a version effective today, then the worker's estimate for shifts from today changes.

### R-C4: Time-zone and DST property tests
- **Files:** `src/domain/pay/calculate.property.test.ts`.
- **Steps:** use a seeded PRNG (mulberry32, written inline; no new dependency) to generate 1,000 shifts, including shifts that cross midnight, the night window and month boundaries. Compare `calculate.ts` against a slow minute-by-minute reference implementation. Add fixed cases where the UTC date differs from the IST date.
- **Done when:** the test passes. If it finds a bug, fix it in `calculate.ts` and add a fixed regression case.

### R-O1: Structured logging and a health endpoint
- **Files:** `src/lib/log.ts` + `src/lib/log.test.ts` (new), `src/proxy.ts` (sets or forwards `x-request-id`), `src/app/api/health/route.ts` (new).
- **Steps:** `log.info/warn/error(event, fields)` writes one JSON line with `requestId`, `route` and `userIdHash`. It keeps **only allowlisted field names**; everything else is dropped. `/api/health` returns `{ ok, dbMs }` after `select 1` through an RPC, with no secrets. Add a check to `pnpm check` that fails on `console.log(` inside `src/app/**/actions.ts`.
- **Done when:** a test shows `log.error('x', { description: 'secret', token: 'abc' })` outputs neither value, and `/api/health` returns 200 locally and on Vercel.

---

## Phase 4: Privacy lifecycle

### R-L1: EXIF stripping and a scan hook
- **Files:** `src/lib/files.ts` and `src/lib/files.test.ts` (signature sniffing already lives here), the upload paths in `src/app/(worker)/vault/actions.ts` and `src/app/(worker)/report/[ref]/actions.ts`, plus a migration adding `scan_status text not null default 'not_scanned' check (scan_status in ('not_scanned','clean','infected'))` to the documents table.
- **EXIF:** pure TypeScript, no dependency. For JPEG, drop the APP1 (`FFE1`) and APP13 (`FFED`) segments. For PNG, drop the `eXIf`, `tEXt`, `iTXt` and `zTXt` chunks. Strip before the storage upload.
- **Scan:** add `scanFile(bytes): Promise<'not_scanned'>` as a stub, with a `ponytail:` comment naming the upgrade path. Copy never says "scanned".
- Remove the EXIF item from the README "Known limitations". Keep the malware item.
- **Done when:** fixture JPEG and PNG files with GPS tags come out without them, and the images still decode (both checked in unit tests).

### R-L2: Background jobs infrastructure
- **Files:** a migration with `create extension if not exists pg_cron`; `vercel.json` with a `crons` array; `src/lib/cron-auth.ts` (checks `Authorization: Bearer ${CRON_SECRET}`); `docs/JOBS.md` (each job's name, schedule, where it runs and its owner task).
- **Done when:** `select * from cron.job` works locally and on the hosted project, and a cron route without the secret returns 401.

### R-L3: Retention purge (after R-L2)
- **Steps:**
  1. A daily `pg_cron` function hard-deletes soft-deleted vault documents older than 30 days and pushes their storage paths into `storage_purge_queue`.
  2. A Vercel Cron route, `src/app/api/cron/purge/route.ts`, deletes those objects with the admin client. Add the path to the `check-no-service-role` allowlist.
  3. **Exclude employer payslip copies.**
- **Done when:** an integration test shows a 31-day-old soft-deleted document is purged and a 29-day-old one remains.

### R-L4: Account deletion (after R-L3)
- **Files:** `src/app/(worker)/settings/` adds a "Delete my account" flow (type a confirmation word), a migration with the `request_account_deletion()` and `cancel_account_deletion()` RPCs, and a daily job.
- **Rules:**
  - Deletion waits through a 7-day grace period; logging in during it offers cancellation.
  - After the grace period, worker-owned data (shifts, vault, own drafts) is removed.
  - Employer-retained payslips stay, with the name pseudonymised to "Former worker".
  - Anonymous incidents are untouched; they were never linked.
- **Done when:** an e2e test requests deletion, logs in again and cancels. An integration test checks exactly what remains after the purge.

---

## Phase 5: Roadmap features

Every feature follows the same internal order: **migration and RLS, then RPC, then integration tests (allowed *and* denied), then route and views, then i18n (en and hi), then e2e, then the README update.**

### R-F1: Third sector (manufacturing / facility management)
- **This is the extensibility test: no changes to shared components (`src/components/fs/*`).**
- **Steps:**
  1. Migration A, on its own because a new enum value cannot be used in the same transaction: `alter type public.sector add value 'manufacturing';`.
  2. Migration B: if new unit kinds are needed (for example `'line'`, `'floor'`), drop and recreate the `units.kind` check constraint, which today allows only `'site'` and `'department'`.
  3. `scripts/seed.ts`: add a third demo org ("Apex Facilities (Demo)", join code `APEX-DEMO`), its users and a rule set.
  4. Add the sector branches in `src/lib/auth.ts`, the fixtures in `src/domain/pay/fixtures.ts` and `calculate.test.ts`, and the sector labels in `messages/*`.
- **Done when:** `grep -rn "'construction'\|'healthcare'" src` shows no switch missing the new value, and a new-org worker can log a shift, see an estimate and file a report.

### R-F2: More languages (Tamil, Bengali, Marathi)
- **Steps:**
  - Set `LOCALES = ['en','hi','ta','bn','mr']` in `src/lib/i18n.ts`.
  - Add `messages/{ta,bn,mr}/<every namespace>.json` and localise `content/rights/*.json` if needed.
  - Load Noto Sans Tamil and Noto Sans Bengali (Devanagari covers Marathi) via `next/font` in `layout.tsx`.
  - Add a language picker in settings.
  - Extend `scripts/check-i18n.ts` to check every locale.
- **Native review:** each machine-drafted file carries `"_review": "pending"`, and the UI shows a small "Translation under review" note until a native reviewer signs off. Record the sign-off in `docs/DECISIONS.md`. Hindi gets the same review.
- **Done when:** `pnpm check` passes, 360px screenshots per language show no overflow, and the R-D4 line-height rule covers `:lang(ta)`, `:lang(bn)` and `:lang(mr)`.

### R-F3: Phone OTP and shared-device mode
- **Phone OTP:**
  - The owner turns on Supabase phone auth with Twilio in the dashboard; credentials are never committed.
  - Local dev uses `[auth.sms.test_otp]` in `supabase/config.toml`.
  - The login view gets a "Use phone" tab: E.164 input (default +91), then a 6-digit code with `autocomplete="one-time-code"`.
  - Rate limits through R-S1: 3 per 15 minutes per number and per IP.
- **Shared-device mode:** a settings toggle, "This phone is shared". It sets a 30-minute idle logout, hides the name in the top bar, shows a large Log out key, and clears the locale cookie on logout.
- **Done when:** an e2e test logs in with the test OTP, and in shared mode `page.clock` advances past 30 minutes and the user is logged out.

### R-F4: Independent worker-support partner role
- **Why:** complaints about the employer itself must not reach the employer's own investigator.
- **Steps:**
  - A migration adds `support_partner` to `member_role`, plus a `partner_links(org_id, partner_org_id)` table.
  - Add `incidents.route_to text not null default 'employer' check (route_to in ('employer','partner'))`.
  - The wizard shows the choice only when the org has a partner ("Send to an independent support organisation instead of your employer").
  - RLS: when `route_to = 'partner'`, **only** members of the partner org can read it, transition it or comment on it.
  - The review console is reused, filtered.
- **Done when:** an integration test shows the employer's investigator gets 0 rows for partner-routed cases and the partner gets them.

### R-F5: Notifications (email via Resend, opt-in)
- **Steps:**
  - A migration adds `notification_prefs(user_id, event, enabled default false)` and an outbox, `notifications(id, user_id, event, ref_id, created_at, sent_at)`.
  - Triggers on investigator assignment and on a dispute reply insert outbox rows.
  - A Vercel Cron route, `api/cron/notify` (secret via R-L2), sends pending rows through the Resend REST API (`RESEND_API_KEY`, using `fetch`, no SDK).
  - **The email body contains no case content**: only "You have an update in FairShift" plus a link.
  - Opt-in toggles in settings.
- **Done when:** an integration test checks the outbox row, and a unit test checks the payload builder output has no description field.

### R-F6: Audit API for admins
- **Files:** `src/app/review/audit/{page.tsx,audit-view.tsx}`, plus `src/app/review/audit/export/route.ts` (CSV).
- **Steps:** an RPC, `list_audit(p_actor, p_entity, p_from, p_to, p_page)`, available only to `org_admin`; the list filters and paginates. The trail stays read-only: grant no update or delete.
- **Done when:** a non-admin gets an error or empty result in an integration test, and the CSV rows match the screen.

### R-F7: WorkID (attestations, revocable share links, portfolio PDF)
- **Migration:**
  - `attestations(id, worker_id, org_id, kind check in ('shift_period','payslip'), subject_id, statement jsonb, signed_hash, issued_by, issued_at, revoked_at)`. Payroll issues them through a security-definer RPC; `signed_hash` is an HMAC of the canonical statement using a secret kept in Supabase Vault.
  - `share_links(id, worker_id, token_hash, scope jsonb, expires_at, revoked_at)`. The token is shown once; only its hash is stored.
- **Routes:**
  - `src/app/(worker)/workid/` lists items, requests attestations, and creates or revokes links.
  - A public, rate-limited `src/app/w/[token]/page.tsx` shows a "Verified by <org> on <date>" stamp, or "Revoked" / "Expired".
  - `workid/print` is the portfolio PDF: print CSS plus the browser's "Save as PDF". No PDF library.
- **Done when:** an e2e test creates a link, opens it logged out, revokes it and sees the revoked state. An integration test shows a tampered statement as unverified.

### R-F8: CareerLift (skills-gap analysis, explainable recommendations)
- **Scope (keep it small):**
  - `content/careers/<sector>.json` holds roles with their required skills and certificates.
  - The worker's skills come from vault documents of kind `certificate` plus a new `worker_skills` table of self-declared skills.
  - `src/domain/careers/gap.ts` is a pure function with unit tests.
  - Every recommendation states **why** ("You have X and Y; Supervisor also needs Z").
  - No ML or LLM.
- **Done when:** the unit tests pass and a worker sees recommendations with reasons on `/careers`.

### R-F9: Worker-defined wage arrangements
- **Steps:** a migration adds `wage_arrangements(worker_id, org_id, basis, rate_paise, ot_multiplier, effective_from)`, owner-only RLS; this is what the worker was *told* they would be paid. `src/domain/pay/calculate.ts` accepts an optional arrangement. The pay and payslip views show two columns, "By org rule set" and "By what you were told". Neutral copy only.
- **Done when:** unit tests run both estimates on the same shifts and the payslip view shows both.

### R-F10: Full offline PWA with conflict resolution
- **Steps:**
  - Add `src/app/manifest.ts` and a hand-written `public/sw.js`: cache-first for the app shell and rights cards, network-first for data. Register it in `providers.tsx`.
  - Add an IndexedDB outbox for **shift logging only**. Each item reuses the idempotency key already in `src/app/(worker)/shifts/actions.ts`, so a replay is safe.
  - If the server rejects an overlapping shift, show it under "Needs your decision" with Keep mine and Keep the saved one.
  - Reports and uploads stay online-only for privacy, and the UI says so.
- **Done when:** a Playwright test runs `context.setOffline(true)`, logs a shift, goes back online and sees exactly one synced row. An overlapping fixture covers the conflict path.

### R-F11: Cloud deployment hardening and tested backups
- **State today:** Vercel and Supabase Cloud are live. What's missing is **backups that have been tested**.
- **Steps:**
  - `docs/DEPLOY.md` covers the env vars per environment, Vercel rollback ("Instant Rollback"), and the Supabase backup tier in use.
  - `.github/workflows/backup-drill.yml` runs monthly and on demand. It runs `supabase db dump` against the hosted project, restores into a fresh local Supabase, runs `pnpm test:int` against it, and uploads the dump as an encrypted artifact with 7-day retention.
  - Record each drill in `docs/VERIFICATION.md`.
- **Done when:** one drill runs green and is recorded.

---

## Suggested agent batches (paste one task card plus section 0 to each agent)

| Batch | In parallel | Notes |
|---|---|---|
| 1 | R-P1, R-P2, R-S3, R-D1 | R-D1 blocks the rest of the design work |
| 2 | R-S1, R-S2, R-S4, R-D2 then R-D3 (one agent), R-C4 | R-S1 and R-S2 both add migrations: rebase and `db:reset` |
| 3 | R-D4, R-D5, R-D6, R-D7, R-C1, R-C2, R-O1 | Different folders |
| 4 | R-D8, R-C3, R-L1, R-L2, R-F1 | R-D8 only after the look settles |
| 5 | R-L3, R-F2, R-F3, R-F4, R-F6 | |
| 6 | R-L4, R-F5, R-F7, R-F9, R-F11 | |
| 7 | R-F8, R-F10 | |

## Verification (for whoever merges each PR)
1. CI (R-P1) and the migration guard (R-P2) are green.
2. Check out the branch, run `pnpm db:reset && pnpm dev`, and walk the task's "Done when" flow as the right demo user.
3. For UI tasks, check both themes at 360px and 1280px, `pnpm test:e2e` (axe 0 serious or critical), and the visual suite once R-D8 exists.
4. For SQL tasks, confirm it is a new migration file only, that `pnpm test:int` covers both the allowed and denied RLS paths, and then apply it to `ndpktpsgcpkllxjytrdt`.
5. Confirm the README "Known limitations" and "Roadmap" sections, and `docs/DECISIONS.md`, are updated.
