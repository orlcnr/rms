import { Injectable } from '@nestjs/common';
import { QuerySpec } from '../../../../common/query/query-spec.interface';
import { GetIngredientsDto } from '../../dto/get-ingredients.dto';
import { Ingredient } from '../../entities/ingredient.entity';
import { IngredientNameSpec } from '../specs/ingredient/ingredient-name.spec';
import {
  IngredientScopeContext,
  IngredientScopeSpec,
} from '../specs/ingredient/ingredient-scope.spec';
import { IngredientStatusSpec } from '../specs/ingredient/ingredient-status.spec';

@Injectable()
export class IngredientQueryFactory {
  create(
    dto: GetIngredientsDto,
    context: IngredientScopeContext & { quantityExpr?: string },
  ): QuerySpec<Ingredient>[] {
    const quantityExpr =
      context.quantityExpr ||
      (context.brandId
        ? 'COALESCE(branch_stock.quantity, 0)'
        : 'COALESCE(branch_stock.quantity, COALESCE(stock.quantity, 0))');

    const specs: QuerySpec<Ingredient>[] = [new IngredientScopeSpec(context)];

    if (dto.name) {
      specs.push(new IngredientNameSpec(dto.name));
    }
    if (dto.status) {
      specs.push(new IngredientStatusSpec(dto.status, quantityExpr));
    }

    return specs;
  }
}
