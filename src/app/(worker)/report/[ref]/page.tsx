import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { REFERENCE_RE } from '../schemas';
import { CaseView } from './case-view';

export default async function ReportCasePage({ params }: { params: Promise<{ ref: string }> }) {
  const ref = (await params).ref.toUpperCase();
  if (!REFERENCE_RE.test(ref)) notFound();
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data: inc } = await supabase.from('incidents').select('*').eq('reference_code', ref).maybeSingle();
  const { data: mine } = inc
    ? await supabase.from('incident_reporters').select('reporter_id').eq('incident_id', inc.id).maybeSingle()
    : { data: null };
  // This is the reporter's own view; investigators use /review/incidents/[id] instead.
  if (!inc || mine?.reporter_id !== ctx.userId) notFound();

  const [events, files] = await Promise.all([
    supabase
      .from('incident_events')
      .select('id, kind, to_status, body, actor_kind, created_at')
      .eq('incident_id', inc.id)
      .eq('visible_to_reporter', true)
      .order('created_at')
      .order('id'),
    supabase.from('incident_attachments').select('id, mime_type, size_bytes, created_at').eq('incident_id', inc.id).order('created_at'),
  ]);

  return (
    <CaseView
      incident={{ id: inc.id, reference: inc.reference_code, category: inc.category, severity: inc.severity, mode: inc.mode, status: inc.status, description: inc.description, location: inc.location_text, date: inc.submitted_on }}
      events={(events.data ?? []).map((e) => ({ id: e.id, kind: e.kind, to: e.to_status, body: e.body, actor: e.actor_kind, at: e.created_at }))}
      files={(files.data ?? []).map((f) => ({ id: f.id, mime: f.mime_type, size: f.size_bytes }))}
    />
  );
}
