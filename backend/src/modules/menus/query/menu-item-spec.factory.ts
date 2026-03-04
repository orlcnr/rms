import { Injectable } from '@nestjs/common';
import { MenuItem } from '../entities/menu-item.entity';
import { GetMenuItemsDto } from '../dto/get-menu-items.dto';
import { QuerySpec } from './specs/query-spec.interface';
import { SearchSpec } from './specs/search.spec';
import { CategorySpec } from './specs/category.spec';
import { SalesStatusSpec } from './specs/sales-status.spec';
import { PriceRangeSpec } from './specs/price-range.spec';
import { PosModeSpec } from './specs/pos-mode.spec';
import { StockStatusSpec } from './specs/stock-status.spec';

@Injectable()
export class MenuItemSpecFactory {
  create(queryDto: GetMenuItemsDto): QuerySpec<MenuItem>[] {
    const specs: QuerySpec<MenuItem>[] = [];

    if (queryDto.search) {
      specs.push(new SearchSpec(queryDto.search));
    }

    if (queryDto.categoryId) {
      specs.push(new CategorySpec(queryDto.categoryId));
    }

    specs.push(new SalesStatusSpec(queryDto.salesStatus));
    specs.push(new PriceRangeSpec(queryDto.minPrice, queryDto.maxPrice));

    if (queryDto.posMode) {
      specs.push(new PosModeSpec());
    } else {
      specs.push(new StockStatusSpec(queryDto.stockStatus));
    }

    return specs;
  }
}
