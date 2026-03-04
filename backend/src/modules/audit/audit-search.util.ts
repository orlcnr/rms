import { ExportAuditLogsDto } from './dto/export-audit-logs.dto';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

type SearchFilters = GetAuditLogsDto | ExportAuditLogsDto;

export function buildAuditSearchQuery(filters: SearchFilters) {
  const must: Record<string, unknown>[] = [];

  if (filters.restaurant_id) {
    must.push({ term: { 'restaurant_id.keyword': filters.restaurant_id } });
  }

  if (filters.user_name) {
    must.push({
      match: { user_name: { query: filters.user_name, operator: 'and' } },
    });
  }

  if (filters.action) {
    must.push({ match: { action: filters.action } });
  }

  if (filters.resource) {
    must.push({ term: { 'resource.keyword': filters.resource } });
  }

  if (filters.payload_text) {
    must.push({
      simple_query_string: {
        query: filters.payload_text,
        fields: [
          'payload_summary^3',
          'payload._summary^3',
          'changes_before_summary^2',
          'changes_after_summary^2',
          'payload.*',
          'changes.before.*',
          'changes.after.*',
        ],
        default_operator: 'and',
        lenient: true,
      },
    });
  }

  if (filters.start_date || filters.end_date) {
    const range: Record<string, string> = {};

    if (filters.start_date) {
      range.gte = filters.start_date;
    }

    if (filters.end_date) {
      range.lte = filters.end_date;
    }

    must.push({ range: { timestamp: range } });
  }

  return must.length > 0 ? { bool: { must } } : { match_all: {} };
}
