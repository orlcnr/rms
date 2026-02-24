import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RestaurantIdParamDto {
    @ApiProperty({
        format: 'uuid',
        description: 'Restaurant UUID v4 identifier'
    })
    @IsUUID('4', { message: 'Invalid restaurant ID format' })
    restaurantId: string;
}
