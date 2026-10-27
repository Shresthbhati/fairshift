import type { NextRequest } from 'next/server';
import { EXPORT_DISCLAIMER, collectRecords, parseCategories } from '@/lib/records';
import { createClient } from '@/lib/supabase/server';

/** GET /vault/export/download?c=shifts,payslips → the person's own records as a JSON file. Logged in audit_events. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const categories = parseCategories(request.nextUrl.searchParams.get('c'));
  if (categories.length === 0) return new Response('Choose at least one category', { status: 400 });

  const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
  const records = await collectRecords(supabase, user.id, categories);
  await supabase.rpc('log_export', { p_categories: categories });

  const body = {
    generatedAt: new Date().toISOString(),
    generatedFor: profile?.display_name ?? '',
    disclaimer: EXPORT_DISCLAIMER,
    categories,
    records,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="fairshift-records.json"',
      'Cache-Control': 'no-store',
    },
  });
}
