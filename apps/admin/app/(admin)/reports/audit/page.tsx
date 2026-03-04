import { AuditLogsTable } from '@/modules/audit/components/AuditLogsTable';
import { auditSearchSchema } from '@/modules/audit/schemas';
import { getAuditLogs } from '@/modules/audit/service';

export default async function AuditPage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
    action?: string;
    restaurant_id?: string;
    user_name?: string;
    resource?: string;
    page?: string;
    limit?: string;
    start_date?: string;
    end_date?: string;
  };
}) {
  const filters = auditSearchSchema.parse({
    search: searchParams?.search,
    action: searchParams?.action,
    restaurant_id: searchParams?.restaurant_id,
    user_name: searchParams?.user_name,
    resource: searchParams?.resource,
    page: searchParams?.page,
    limit: searchParams?.limit,
    start_date: searchParams?.start_date,
    end_date: searchParams?.end_date,
  });
  const data = await getAuditLogs(filters);
  return <AuditLogsTable data={data} filters={filters} />;
}
