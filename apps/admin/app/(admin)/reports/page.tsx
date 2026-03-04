import { ReportsOverview } from '@/modules/reports/components/ReportsOverview';
import { reportsSearchSchema } from '@/modules/reports/schemas';
import { getReportsData } from '@/modules/reports/service';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: {
    topN?: string;
    search?: string;
    is_active?: 'all' | 'active' | 'suspended';
    start_date?: string;
    end_date?: string;
  };
}) {
  const filters = reportsSearchSchema.parse({
    search: searchParams?.search,
    is_active: searchParams?.is_active,
    start_date: searchParams?.start_date,
    end_date: searchParams?.end_date,
    topN: searchParams?.topN,
  });
  const topN = filters.topN;
  const { overview, activity } = await getReportsData({
    search: filters.search,
    status: filters.is_active,
    start_date: filters.start_date,
    end_date: filters.end_date,
    topN,
  });
  return (
    <ReportsOverview
      overview={overview}
      activity={activity}
      topN={topN}
      filters={{
        search: filters.search,
        is_active: filters.is_active,
        start_date: filters.start_date,
        end_date: filters.end_date,
      }}
    />
  );
}
