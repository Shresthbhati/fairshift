# FairShift: judge demo script (about 5 minutes)

Run `pnpm db:reset` first so every journey starts from the seeded data. Use `pnpm build && pnpm start` for the real thing.
Every account uses the password in `DEMO_PASSWORD`; on `/login` the **demo buttons** fill it for you, then press **Sign in**.

| Who | Role | Where to look |
|---|---|---|
| Ravi Kumar | construction worker, Hindi | FairPay, SafeWork, Vault |
| Meena Das | hospital worker | monthly salary + night allowance, confidential report |
| Suresh | supervisor | Attendance; **cannot** see complaints |
| Priya | payroll (construction) | wage questions, issuing payslips; **cannot** see complaints |
| Anita | investigator (construction) | incident queue and cases |
| Deepak | organisation admin | workplace patterns (counts only, groups under 5 hidden) |
| Kavya / Farhan | payroll / investigator (hospital) | second sector |

Anonymous tracker demo: open `/track` with reference **FS-DEMO0001** and code **fairshift-demo-tracking-token-0001**.

## 1. The point (30 s)
"Worker-first, not surveillance." Open `/login`, switch to **हिन्दी**, tap **रवि**, sign in.

## 2. FairPay: "was my overtime paid?" (60 s)
Home → **मज़दूरी जाँचें** → September 2026: itemised **ESTIMATE ₹17,500.00**, built from Ravi's own shift records and the employer's rule set.
Open the payslip: **Estimate vs Payslip**, difference **₹2,100.00 overtime**, in neutral wording ("can happen because of missing shifts, different rules, or an error").
Tap **इस अंतर के बारे में पूछें** → send the question. A copy of the calculation is saved with it.

## 3. A dispute cannot be closed by the employer alone (30 s)
Sign out → **Priya** → Wage questions → open → **Acknowledge** → write a reply and send.
Note "You can mark this resolved only after the worker accepts." Sign in as **Ravi**, open the question, **accept**. Only now can **Priya** mark it resolved.

## 4. SafeWork: three privacy modes (60 s)
As **Ravi**: Report a problem → physical hazard (the 112 guidance appears) → **Anonymous**: read the limits → write what happened → send.
Copy the **tracking code** (shown once), tick "I have saved this code".
Open `/track` in a private window: the reference + code show the status. Sign in as **Anita**: the case says **"No identity stored"**.
Sign in as **Suresh** and open Incidents: a clear "this area is for investigator accounts" page. Same for **Priya**.

## 5. Second sector (45 s)
As **Meena**: Pay → September: monthly salary + overtime + **night allowance**; the payslip pays ₹600 of the ₹900 allowance, so the difference is **₹300.00**. The wellbeing notes show six long shifts.

## 6. Evidence and export (30 s)
Vault → upload a PDF (stamped **SELF-REPORTED**) → Export my records → **printable statement** → Fairness Ledger.

## 7. Proof (30 s)
Run `pnpm test:int`: 18 database checks (who can and cannot see what). Close on the README "Known limitations".
