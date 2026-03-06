import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { GetStockMovementsDto } from '../../dto/get-stock-movements.dto';
import { StockMovement } from '../../entities/stock-movement.entity';
import { MovementBranchScopeSpec } from '../specs/movement/movement-branch-scope.spec';
import { MovementDateRangeSpec } from '../specs/movement/movement-date-range.spec';
import { MovementIngredientNameSpec } from '../specs/movement/movement-ingredient-name.spec';
import { MovementTypeSpec } from '../specs/movement/movement-type.spec';

@Injectable()
export class MovementQueryFactory {
  create(
    dto: GetStockMovementsDto,
    context: { branchId: string },
  ): QuerySpec<StockMovement>[] {
    const specs: QuerySpec<StockMovement>[] = [
      new MovementBranchScopeSpec(context.branchId),
      new MovementDateRangeSpec(dto.startDate, dto.endDate),
    ];

    if (dto.ingredientName) {
      specs.push(new MovementIngredientNameSpec(dto.ingredientName));
    }
    if (dto.type) {
      specs.push(new MovementTypeSpec(dto.type));
    }

    return specs;
  }
}
