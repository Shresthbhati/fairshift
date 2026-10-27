import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login, useLocale, type Who } from './helpers';

const PAGES: { path: string; who?: Who }[] = [
  { path: '/login' },
  { path: '/home', who: 'ravi' },
  { path: '/pay?month=2026-09', who: 'ravi' },
  { path: '/report/new', who: 'ravi' },
  { path: '/vault', who: 'ravi' },
  { path: '/review/incidents', who: 'anita' },
];

for (const p of PAGES) {
  test(`axe: ${p.path} has no serious or critical violations`, async ({ page, context }) => {
    await useLocale(context, 'en');
    if (p.who) await login(page, p.who);
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  });
}

test('no horizontal scroll at 360px on key worker pages', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'mobile', 'phone viewport only');
  await useLocale(context, 'en');
  await login(page, 'ravi');
  for (const path of ['/home', '/pay?month=2026-09', '/shifts', '/report', '/vault', '/rights', '/ledger']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(1);
  }
});
