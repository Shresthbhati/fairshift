import { requireUser } from '@/lib/auth';
import { CATEGORIES } from '../schemas';
import { ReportWizard } from './report-wizard';

export default async function NewReportPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const ctx = await requireUser();
  const { category } = await searchParams;
  const initial = (CATEGORIES as readonly string[]).includes(category ?? '') ? (category as (typeof CATEGORIES)[number]) : '';
  return <ReportWizard hasOrg={ctx.memberships.length > 0} initialCategory={initial} />;
}
