import { defineConfig, devices } from '@playwright/test';

// Journeys run on a 360×740 phone viewport; the accessibility checks also run on a 1280×800 desktop.
// Port 3100 keeps clear of other local projects. Run `pnpm db:reset` first: the specs expect the seeded demo data,
// and `pnpm build` first: the web server below is the production build.
const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 360, height: 740 } } },
    { name: 'desktop', testMatch: /a11y/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
});
