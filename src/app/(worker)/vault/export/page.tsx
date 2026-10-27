import { requireUser } from '@/lib/auth';
import { countRecords } from '@/lib/records';
import { createClient } from '@/lib/supabase/server';
import { ExportView } from './export-view';

export default async function ExportPage() {
  const ctx = await requireUser();
  const counts = await countRecords(await createClient(), ctx.userId);
  return <ExportView counts={counts} />;
}
