import { Injectable } from '@nestjs/common';
import { MenuItem } from '../entities/menu-item.entity';
import { GetMenuItemsDto } from '../dto/get-menu-items.dto';
import { QuerySpec } from './specs/query-spec.interface';
import { SearchSpec } from './specs/search.query-spec';
import { CategorySpec } from './specs/category.query-spec';
import { SalesStatusSpec } from './specs/sales-status.query-spec';
import { PriceRangeSpec } from './specs/price-range.query-spec';
import { PosModeSpec } from './specs/pos-mode.query-spec';
import { StockStatusSpec } from './specs/stock-status.query-spec';

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
