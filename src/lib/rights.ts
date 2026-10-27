import 'server-only';
import fs from 'node:fs';
import path from 'node:path';

export type RightsCard = {
  slug: string;
  jurisdiction: 'IN';
  topics: string[];
  title: { en: string; hi: string };
  body: { en: string; hi: string };
  sources: { label: string; url: string }[];
  lastChecked: string;
  verified: boolean;
};

/**
 * Curated cards from content/rights/*.json. No wage figures, thresholds, section numbers or helplines appear in them
 * unless a human verified them against an official page (`verified: true`). Today every card is generic and unverified.
 */
export function loadRightsCards(): RightsCard[] {
  const dir = path.join(process.cwd(), 'content', 'rights');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) as RightsCard)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export const loadRightsCard = (slug: string) => loadRightsCards().find((c) => c.slug === slug) ?? null;
