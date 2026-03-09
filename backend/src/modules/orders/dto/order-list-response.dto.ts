import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto';
import { OrderResponseDto } from './order-response.dto';

export class OrderListResponseDto {
  items: OrderResponseDto[];
  meta: PaginationMetaDto;
}
