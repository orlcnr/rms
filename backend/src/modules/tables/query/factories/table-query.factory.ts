import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Table } from '../../entities/table.entity';
import { GetTablesDto } from '../../dto/get-tables.dto';
import { TableScopeSpec } from '../specs/table/table-scope.spec';
import { TableAreaSpec } from '../specs/table/table-area.spec';
import { TableSearchSpec } from '../specs/table/table-search.spec';
import { TableStatusDbSpec } from '../specs/table/table-status-db.spec';

@Injectable()
export class TableQueryFactory {
  create(
    filters: GetTablesDto,
    context: { restaurantId: string },
  ): QuerySpec<Table>[] {
    const specs: QuerySpec<Table>[] = [
      new TableScopeSpec(context.restaurantId),
    ];

    if (filters.area_id) {
      specs.push(new TableAreaSpec(filters.area_id));
    }

    if (filters.search) {
      specs.push(new TableSearchSpec(filters.search));
    }

    if (filters.status) {
      specs.push(new TableStatusDbSpec(filters.status));
    }

    return specs;
  }
}
