import { IsOptional, IsEnum, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { StockStatus } from '../enums/stock-status.enum';

export class GetIngredientsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(StockStatus)
  status?: StockStatus;
}
