import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { GetMenuItemsDto } from '../get-menu-items.dto';

describe('GetMenuItemsDto', () => {
  it('clamps limit to 100 when request value is greater than 100', () => {
    const dto = plainToInstance(GetMenuItemsDto, {
      page: 1,
      limit: 250,
    });

    const errors = validateSync(dto);

    expect(dto.limit).toBe(100);
    expect(errors).toHaveLength(0);
  });
});
