import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { Area } from '../../entities/area.entity';
import { GetAreasDto } from '../../dto/get-areas.dto';
import { AreaScopeSpec } from '../specs/area/area-scope.spec';
import { AreaSearchSpec } from '../specs/area/area-search.spec';

@Injectable()
export class AreaQueryFactory {
  create(
    filters: GetAreasDto,
    context: { restaurantId: string },
  ): QuerySpec<Area>[] {
    const specs: QuerySpec<Area>[] = [new AreaScopeSpec(context.restaurantId)];

    if (filters.search) {
      specs.push(new AreaSearchSpec(filters.search));
    }

    return specs;
  }
}
