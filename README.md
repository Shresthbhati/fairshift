# FairShift

A worker-first employment-protection app for **SDG 8 (decent work)**, built for Prompt Wars 2026 as a coherent, secure, demonstrable MVP.
Workers can see how their pay was worked out, keep their own evidence, and report problems with a choice of privacy. Existing workforce tools serve employers; this one serves the person doing the work.

> Everything in the demo is **fictional** (every organisation says "(Demo)" and a banner says so). Rule sets are demo values, not legal minimums. Nothing here is legal advice.

## What works

| Area | What you can do |
|---|---|
| **FairPay** | Start/stop or add shifts; deterministic wage **estimate** with an itemised explanation; payslip **side by side** with the estimate; ask your employer about a difference (two-sided dispute that cannot be closed by the employer alone). Two seeded sectors: construction daily wage, hospital monthly salary + night allowance. |
| **SafeWork** | Report in **three modes**: named, confidential, anonymous. Reference code; investigator queue with an enforced state machine; reporter can confirm, reopen or escalate. Anonymous reports have **no link to any account**; the tracking code is shown once and only its hash is stored. |
| **Evidence Vault** | Private documents (PDF/JPEG/PNG/WEBP ≤ 10 MB), type checked by magic bytes, SHA-256 stored, 60-second signed downloads, self-reported stamp, JSON export and a printable statement. |
| **Fairness Ledger** | A timeline of what was recorded about your work and who recorded it (you, employer, FairShift), including edits made by others. |
| **Review console** | Role-aware sections: investigator, payroll, supervisor, organisation admin. Aggregate **workplace patterns** hide any group smaller than 5. |
| **Languages** | English and Hindi on every worker screen (see limits). |
| **Rights cards** | Four plain-language guides. They carry no figures and no links, and are marked "not yet verified". |

## Run it

Needs Node 22+, pnpm 10, and Docker Desktop (for the local Supabase stack).

```bash
pnpm install
pnpm supabase start            # first run pulls images; Docker Desktop must be running
cp .env.example .env.local     # then fill the keys from: pnpm supabase status -o env
pnpm db:reset                  # migrations + demo seed (about a minute)
pnpm dev                       # http://localhost:3000 (or the next free port)
```

Fill `.env.local` with `ANON_KEY` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` as `SUPABASE_SERVICE_ROLE_KEY`, and pick any `DEMO_PASSWORD`. The service-role key is server only.

Demo accounts (`<name>@demo.fairshift.local`, password = `DEMO_PASSWORD`): **ravi** (worker, Hindi), **meena** (hospital worker), **suresh** (supervisor), **priya** (payroll), **anita** (investigator), **deepak** (org admin), **kavya**, **farhan** (hospital payroll / investigator). On `/login` the demo buttons fill the form.

Demo day: `pnpm build && pnpm start`. Walk-through: [docs/DEMO.md](docs/DEMO.md).
Recovery: broken data → `pnpm db:reset` (about a minute); Docker down → restart Docker Desktop, then `pnpm supabase start`.

## Checks

```bash
pnpm typecheck && pnpm lint
pnpm test          # unit: pay engine vectors, schemas, file sniffing, rate limiter, state-machine mirror
pnpm db:reset && pnpm test:int   # database: RLS and function checks against the real local stack
pnpm build && pnpm test:e2e      # browser journeys + axe, after pnpm db:reset
pnpm check         # i18n parity + banned phrases, service-role usage allow-list
```

What was run and what it showed is written down in [docs/VERIFICATION.md](docs/VERIFICATION.md).

## How it is built

Next.js 16 (App Router, TypeScript), Chakra UI v3, Supabase local (Postgres, Auth, Storage), Zod v4.

* **Authorisation lives in Postgres.** Row-level security plus `SECURITY DEFINER` functions decide who can read or change anything. Page-level role checks only shape the screens. Supervisors and payroll get zero rows from `incidents`; the audit, rule-set and incident-event tables cannot be edited even by the service role.
* **Anonymity by construction.** Anonymous incidents are written through a service-role-only function that never receives a user id; there is no reporter row, the first event's time is cut to the day, and the tracking token is stored only as a SHA-256 hash.
* **Money is integer paise**, times are UTC `timestamptz` shown in India time. The pay engine is pure TypeScript (`src/domain/pay`) with exact half-up rounding and test vectors for both seeded months.
* **Service-role client** appears in exactly three app files (its own module, the anonymous submit and the anonymous tracker); `scripts/check-no-service-role.ts` fails if anything else references it.
* Design: "Ledger & Stamp" (paper surfaces, rubber-stamp labels, tactile buttons), light theme only, 17 px base, 48 px touch targets.

Layout: `supabase/migrations` (schema, RLS, functions, storage), `src/domain` (pay engine, incident transitions), `src/app` (worker app, review console, tracker), `messages/{en,hi}`, `scripts` (seed, checks), `tests`.
Decisions that differ from the original plan are in [docs/DECISIONS.md](docs/DECISIONS.md).

## Known limitations

* **Local only.** Email + password instead of phone OTP; no cloud deployment.
* **Anonymity has limits.** What you write (where, when, who) can identify you, especially in small teams; the app server briefly handles the request (we store no IP and no reporter link). Anonymous reports take no files.
* No malware scanning or EXIF stripping on uploads; type checking uses file signatures only.
* **Hindi is machine-assisted and not yet reviewed by a native speaker.**
* Rule sets are **demo values**, not legal minimum wages. Rights cards are generic and unverified; the only phone number in the app is 112.
* **Offline:** the app needs internet. Idempotency keys make retries safe, but there is no offline queue and no PWA.
* No account deletion, retention jobs, or hard delete (soft delete hides documents); employers' payslip copies are retained by design.
* Estimates use an unpaid-break and night-window model documented in `src/domain/pay`; breaks are not subtracted from night overlap.
* Not tested: backup/restore, load, real offline durability, malware, phone OTP, native-speaker Hindi quality.

## Roadmap (not built, and nothing in the UI claims it)

Portable WorkID with attestations and share links; CareerLift (skills-gap analysis); worker-defined wage arrangements; phone OTP and shared-device mode; independent worker-support partner routing; full offline PWA; voice dictation (the plan marks it optional); offline shift queue; AI rights Q&A grounded in the cards; more languages; a third sector; cloud deployment with tested backups.
