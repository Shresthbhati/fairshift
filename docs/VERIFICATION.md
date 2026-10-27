# Verification

What was actually run on 2026-10-27 (Windows 11, Node 26.8, pnpm 10.30, Docker Desktop 29.2, local Supabase) and what it showed.
Nothing here is assumed: items not run are listed as **not verified**.

## Automated

| Check | Command | Observed |
|---|---|---|
| Types | `pnpm typecheck` | clean |
| Lint | `pnpm lint`, `eslint tests scripts` | clean |
| Unit | `pnpm test` | 6 files, **32 tests pass**: pay engine vectors T1–T15, payslip comparison, schemas, file sniffing (a PNG named `.pdf` is detected as PNG), rate limiter, incident state machine (including a test that parses the SQL and fails if the TypeScript mirror drifts) |
| Repo checks | `pnpm check` | i18n: **520 keys identical in en and hi**, no banned phrases; service-role allow-list ok |
| Database | `pnpm db:reset && pnpm test:int` | **18 of 18 pass** (run twice, each after a reset): RLS-1…10, RPC-1…6, IDEM-1, LEAVE-1 |
| Build | `pnpm build` | succeeds, 28 routes |
| Browser | `pnpm db:reset && pnpm test:e2e` | **19 pass, 1 skipped by design** (the 360px overflow check is phone-only): E2E-1…6, axe on `/login`, `/home`, `/pay`, `/report/new`, `/vault`, `/review/incidents` at 360×740 and 1280×800 with **0 serious or critical violations** (wcag2a, wcag2aa, wcag22aa), and no horizontal scroll at 360px on `/home`, `/pay`, `/shifts`, `/report`, `/vault`, `/rights`, `/ledger` |

Journeys covered: Ravi records a shift and sees ₹17,500.00 estimated vs ₹2,100.00 more overtime than his payslip; Meena files a confidential report, Farhan acknowledges it, Meena sees the note; Ravi files an anonymous report, a stranger with only the code can track it, Anita's case says "No identity stored", Suresh gets the "investigator accounts" page; Ravi stores a document whose name and declared type are wrong (detected by bytes) and downloads his JSON export; a payslip question where payroll can resolve only after the worker accepts; the Hindi switch.

### How the first runs went (kept for honesty)
* First browser run: 14 pass, 5 fail. Four were mine: ambiguous selectors in the tests (`Note`, `Title`, a heading duplicated by Next's route announcer) and an invalid assertion. One was real: **axe found low contrast** on the investigator queue. The plan's `warning` colour `#A86A00` was claimed to be about 5.5:1 but measures 4.19:1 on paper-50 and 3.84:1 on the canvas; `success` measured 4.36:1. Both were darkened (see DECISIONS.md) and the checks now pass.
* One more assertion of mine was wrong (E2E-6 expected no reference codes on Meena's home, but it correctly shows an update on her report); it was replaced and the full suite was then run once from a clean reset.

## Security checklist (plan §H5), observed against the running database

* `select count(*) from pg_tables where schemaname='public' and not rowsecurity` → **0** (17 public tables, all with RLS).
* Function grants: `anon` can execute **none** of the public functions. `authenticated` can execute only `submit_incident`, `transition_incident`, `reporter_respond`, `transition_dispute`, `incident_insights`, `log_export`, `join_org` and the three RLS helpers. `submit_anonymous_incident`, `anonymous_respond`, `get_incident_by_token` and `_reporter_action` are not executable by signed-in users (also asserted by RPC-4). Calling `get_incident_by_token` with the anon key returns `42501 permission denied`.
* `console.log/info/debug` in `src/`: none.
* Service-role key: referenced only in `src/lib/supabase/admin.ts`, the anonymous submit and tracker actions, the seed script and the integration test helper (enforced by `scripts/check-no-service-role.ts`); no `NEXT_PUBLIC_` variable holds a secret.
* Banned phrases ("theft", "fraud", "illegal", "guaranteed", "100% anonymous", "safety score"): none in `messages/` (enforced by `pnpm check`). The E2E-1 journey also asserts the payslip page contains none of "theft/fraud/illegal".

## Manual (plan §H4)

| Check | Status |
|---|---|
| 360px phone layout, visual look of login, home, pay (Hindi) | **observed** in the in-app browser at 375px; the 360px no-overflow check is automated (above) |
| Review console on desktop (Anita: only her two sections, queue ordered by severity) | **observed** |
| Keyboard-only walk through the report wizard | **not verified** (radio cards and buttons are native controls, but no one walked it) |
| 200% browser zoom on `/pay` | **not verified** |
| "Slow 4G" load of `/home` under 5 s on the production build | **not verified** |
| Screen-reader spot check (NVDA/Narrator) of the mode selector and stamps | **not verified** |
| Hindi reviewed by a native speaker | **not done**; Hindi is machine-assisted |

## Plan items intentionally not built
COULD items 16–18 (voice dictation, offline shift queue, Gemini rights Q&A) and everything under "Out of scope" in the plan. The README says so and nothing in the UI claims them.
