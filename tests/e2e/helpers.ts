import type { BrowserContext, Page } from '@playwright/test';

export type Who = 'ravi' | 'meena' | 'suresh' | 'priya' | 'anita' | 'deepak' | 'kavya' | 'farhan';

/** The app picks Hindi for Ravi from his profile; specs assert English unless they say otherwise. */
export async function useLocale(context: BrowserContext, locale: 'en' | 'hi' = 'en') {
  await context.addCookies([{ name: 'fs_locale', value: locale, domain: 'localhost', path: '/' }]);
}

const FIRST: Record<Who, string> = { ravi: 'Ravi', meena: 'Meena', suresh: 'Suresh', priya: 'Priya', anita: 'Anita', deepak: 'Deepak', kavya: 'Kavya', farhan: 'Farhan' };

/** Uses the DEMO account buttons, exactly like a judge would. */
export async function login(page: Page, who: Who) {
  await page.goto('/login');
  await page.getByRole('button', { name: new RegExp(`^${FIRST[who]} –`) }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL('**/login');
}

export const REF = /FS-[A-Z0-9]{8}/;

/** Walks the four-step report wizard and returns the reference code shown at the end. */
export async function fileReport(page: Page, opts: { category: RegExp; mode: RegExp; text: string }) {
  await page.goto('/report/new');
  await page.getByText(opts.category).first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByText(opts.mode).first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel(/what happened/i).fill(opts.text);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Send report' }).click();
  const ref = page.getByText(REF).first();
  await ref.waitFor();
  return (await ref.textContent())!.match(REF)![0];
}
