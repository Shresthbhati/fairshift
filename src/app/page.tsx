import { redirect } from 'next/navigation';
import { hasRole, isStaff, requireUser } from '@/lib/auth';

// Workers (and people with no role yet) land on Home; staff-only accounts land on the review console.
export default async function Root() {
  const ctx = await requireUser();
  if (isStaff(ctx) && !hasRole(ctx, ['worker'])) redirect('/review');
  redirect('/home');
}
