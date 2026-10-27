# FairShift — plan summary

Worker-first employment-protection app (SDG 8, Prompt Wars 2026), built as an 8-hour MVP. The full execution plan was supplied as the original brief; this file keeps the fixed decisions.

**Stack:** Next.js 16 App Router + TypeScript, Chakra UI v3, Supabase local (Postgres + RLS + RPC + Auth + Storage), Zod v4, Vitest, Playwright + axe. English + Hindi via a tiny in-repo i18n helper.

**Cut line:** MUST = auth/roles, FairPay (shifts, estimate, payslip comparison), SafeWork (3 report modes, investigator state machine), Evidence Vault + export, two seeded sectors, Hindi, RLS/RPC tests. SHOULD = disputes, Fairness Ledger, rights cards, wellbeing alerts, insights (k >= 5), attendance, sign-up. COULD = voice dictation, offline shift queue, Gemini rights Q&A.

**Rules that matter:** money is integer paise; times stored UTC, shown in Asia/Kolkata; authorisation lives in Postgres (RLS + SECURITY DEFINER RPCs); service-role client only in the seed script and the anonymous submit/track actions; copy never says "theft", "fraud", "illegal", "guaranteed", "100% anonymous".
