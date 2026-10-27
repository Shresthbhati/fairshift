# Decisions

Choices made where the plan was silent or reality differed. Newest last.

- **Scaffold.** `create-next-app@16.4.3` refused to run in a non-empty folder and rejected `_scaffold` as a name, so it was generated in `scaffold/` and moved up; `.claude/` kept. `node_modules` was reinstalled in place with `CI=true pnpm install` (pnpm needs that to rebuild without a TTY).
- **@types/node 24.** vitest 5 needs `^22 || >=24`; the scaffold's `^20` was bumped to 24 to match Node 26 runtime.
- **pnpm build scripts.** `pnpm-workspace.yaml` now allows `supabase` to run its postinstall (downloads the CLI binary); `sharp` and `unrs-resolver` stay blocked as scaffolded.
- **Smaller local stack.** `supabase/config.toml` disables analytics, edge runtime, realtime and the SQL seed (we seed from `scripts/seed.ts`); `supabase start -x vector,imgproxy,edge-runtime,logflare` cuts image pulls. Storage, auth, PostgREST, Studio and Mailpit stay.
- **join_org re-activates.** The plan says "insert ... on conflict do nothing"; that would leave an *ended* membership ended. The function now sets `status = 'active', ended_on = null` on conflict so re-joining works.
- **docs/PLAN.md** is a short summary pointing at the original brief rather than a verbatim copy.
- **Cache Components off.** `create-next-app@16.4.3` generates `cacheComponents: true` and `partialPrefetching: true`. With them on, reading `cookies()` in the root layout fails prerendering ("runtime data outside Suspense"). Every FairShift route is per-user and dynamic, so both are set to `false` in `next.config.ts`.
- **Dev port.** Port 3000 is held by another project on this machine, so `pnpm dev` falls back to 3001. Supabase `site_url` is not used by our flows (email confirmation is off locally).
