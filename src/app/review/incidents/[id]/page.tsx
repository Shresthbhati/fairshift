import { notFound } from 'next/navigation';
import { ForbiddenState } from '@/components/fs/primitives';
import { hasRole, requireUser } from '@/lib/auth';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { CaseView } from './case-view';

export default async function ReviewCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUser();
  const t = await getT();
  if (!hasRole(ctx, ['investigator'])) return <ForbiddenState roles={t('common.roles.investigator')} />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: inc } = await supabase.from('incidents').select('*').eq('id', id).maybeSingle();
  if (!inc) notFound();

  // Anonymous incidents have no reporter row at all: there is nothing to look up, by design.
  let reporterName: string | null = null;
  if (inc.mode !== 'anonymous') {
    const { data: rep } = await supabase.from('incident_reporters').select('reporter_id').eq('incident_id', inc.id).maybeSingle();
    if (rep) {
      const { data: p } = await supabase.from('profiles').select('display_name').eq('id', rep.reporter_id).maybeSingle();
      reporterName = p?.display_name ?? null;
    }
  }
  const [events, files] = await Promise.all([
    supabase.from('incident_events').select('id, kind, to_status, body, actor_kind, visible_to_reporter, created_at').eq('incident_id', inc.id).order('created_at').order('id'),
    supabase.from('incident_attachments').select('id, mime_type, size_bytes').eq('incident_id', inc.id).order('created_at'),
  ]);

  return (
    <CaseView
      incident={{ id: inc.id, reference: inc.reference_code, category: inc.category, severity: inc.severity, mode: inc.mode, status: inc.status, description: inc.description, location: inc.location_text, date: inc.submitted_on }}
      reporterName={reporterName}
      events={(events.data ?? []).map((e) => ({ id: e.id, to: e.to_status, body: e.body, actor: e.actor_kind, visible: e.visible_to_reporter, at: e.created_at }))}
      files={(files.data ?? []).map((f) => ({ id: f.id, mime: f.mime_type, size: f.size_bytes }))}
    />
  );
}
