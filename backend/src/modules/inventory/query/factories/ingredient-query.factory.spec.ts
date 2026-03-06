import { IngredientQueryFactory } from './ingredient-query.factory';
import { StockStatus } from '../../enums/stock-status.enum';

describe('IngredientQueryFactory', () => {
  it('should always include scope spec and add optional specs', () => {
    const factory = new IngredientQueryFactory();

    const specs = factory.create(
      {
        name: 'domates',
        status: StockStatus.CRITICAL,
      },
      {
        restaurantId: 'branch-1',
        brandId: 'brand-1',
      },
    );

    expect(specs.length).toBe(3);
  });

  it('should include only scope spec when no filters provided', () => {
    const factory = new IngredientQueryFactory();
    const specs = factory.create(
      {},
      {
        restaurantId: 'branch-1',
      },
    );

    expect(specs.length).toBe(1);
  });
});
