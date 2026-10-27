// In-memory sliding window. Single process only: fine for the local demo, replace with a shared store to scale out.
const hits = new Map<string, number[]>();

/** Returns true if the action is allowed (and records it), false once `max` hits fall inside the window. */
export function rateLimit(key: string, max: number, windowMs = 3_600_000, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export const resetRateLimits = () => hits.clear();
