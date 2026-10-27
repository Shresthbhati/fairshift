import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/auth';
import { SignupView } from './signup-view';

export default async function SignupPage() {
  if (await getCtx()) redirect('/');
  return <SignupView />;
}
