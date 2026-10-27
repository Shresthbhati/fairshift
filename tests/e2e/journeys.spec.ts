import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { fileReport, login, logout, useLocale } from './helpers';

test.beforeEach(async ({ context }) => {
  await useLocale(context, 'en');
});

test('E2E-1 Ravi records a shift and finds the ₹2,100 overtime difference on his September payslip', async ({ page }) => {
  await login(page, 'ravi');
  await expect(page.getByRole('heading', { name: 'Namaste, Ravi Kumar' })).toBeVisible();

  await page.getByRole('button', { name: 'Start shift' }).click();
  await expect(page.getByText('Shift running since')).toBeVisible();
  await page.getByRole('button', { name: 'End shift' }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel(/unpaid break/i).selectOption('0');
  await dialog.getByRole('button', { name: 'End shift' }).click();
  await expect(page.getByText('No shift running')).toBeVisible();

  await page.goto('/pay');
  await expect(page.getByText('Estimate', { exact: true })).toBeVisible();

  await page.goto('/pay?month=2026-09');
  await expect(page.getByText('₹17,500.00').first()).toBeVisible();
  await page.getByRole('link', { name: 'Open payslip' }).click();
  await expect(page.getByText('Paid', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/₹2,100\.00 more for overtime/)).toBeVisible();
  await expect(page.getByText(/theft|fraud|illegal/i)).toHaveCount(0);
});

test('E2E-2 Meena reports confidentially; Farhan acknowledges; Meena sees the update', async ({ page }) => {
  await login(page, 'meena');
  const ref = await fileReport(page, { category: /harassment/i, mode: /^Confidential/, text: '[E2E] A colleague keeps making unwelcome remarks.' });
  await logout(page);

  await login(page, 'farhan');
  await page.goto('/review/incidents');
  await page.getByRole('link', { name: new RegExp(ref) }).click();
  await expect(page.getByTestId('identity-block')).toContainText('Meena Das');
  await page.getByText('Acknowledge', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Note' }).fill('Received. An investigator will contact you.');
  await page.getByRole('button', { name: 'Save step' }).click();
  await expect(page.getByText('Case updated')).toBeVisible();
  await logout(page);

  await login(page, 'meena');
  await page.goto(`/report/${ref}`);
  await expect(page.getByText('Received. An investigator will contact you.')).toBeVisible();
});

test('E2E-3 Ravi reports anonymously; the tracker works; Anita sees no identity; Suresh is blocked', async ({ page, browser }) => {
  await login(page, 'ravi');
  const ref = await fileReport(page, { category: /physical hazard/i, mode: /^Anonymous/, text: '[E2E] A guard rail is missing on the second floor.' });
  const token = (await page.getByTestId('tracking-token').textContent())!.trim();
  expect(token.length).toBeGreaterThan(30);

  // a stranger with only the code: no account, no cookies
  const stranger = await browser.newContext({ baseURL: page.url().split('/report')[0] });
  await useLocale(stranger, 'en');
  const tracker = await stranger.newPage();
  await tracker.goto('/track');
  await tracker.getByLabel('Reference code').fill(ref);
  await tracker.getByLabel('Tracking code').fill(token);
  await tracker.getByRole('button', { name: 'Check status' }).click();
  await expect(tracker.getByText('Sent').first()).toBeVisible();
  await tracker.close();
  await stranger.close();

  await logout(page);
  await login(page, 'anita');
  await page.goto('/review/incidents');
  await page.getByRole('link', { name: new RegExp(ref) }).click();
  await expect(page.getByTestId('identity-block')).toContainText('No identity stored');
  await logout(page);

  await login(page, 'suresh');
  await page.goto('/review/incidents');
  await expect(page.getByText(/This area is for investigator accounts/)).toBeVisible();
});

test('E2E-4 Ravi stores a document privately and exports his records', async ({ page }) => {
  await login(page, 'ravi');
  await page.goto('/vault');
  await page.getByRole('button', { name: 'Upload a document' }).click();
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  await page.getByLabel('File', { exact: true }).setInputFiles({ name: 'any-name.png', mimeType: 'image/png', buffer: pdf }); // wrong name and type on purpose
  await page.getByRole('textbox', { name: 'Title', exact: true }).fill('E2E contract copy');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('E2E contract copy')).toBeVisible();
  await expect(page.getByText('Self-reported').first()).toBeVisible();

  await page.goto('/vault/export');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download data (JSON)' }).click()]);
  const json = JSON.parse(fs.readFileSync((await download.path()) as string, 'utf8'));
  expect(Object.keys(json)).toEqual(expect.arrayContaining(['generatedAt', 'generatedFor', 'disclaimer', 'categories', 'records']));
  expect(json.generatedFor).toBe('Ravi Kumar');
  expect(json.records.documents.some((d: { title: string }) => d.title === 'E2E contract copy')).toBe(true);
});

test('E2E-5 a payslip question: payroll can resolve only after the worker accepts', async ({ page }) => {
  await login(page, 'ravi');
  await page.goto('/pay?month=2026-09');
  await page.getByRole('link', { name: 'Open payslip' }).click();
  await page.getByRole('button', { name: 'Ask about this difference' }).click();
  await page.getByLabel(/what would you like to ask/i).fill('Six long days of overtime are missing from my payslip.');
  await page.getByRole('button', { name: 'Send question' }).click();
  await expect(page.getByRole('heading', { name: 'Your question about this payslip' })).toBeVisible();
  const disputeUrl = page.url();
  await logout(page);

  await login(page, 'priya');
  await page.goto('/review/disputes');
  await page.getByRole('link', { name: /Ravi Kumar/ }).first().click();
  await expect(page.getByText(/only after the worker accepts/)).toBeVisible();
  await page.getByRole('button', { name: 'Acknowledge' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  await page.getByRole('textbox', { name: /Note/ }).fill('We checked the register and will correct it.');
  await page.getByRole('button', { name: 'Send reply' }).click();
  await expect(page.getByText('Waiting for the worker')).toBeVisible();
  await logout(page);

  await login(page, 'ravi');
  await page.goto(disputeUrl);
  await page.getByRole('button', { name: 'Accept the reply' }).click();
  await expect(page.getByText('You accepted').first()).toBeVisible();
  await logout(page);

  await login(page, 'priya');
  await page.goto('/review/disputes');
  await page.getByRole('link', { name: /Ravi Kumar/ }).first().click();
  await page.getByRole('textbox', { name: /Note/ }).fill('Difference will be paid with the next run.');
  await page.getByRole('button', { name: 'Mark resolved' }).click();
  await expect(page.getByText('Resolved').first()).toBeVisible();
});

test('E2E-6 Hindi: the language switch changes the home screen and the page language', async ({ page, context }) => {
  await useLocale(context, 'en');
  await login(page, 'meena');
  await expect(page.getByText('Check my wages')).toBeVisible();
  await page.getByRole('button', { name: 'हिन्दी' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
  await expect(page.getByText('मेरी मज़दूरी जाँचें')).toBeVisible();
  await expect(page.getByText('समस्या बताएँ').first()).toBeVisible();
  await expect(page.getByText('Check my wages')).toHaveCount(0); // nothing left in English on the tiles
});
