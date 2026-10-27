import { requireUser } from '@/lib/auth';
import { buildLedger } from '@/lib/ledger';
import { getT } from '@/lib/locale';
import { createClient } from '@/lib/supabase/server';
import { LedgerView } from './ledger-view';

const PAGE = 50;

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await requireUser();
  const t = await getT();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { entries, hasMore } = await buildLedger(await createClient(), ctx.userId, t, t.locale, (page - 1) * PAGE, PAGE);
  return <LedgerView entries={entries} page={page} hasMore={hasMore} />;
}
