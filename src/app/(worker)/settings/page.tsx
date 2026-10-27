import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SettingsView } from './settings-view';

export default async function SettingsPage() {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: consent } = await supabase.from('consent_records').select('notice_version, given_at').eq('user_id', ctx.userId).order('given_at', { ascending: false }).limit(1).maybeSingle();
  return (
    <SettingsView
      name={ctx.displayName}
      email={ctx.email}
      consent={consent ? { version: consent.notice_version, at: consent.given_at } : null}
      workplaces={ctx.memberships.map((m) => ({ id: m.id, org: m.org.name, role: m.role }))}
    />
  );
}
