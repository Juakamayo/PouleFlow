import { IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFencerDto {
  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clubId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nationalRank?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  internationalRank?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  points?: number;
}
