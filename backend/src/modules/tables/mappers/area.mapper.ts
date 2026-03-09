import { Area } from '../entities/area.entity';
import { AreaResponseDto } from '../dto/area-response.dto';

export class AreaMapper {
  static toResponse(area: Area): AreaResponseDto {
    return {
      id: area.id,
      name: area.name,
      restaurant_id: area.restaurant_id,
    };
  }
}
