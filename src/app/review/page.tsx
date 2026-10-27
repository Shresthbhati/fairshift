import { redirect } from 'next/navigation';
import { allowedSections, requireUser } from '@/lib/auth';

export default async function ReviewIndex() {
  const ctx = await requireUser();
  const first = allowedSections(ctx)[0];
  if (!first) redirect('/home'); // no staff role at all
  redirect(first.href);
}
