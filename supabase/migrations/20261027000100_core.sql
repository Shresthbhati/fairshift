create type public.member_role as enum ('worker','supervisor','payroll','investigator','org_admin');
create type public.sector as enum ('construction','healthcare');
create type public.pay_basis as enum ('hourly','daily','monthly');
create type public.record_source as enum ('worker','employer','system');
create type public.incident_mode as enum ('identified','confidential','anonymous');
create type public.incident_category as enum ('physical_hazard','unsafe_equipment','harassment','wages','excessive_hours','discrimination','other');
create type public.incident_severity as enum ('low','medium','high','urgent');
create type public.incident_status as enum ('submitted','acknowledged','investigating','action_taken','resolved','closed_no_action','reopened','escalated');
create type public.dispute_status as enum ('submitted','acknowledged','responded','accepted_by_worker','challenged','escalated','withdrawn','resolved');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector public.sector not null,
  jurisdiction text not null default 'IN',
  join_code text unique,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('site','department'))
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  preferred_locale text not null default 'en' check (preferred_locale in ('en','hi')),
  created_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notice_version text not null,
  given_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null,
  status text not null default 'active' check (status in ('active','ended')),
  started_on date not null default current_date,
  ended_on date,
  unique (org_id, user_id, role)
);
create index memberships_user_active on public.memberships (user_id) where status = 'active';

create table public.wage_rule_sets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id) on delete cascade,
  version int not null,
  label text not null,
  pay_basis public.pay_basis not null,
  base_rate_paise int not null check (base_rate_paise > 0),      -- per hour | per day | per month
  ot_after_minutes int not null default 480 check (ot_after_minutes > 0),
  ot_multiplier_pct int not null default 200 check (ot_multiplier_pct >= 100),
  monthly_divisor_days int not null default 26 check (monthly_divisor_days > 0),
  unpaid_break boolean not null default true,
  night_allowance_paise int not null default 0 check (night_allowance_paise >= 0),
  night_start time not null default '22:00',
  night_end time not null default '06:00',
  night_min_minutes int not null default 240,
  long_shift_minutes int not null default 600,
  min_rest_minutes int not null default 660,
  source_note text not null,      -- e.g. 'Employer configuration (demo values, not legal advice)'
  effective_from date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (org_id, version)
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organisations(id),
  site_id uuid references public.sites(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  break_minutes int not null default 0 check (break_minutes between 0 and 720),
  source public.record_source not null default 'worker',
  time_source text not null default 'server_clock' check (time_source in ('server_clock','manual_entry','device_clock')),
  status text not null default 'recorded' check (status in ('open','recorded','confirmed')),
  client_request_id uuid not null unique,
  note text check (char_length(note) <= 500),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at > started_at),
  check (ended_at is null or ended_at - started_at <= interval '24 hours'),
  check ((status = 'open') = (ended_at is null))
);
create unique index shifts_one_open_per_worker on public.shifts (worker_id) where ended_at is null;
create index shifts_worker_time on public.shifts (worker_id, started_at desc);
create index shifts_org_time on public.shifts (org_id, started_at desc);

create table public.payslips (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organisations(id),
  period_start date not null,
  period_end date not null,
  components jsonb not null default '[]',   -- [{label, kind:'base'|'overtime'|'allowance'|'other', amount_paise}]
  deductions jsonb not null default '[]',   -- [{label, amount_paise}]
  gross_paise int not null check (gross_paise >= 0),
  net_paise int not null,
  status text not null default 'issued' check (status in ('issued','paid')),
  paid_on date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (worker_id, org_id, period_start, period_end),
  check (period_end >= period_start)
);

create table public.wage_calculations (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organisations(id),
  rule_set_id uuid not null references public.wage_rule_sets(id),
  engine_version text not null,
  period_start date not null,
  period_end date not null,
  inputs jsonb not null,
  result jsonb not null,
  total_paise int not null,
  created_at timestamptz not null default now()
);

create table public.wage_disputes (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid not null references public.organisations(id),
  payslip_id uuid not null references public.payslips(id),
  calculation_id uuid references public.wage_calculations(id),
  component_kind text not null check (component_kind in ('base','overtime','allowance','other','total')),
  claimed_difference_paise int not null,
  description text not null check (char_length(description) between 10 and 2000),
  status public.dispute_status not null default 'submitted',
  client_request_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.wage_disputes(id) on delete cascade,
  from_status public.dispute_status,
  to_status public.dispute_status,
  body text check (char_length(body) <= 2000),
  actor_kind text not null check (actor_kind in ('worker','employer')),
  actor_id uuid,
  created_at timestamptz not null default now()
);

create table public.evidence_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid references public.organisations(id),
  kind text not null check (kind in ('payslip','attendance','agreement','photo','certificate','other')),
  title text not null check (char_length(title) between 1 and 120),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes int not null check (size_bytes between 1 and 10485760),
  sha256 text not null,
  provenance public.record_source not null default 'worker',
  verification text not null default 'self_reported' check (verification in ('self_reported','employer_confirmed')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index evidence_owner on public.evidence_documents (owner_id, created_at desc) where deleted_at is null;

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations(id),
  reference_code text not null unique,
  mode public.incident_mode not null,
  category public.incident_category not null,
  severity public.incident_severity not null,
  description text not null check (char_length(description) between 10 and 4000),
  location_text text check (char_length(location_text) <= 200),
  status public.incident_status not null default 'submitted',
  tracking_token_hash text unique,                    -- only for anonymous
  submitted_on date not null default current_date,    -- date only (no time) for all modes
  updated_at timestamptz not null default now(),
  check ((mode = 'anonymous') = (tracking_token_hash is not null))
);
create index incidents_org_status on public.incidents (org_id, status);

create table public.incident_reporters (   -- identity separated from content; NO row for anonymous
  incident_id uuid primary key references public.incidents(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade
);
create index incident_reporters_reporter on public.incident_reporters (reporter_id);

create table public.incident_attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes int not null,
  sha256 text not null,
  created_at timestamptz not null default now()
);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  kind text not null check (kind in ('status','comment','confirmed')),
  from_status public.incident_status,
  to_status public.incident_status,
  body text check (char_length(body) <= 2000),
  actor_kind text not null check (actor_kind in ('reporter','investigator','system')),
  actor_id uuid,                               -- null for anonymous reporter and system
  visible_to_reporter boolean not null default true,
  created_at timestamptz not null default now()
);
create index incident_events_incident on public.incident_events (incident_id, created_at);

create table public.audit_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  org_id uuid,
  subject_worker_id uuid,
  table_name text not null,
  row_id uuid,
  action text not null,
  changed jsonb
);
create index audit_subject on public.audit_events (subject_worker_id, at desc);
create index audit_org on public.audit_events (org_id, at desc);

-- profile auto-creation for self sign-up (seed also relies on it: pass display_name/locale in user_metadata)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, preferred_locale)
  values (new.id,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), 'Worker'),
          coalesce(nullif(new.raw_user_meta_data->>'locale',''), 'en'));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
