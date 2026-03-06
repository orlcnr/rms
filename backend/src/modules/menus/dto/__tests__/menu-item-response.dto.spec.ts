import { MenuItemResponseDto } from '../menu-item-response.dto';
import { MenuItem } from '../../entities/menu-item.entity';

function buildMenuItem(price: number): MenuItem {
  return {
    id: 'menu-item-1',
    name: 'Burger',
    description: 'Test',
    price,
    image_url: null,
    is_available: true,
    track_inventory: true,
    category_id: 'category-1',
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as MenuItem;
}

describe('MenuItemResponseDto', () => {
  it('should always populate effective_price in branch context when override exists', () => {
    const entity = buildMenuItem(150);

    const dto = MenuItemResponseDto.fromEntity(
      entity,
      undefined,
      120,
      { is_hidden: false, custom_price: 120 },
      { branchContext: true },
    );

    expect(dto.base_price).toBe(150);
    expect(dto.effective_price).toBe(120);
    expect(dto.price).toBe(120);
  });

  it('should fall back to base price when custom price is null in branch context', () => {
    const entity = buildMenuItem(150);

    const dto = MenuItemResponseDto.fromEntity(
      entity,
      undefined,
      null,
      { is_hidden: false, custom_price: null },
      { branchContext: true },
    );

    expect(dto.base_price).toBe(150);
    expect(dto.effective_price).toBe(150);
    expect(dto.price).toBe(150);
  });

  it('should keep effective_price non-null in branch context without override row', () => {
    const entity = buildMenuItem(175);

    const dto = MenuItemResponseDto.fromEntity(
      entity,
      undefined,
      undefined,
      undefined,
      { branchContext: true },
    );

    expect(dto.base_price).toBe(175);
    expect(dto.effective_price).toBe(175);
    expect(dto.price).toBe(175);
  });
});
