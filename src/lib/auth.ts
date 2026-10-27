import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Database } from './supabase/database.types';

export type Role = Database['public']['Enums']['member_role'];
export const STAFF_ROLES: Role[] = ['supervisor', 'payroll', 'investigator', 'org_admin'];

export type Membership = {
  id: string;
  org_id: string;
  role: Role;
  org: { id: string; name: string; sector: 'construction' | 'healthcare'; is_demo: boolean };
};

export type Ctx = {
  userId: string;
  email: string;
  displayName: string;
  locale: 'en' | 'hi';
  memberships: Membership[];
};

/** The signed-in user (verified with the auth server via getUser), their profile and active memberships. */
export const getCtx = cache(async (): Promise<Ctx | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [profile, ms] = await Promise.all([
    supabase.from('profiles').select('display_name, preferred_locale').eq('id', user.id).single(),
    supabase
      .from('memberships')
      .select('id, org_id, role, organisations(id, name, sector, is_demo)')
      .eq('user_id', user.id)
      .eq('status', 'active'),
  ]);
  const memberships = (ms.data ?? []).map((m) => ({
    id: m.id,
    org_id: m.org_id,
    role: m.role,
    org: m.organisations as unknown as Membership['org'],
  }));
  return {
    userId: user.id,
    email: user.email ?? '',
    displayName: profile.data?.display_name ?? '',
    locale: profile.data?.preferred_locale === 'hi' ? 'hi' : 'en',
    memberships,
  };
});

export async function requireUser(): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect('/login');
  return ctx;
}

export const hasRole = (ctx: Ctx, roles: Role[]) => ctx.memberships.some((m) => roles.includes(m.role));
export const isStaff = (ctx: Ctx) => hasRole(ctx, STAFF_ROLES);

/** The first active membership with one of the roles, if any. */
export const membershipFor = (ctx: Ctx, roles: Role[]) => ctx.memberships.find((m) => roles.includes(m.role));
export const workerOrg = (ctx: Ctx) => membershipFor(ctx, ['worker']);

/** Review console sections and who may open them. UX only: the database enforces the same rules. */
export const REVIEW_SECTIONS: { href: string; key: string; roles: Role[] }[] = [
  { href: '/review/incidents', key: 'review.nav.incidents', roles: ['investigator'] },
  { href: '/review/disputes', key: 'review.nav.disputes', roles: ['payroll', 'org_admin'] },
  { href: '/review/payslips', key: 'review.nav.payslips', roles: ['payroll', 'org_admin'] },
  { href: '/review/attendance', key: 'review.nav.attendance', roles: ['supervisor', 'payroll', 'org_admin'] },
  { href: '/review/insights', key: 'review.nav.insights', roles: ['org_admin', 'investigator'] },
];

export const allowedSections = (ctx: Ctx) => REVIEW_SECTIONS.filter((s) => hasRole(ctx, s.roles));
