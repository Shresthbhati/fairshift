import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { collectRecords, parseCategories } from '@/lib/records';
import { createClient } from '@/lib/supabase/server';
import { StatementView } from './statement-view';

export default async function StatementPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await requireUser();
  const categories = parseCategories((await searchParams).c);
  if (categories.length === 0) redirect('/vault/export');
  const supabase = await createClient();
  const records = await collectRecords(supabase, ctx.userId, categories);
  await supabase.rpc('log_export', { p_categories: categories }); // the statement counts as an export too
  return <StatementView name={ctx.displayName} generatedAt={new Date().toISOString()} categories={categories} records={JSON.parse(JSON.stringify(records))} />;
}
