import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateRegistrationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seedRank?: number;
}
