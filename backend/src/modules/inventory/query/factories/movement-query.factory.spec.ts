import { MovementQueryFactory } from './movement-query.factory';
import { MovementType } from '../../entities/stock-movement.entity';

describe('MovementQueryFactory', () => {
  it('should include branch and date specs by default', () => {
    const factory = new MovementQueryFactory();
    const specs = factory.create({}, { branchId: 'branch-1' });

    expect(specs.length).toBe(2);
  });

  it('should include optional name and type specs when provided', () => {
    const factory = new MovementQueryFactory();
    const specs = factory.create(
      {
        ingredientName: 'domates',
        type: MovementType.IN,
      },
      { branchId: 'branch-1' },
    );

    expect(specs.length).toBe(4);
  });
});
