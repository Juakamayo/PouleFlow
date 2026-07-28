import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

export enum GenderDto {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  MIXED = 'MIXED',
}

export class CreateEventDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tournamentId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  weaponId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsEnum(GenderDto, { message: 'gender debe ser MALE, FEMALE o MIXED' })
  gender: GenderDto;
}
