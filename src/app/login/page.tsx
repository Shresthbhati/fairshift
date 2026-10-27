import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/auth';
import { LoginView } from './login-view';

export default async function LoginPage() {
  if (await getCtx()) redirect('/');
  // Demo buttons only exist when NEXT_PUBLIC_DEMO_MODE=true; they fill the shared local demo password, nothing else.
  const demoPassword = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' ? (process.env.DEMO_PASSWORD ?? '') : null;
  return <LoginView demoPassword={demoPassword} />;
}
