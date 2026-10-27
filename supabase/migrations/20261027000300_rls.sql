alter table public.organisations enable row level security;
alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.memberships enable row level security;
alter table public.wage_rule_sets enable row level security;
alter table public.shifts enable row level security;
alter table public.payslips enable row level security;
alter table public.wage_calculations enable row level security;
alter table public.wage_disputes enable row level security;
alter table public.dispute_events enable row level security;
alter table public.evidence_documents enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_reporters enable row level security;
alter table public.incident_attachments enable row level security;
alter table public.incident_events enable row level security;
alter table public.audit_events enable row level security;

-- helpers: SECURITY DEFINER so policies don't recurse through other tables' RLS
create function public.has_org_role(p_org uuid, p_roles public.member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m
    where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active' and m.role = any (p_roles));
$$;
create function public.is_staff_for_user(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships target join public.memberships me on me.org_id = target.org_id
    where target.user_id = p_user and target.status = 'active'
      and me.user_id = auth.uid() and me.status = 'active'
      and me.role in ('supervisor','payroll','investigator','org_admin'));
$$;
create function public.is_reporter(p_incident uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.incident_reporters r where r.incident_id = p_incident and r.reporter_id = auth.uid());
$$;

create policy org_read on public.organisations for select to authenticated
  using (public.has_org_role(id, '{worker,supervisor,payroll,investigator,org_admin}'));
create policy site_read on public.sites for select to authenticated
  using (public.has_org_role(org_id, '{worker,supervisor,payroll,investigator,org_admin}'));

create policy profile_self_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profile_staff_read on public.profiles for select to authenticated using (public.is_staff_for_user(id));
create policy profile_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy consent_own on public.consent_records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy membership_self_read on public.memberships for select to authenticated using (user_id = auth.uid());
create policy membership_staff_read on public.memberships for select to authenticated
  using (public.has_org_role(org_id, '{supervisor,payroll,investigator,org_admin}'));
create policy membership_admin_insert on public.memberships for insert to authenticated with check (public.has_org_role(org_id, '{org_admin}'));
create policy membership_admin_update on public.memberships for update to authenticated
  using (public.has_org_role(org_id, '{org_admin}')) with check (public.has_org_role(org_id, '{org_admin}'));

create policy rules_read on public.wage_rule_sets for select to authenticated
  using (public.has_org_role(org_id, '{worker,supervisor,payroll,investigator,org_admin}'));
create policy rules_insert on public.wage_rule_sets for insert to authenticated with check (public.has_org_role(org_id, '{payroll,org_admin}'));

create policy shifts_own_read on public.shifts for select to authenticated using (worker_id = auth.uid());
create policy shifts_staff_read on public.shifts for select to authenticated using (public.has_org_role(org_id, '{supervisor,payroll,org_admin}'));
create policy shifts_own_insert on public.shifts for insert to authenticated
  with check (worker_id = auth.uid() and source = 'worker' and public.has_org_role(org_id, '{worker}'));
create policy shifts_supervisor_insert on public.shifts for insert to authenticated
  with check (source = 'employer' and public.has_org_role(org_id, '{supervisor}'));
create policy shifts_own_update on public.shifts for update to authenticated
  using (worker_id = auth.uid() and status in ('open','recorded')) with check (worker_id = auth.uid() and status in ('open','recorded'));
create policy shifts_supervisor_update on public.shifts for update to authenticated
  using (public.has_org_role(org_id, '{supervisor}')) with check (public.has_org_role(org_id, '{supervisor}'));
-- no delete policy: shifts cannot be deleted

create policy payslips_own_read on public.payslips for select to authenticated using (worker_id = auth.uid());
create policy payslips_staff_read on public.payslips for select to authenticated using (public.has_org_role(org_id, '{payroll,org_admin}'));
create policy payslips_insert on public.payslips for insert to authenticated with check (public.has_org_role(org_id, '{payroll}'));
create policy payslips_update on public.payslips for update to authenticated
  using (public.has_org_role(org_id, '{payroll}')) with check (public.has_org_role(org_id, '{payroll}'));

create policy calcs_own on public.wage_calculations for select to authenticated using (worker_id = auth.uid());
create policy calcs_staff on public.wage_calculations for select to authenticated using (public.has_org_role(org_id, '{payroll,org_admin}'));
create policy calcs_insert on public.wage_calculations for insert to authenticated
  with check (worker_id = auth.uid() and public.has_org_role(org_id, '{worker}'));

create policy disputes_own_read on public.wage_disputes for select to authenticated using (worker_id = auth.uid());
create policy disputes_staff_read on public.wage_disputes for select to authenticated using (public.has_org_role(org_id, '{payroll,org_admin}'));
create policy disputes_insert on public.wage_disputes for insert to authenticated
  with check (worker_id = auth.uid() and status = 'submitted'
              and exists (select 1 from public.payslips p where p.id = payslip_id and p.worker_id = auth.uid() and p.org_id = wage_disputes.org_id));
-- status changes only through transition_dispute()

create policy dispute_events_read on public.dispute_events for select to authenticated
  using (exists (select 1 from public.wage_disputes d where d.id = dispute_id));  -- inherits dispute visibility

create policy evidence_owner_all on public.evidence_documents for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy incidents_reporter_read on public.incidents for select to authenticated using (public.is_reporter(id));
create policy incidents_investigator_read on public.incidents for select to authenticated using (public.has_org_role(org_id, '{investigator}'));
-- no insert/update policies: only the RPCs below write incidents

create policy reporters_read on public.incident_reporters for select to authenticated
  using (reporter_id = auth.uid()
         or exists (select 1 from public.incidents i where i.id = incident_id and public.has_org_role(i.org_id, '{investigator}')));

create policy attachments_read on public.incident_attachments for select to authenticated
  using (exists (select 1 from public.incidents i where i.id = incident_id));  -- inherits incident visibility
create policy attachments_insert on public.incident_attachments for insert to authenticated
  with check (public.is_reporter(incident_id));

create policy incident_events_read on public.incident_events for select to authenticated
  using ((public.is_reporter(incident_id) and visible_to_reporter)
         or exists (select 1 from public.incidents i where i.id = incident_id and public.has_org_role(i.org_id, '{investigator}')));

create policy audit_read on public.audit_events for select to authenticated
  using (subject_worker_id = auth.uid() or (org_id is not null and public.has_org_role(org_id, '{org_admin}')));
