import { DashboardOverview } from '@/modules/dashboard/components/DashboardOverview';
import { getDashboardStats } from '@/modules/dashboard/service';

export default async function DashboardPage() {
  const data = await getDashboardStats();
  return <DashboardOverview data={data} />;
}
