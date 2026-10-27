import { beforeEach, describe, expect, it } from 'vitest';
import { rateLimit, resetRateLimits } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(resetRateLimits);

  it('allows up to max hits per window, then blocks', () => {
    for (let i = 0; i < 5; i++) expect(rateLimit('u1', 5, 1000, i)).toBe(true);
    expect(rateLimit('u1', 5, 1000, 10)).toBe(false);
  });

  it('counts each key separately and forgets hits once the window passes', () => {
    for (let i = 0; i < 5; i++) rateLimit('u1', 5, 1000, i);
    expect(rateLimit('u2', 5, 1000, 10)).toBe(true);
    expect(rateLimit('u1', 5, 1000, 1500)).toBe(true);
  });
});
