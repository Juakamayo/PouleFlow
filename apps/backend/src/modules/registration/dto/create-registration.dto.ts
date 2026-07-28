import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateRegistrationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fencerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  seedRank?: number;
}
