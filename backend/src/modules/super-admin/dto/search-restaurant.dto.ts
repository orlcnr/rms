import { IsOptional, IsString, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchRestaurantDto {
    @ApiPropertyOptional({ description: 'Search by name or slug' })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by active status' })
    @IsOptional()
    @IsBoolean()
    @Type(() => Boolean)
    is_active?: boolean;

    @ApiPropertyOptional({ minimum: 1, default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ minimum: 1, default: 20 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Type(() => Number)
    limit?: number = 20;
}
