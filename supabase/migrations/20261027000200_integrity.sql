create function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare r jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_events (actor_id, org_id, subject_worker_id, table_name, row_id, action, changed)
  values (
    auth.uid(),
    case when tg_table_name = 'evidence_documents' then null else (r->>'org_id')::uuid end,  -- private docs never in employer audit
    coalesce((r->>'worker_id')::uuid, (r->>'owner_id')::uuid, (r->>'user_id')::uuid),
    tg_table_name, (r->>'id')::uuid, lower(tg_op),
    case tg_op when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
               when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
               else jsonb_build_object('old', to_jsonb(old)) end);
  return coalesce(new, old);
end $$;

create trigger audit_shifts after insert or update or delete on public.shifts for each row execute function public.audit_row();
create trigger audit_payslips after insert or update or delete on public.payslips for each row execute function public.audit_row();
create trigger audit_wage_rule_sets after insert on public.wage_rule_sets for each row execute function public.audit_row();
create trigger audit_memberships after insert or update or delete on public.memberships for each row execute function public.audit_row();
create trigger audit_disputes after insert or update on public.wage_disputes for each row execute function public.audit_row();
create trigger audit_evidence after insert or update on public.evidence_documents for each row execute function public.audit_row();
-- incidents are deliberately NOT audited here (would copy description text); incident_events is their audit trail.

create function public.forbid_change() returns trigger language plpgsql as $$
begin raise exception 'immutable_table: %', tg_table_name; end $$;
create trigger immutable_audit before update or delete on public.audit_events for each row execute function public.forbid_change();
create trigger immutable_rules before update or delete on public.wage_rule_sets for each row execute function public.forbid_change();
create trigger immutable_calcs before update or delete on public.wage_calculations for each row execute function public.forbid_change();
create trigger immutable_incident_events before update or delete on public.incident_events for each row execute function public.forbid_change();
create trigger immutable_dispute_events before update or delete on public.dispute_events for each row execute function public.forbid_change();

create function public.shifts_guard() returns trigger language plpgsql as $$
begin
  if new.worker_id <> old.worker_id or new.org_id <> old.org_id or new.source <> old.source
     or new.client_request_id <> old.client_request_id or new.created_by is distinct from old.created_by then
    raise exception 'shift_identity_fields_are_immutable';
  end if;
  return new;
end $$;
create trigger shifts_guard before update on public.shifts for each row execute function public.shifts_guard();
