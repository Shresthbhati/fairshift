import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route here is per-user and dynamic (cookies, RLS), so the scaffold's Cache Components /
  // partial prefetching are off: they would demand a Suspense boundary around each cookie read.
  cacheComponents: false,
  partialPrefetching: false,
};

export default nextConfig;
