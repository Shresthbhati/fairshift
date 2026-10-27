import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Integration tests share one local database, so files run one at a time.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
