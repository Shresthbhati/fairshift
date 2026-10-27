import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route here is per-user and dynamic (cookies, RLS), so the scaffold's Cache Components /
  // partial prefetching are off: they would demand a Suspense boundary around each cookie read.
  cacheComponents: false,
  partialPrefetching: false,
  // Messages and rights cards are read from disk at request time (src/lib/locale.ts, src/lib/rights.ts).
  // Vercel's file tracing cannot see those dynamic paths, so ship the folders with every server function.
  outputFileTracingIncludes: { '/**': ['./messages/**/*', './content/**/*'] },
};

export default nextConfig;
