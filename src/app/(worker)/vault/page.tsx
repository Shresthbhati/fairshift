import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { VaultView } from './vault-view';

export default async function VaultPage() {
  const ctx = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from('evidence_documents')
    .select('id, kind, title, mime_type, size_bytes, verification, created_at')
    .eq('owner_id', ctx.userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  return (
    <VaultView
      docs={(data ?? []).map((d) => ({ id: d.id, kind: d.kind, title: d.title, mime: d.mime_type, size: d.size_bytes, verification: d.verification, at: d.created_at }))}
    />
  );
}
