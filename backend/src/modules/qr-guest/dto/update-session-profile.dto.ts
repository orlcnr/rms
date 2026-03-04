import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSessionProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;
}
