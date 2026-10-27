-- All RPCs are SECURITY DEFINER with a pinned search_path. Grants are at the bottom of the file.

create function public.submit_incident(
  p_org uuid, p_mode public.incident_mode, p_category public.incident_category,
  p_severity public.incident_severity, p_description text, p_location text)
returns table(id uuid, reference_code text)
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ref text; v_try int := 0;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  if p_mode = 'anonymous' then raise exception 'anonymous_not_allowed'; end if;
  if not public.has_org_role(p_org, '{worker,supervisor,payroll,investigator,org_admin}') then
    raise exception 'forbidden';
  end if;
  loop
    v_ref := 'FS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.incidents (org_id, reference_code, mode, category, severity, description, location_text)
      values (p_org, v_ref, p_mode, p_category, p_severity, p_description, nullif(btrim(coalesce(p_location, '')), ''))
      returning incidents.id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 1 then raise; end if;
    end;
  end loop;
  insert into public.incident_reporters (incident_id, reporter_id) values (v_id, auth.uid());
  insert into public.incident_events (incident_id, kind, to_status, actor_kind, actor_id)
  values (v_id, 'status', 'submitted', 'reporter', auth.uid());
  return query select v_id, v_ref;
end $$;

-- No membership check here: the server already verified it with the user-scoped client.
-- No incident_reporters row is ever written, and the event time is truncated to the day.
create function public.submit_anonymous_incident(
  p_org uuid, p_category public.incident_category, p_severity public.incident_severity,
  p_description text, p_location text, p_token_hash text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ref text; v_try int := 0;
begin
  loop
    v_ref := 'FS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.incidents (org_id, reference_code, mode, category, severity, description, location_text, tracking_token_hash)
      values (p_org, v_ref, 'anonymous', p_category, p_severity, p_description,
              nullif(btrim(coalesce(p_location, '')), ''), p_token_hash)
      returning incidents.id into v_id;
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 1 then raise; end if;
    end;
  end loop;
  insert into public.incident_events (incident_id, kind, to_status, actor_kind, actor_id, created_at)
  values (v_id, 'status', 'submitted', 'reporter', null, date_trunc('day', now()));
  return v_ref;
end $$;

create function public.transition_incident(
  p_incident uuid, p_to public.incident_status, p_body text, p_visible boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_from public.incident_status; v_body text := btrim(coalesce(p_body, ''));
begin
  select i.org_id, i.status into v_org, v_from from public.incidents i where i.id = p_incident for update;
  if not found then raise exception 'forbidden'; end if;
  if not public.has_org_role(v_org, '{investigator}') then raise exception 'forbidden'; end if;
  if not ((v_from::text || '>' || p_to::text) = any (array[
    'submitted>acknowledged', 'acknowledged>investigating', 'reopened>investigating',
    'investigating>action_taken', 'action_taken>resolved',
    'submitted>closed_no_action', 'acknowledged>closed_no_action', 'investigating>closed_no_action'])) then
    raise exception 'invalid_transition';
  end if;
  if p_to in ('action_taken', 'resolved', 'closed_no_action') and char_length(v_body) < 10 then
    raise exception 'body_required';
  end if;
  update public.incidents set status = p_to, updated_at = now() where id = p_incident;
  insert into public.incident_events (incident_id, kind, from_status, to_status, body, actor_kind, actor_id, visible_to_reporter)
  values (p_incident, 'status', v_from, p_to, nullif(v_body, ''), 'investigator', auth.uid(), coalesce(p_visible, true));
end $$;

-- internal: callable only from the definer functions below (no grants)
create function public._reporter_action(p_incident uuid, p_action text, p_body text, p_actor uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_status public.incident_status; v_body text := btrim(coalesce(p_body, ''));
begin
  select i.status into v_status from public.incidents i where i.id = p_incident for update;
  if not found then raise exception 'not_found'; end if;

  if p_action = 'comment' then
    if char_length(v_body) < 1 then raise exception 'body_required'; end if;
    insert into public.incident_events (incident_id, kind, body, actor_kind, actor_id, visible_to_reporter)
    values (p_incident, 'comment', v_body, 'reporter', p_actor, true);

  elsif p_action = 'confirm' then
    if v_status <> 'resolved' then raise exception 'invalid_transition'; end if;
    insert into public.incident_events (incident_id, kind, from_status, to_status, body, actor_kind, actor_id, visible_to_reporter)
    values (p_incident, 'confirmed', v_status, v_status, nullif(v_body, ''), 'reporter', p_actor, true);

  elsif p_action = 'reopen' then
    if v_status not in ('resolved', 'closed_no_action') then raise exception 'invalid_transition'; end if;
    if char_length(v_body) < 10 then raise exception 'body_required'; end if;
    update public.incidents set status = 'reopened', updated_at = now() where id = p_incident;
    insert into public.incident_events (incident_id, kind, from_status, to_status, body, actor_kind, actor_id, visible_to_reporter)
    values (p_incident, 'status', v_status, 'reopened', v_body, 'reporter', p_actor, true);

  elsif p_action = 'escalate' then
    if v_status = 'escalated' then raise exception 'invalid_transition'; end if;
    update public.incidents set status = 'escalated', updated_at = now() where id = p_incident;
    insert into public.incident_events (incident_id, kind, from_status, to_status, body, actor_kind, actor_id, visible_to_reporter)
    values (p_incident, 'status', v_status, 'escalated', nullif(v_body, ''), 'reporter', p_actor, true);

  else
    raise exception 'invalid_action';
  end if;
end $$;

create function public.reporter_respond(p_incident uuid, p_action text, p_body text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_reporter(p_incident) then raise exception 'forbidden'; end if;
  perform public._reporter_action(p_incident, p_action, p_body, auth.uid());
end $$;

create function public.anonymous_respond(p_token_hash text, p_action text, p_body text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select i.id into v_id from public.incidents i where i.tracking_token_hash = p_token_hash;
  if not found then raise exception 'not_found'; end if;
  perform public._reporter_action(v_id, p_action, p_body, null);
end $$;

create function public.get_incident_by_token(p_token_hash text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'reference_code', i.reference_code, 'category', i.category, 'severity', i.severity,
    'status', i.status, 'submitted_on', i.submitted_on, 'mode', i.mode,
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('kind', e.kind, 'to_status', e.to_status, 'body', e.body, 'created_at', e.created_at)
                       order by e.created_at, e.id)
      from public.incident_events e where e.incident_id = i.id and e.visible_to_reporter), '[]'::jsonb))
  into v
  from public.incidents i where i.tracking_token_hash = p_token_hash;
  return v;
end $$;

create function public.transition_dispute(p_dispute uuid, p_to public.dispute_status, p_body text)
returns void
language plpgsql security definer set search_path = public as $$
declare d public.wage_disputes; v_side text; v_pair text; v_body text := btrim(coalesce(p_body, ''));
begin
  select * into d from public.wage_disputes w where w.id = p_dispute for update;
  if not found then raise exception 'forbidden'; end if;
  if d.worker_id = auth.uid() then v_side := 'worker';
  elsif public.has_org_role(d.org_id, '{payroll,org_admin}') then v_side := 'employer';
  else raise exception 'forbidden';
  end if;
  v_pair := d.status::text || '>' || p_to::text;
  if v_side = 'worker' and not (v_pair = any (array[
    'responded>accepted_by_worker', 'responded>challenged', 'responded>escalated', 'challenged>escalated',
    'submitted>withdrawn', 'acknowledged>withdrawn', 'responded>withdrawn', 'challenged>withdrawn'])) then
    raise exception 'invalid_transition';
  end if;
  if v_side = 'employer' and not (v_pair = any (array[
    'submitted>acknowledged', 'acknowledged>responded', 'challenged>responded', 'accepted_by_worker>resolved'])) then
    raise exception 'invalid_transition';
  end if;
  if p_to in ('responded', 'challenged', 'resolved') and char_length(v_body) < 10 then
    raise exception 'body_required';
  end if;
  update public.wage_disputes set status = p_to, updated_at = now() where id = p_dispute;
  insert into public.dispute_events (dispute_id, from_status, to_status, body, actor_kind, actor_id)
  values (p_dispute, d.status, p_to, nullif(v_body, ''), v_side, auth.uid());
end $$;

create function public.incident_insights(p_org uuid)
returns table(category text, open_count int, closed_count int, total int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_org_role(p_org, '{org_admin,investigator}') then raise exception 'forbidden'; end if;
  return query
  with g as (
    select i.category::text as cat,
           (count(*) filter (where i.status not in ('resolved', 'closed_no_action')))::int as o,
           (count(*) filter (where i.status in ('resolved', 'closed_no_action')))::int as c,
           count(*)::int as t
    from public.incidents i where i.org_id = p_org group by i.category),
  hidden as (
    select 'small_groups_hidden'::text as cat, coalesce(sum(g.o), 0)::int as o,
           coalesce(sum(g.c), 0)::int as c, coalesce(sum(g.t), 0)::int as t
    from g where g.t < 5)
  select x.cat, x.o, x.c, x.t from (
    select g.cat, g.o, g.c, g.t from g where g.t >= 5
    union all
    select h.cat, h.o, h.c, h.t from hidden h where h.t >= 5) x
  order by x.t desc, x.cat;
end $$;

create function public.log_export(p_categories text[])
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  insert into public.audit_events (actor_id, subject_worker_id, table_name, action, changed)
  values (auth.uid(), auth.uid(), 'export', 'export', jsonb_build_object('categories', to_jsonb(p_categories)));
end $$;

create function public.join_org(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  select o.id into v_org from public.organisations o where o.join_code = p_code;
  if not found then raise exception 'invalid_code'; end if;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'worker')
  on conflict (org_id, user_id, role) do update set status = 'active', ended_on = null;
  return v_org;
end $$;

-- Postgres grants EXECUTE to PUBLIC by default; Supabase also grants it to anon/authenticated. Lock down, then allow-list.
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.submit_incident(uuid, public.incident_mode, public.incident_category, public.incident_severity, text, text),
  public.transition_incident(uuid, public.incident_status, text, boolean),
  public.reporter_respond(uuid, text, text),
  public.transition_dispute(uuid, public.dispute_status, text),
  public.incident_insights(uuid),
  public.log_export(text[]),
  public.join_org(text),
  public.has_org_role(uuid, public.member_role[]),
  public.is_staff_for_user(uuid),
  public.is_reporter(uuid)
to authenticated;

grant execute on function
  public.submit_anonymous_incident(uuid, public.incident_category, public.incident_severity, text, text, text),
  public.anonymous_respond(text, text, text),
  public.get_incident_by_token(text)
to service_role;
