import { IsInt, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRefereeDto {
  @IsString()
  @Length(1, 100)
  firstName: string;

  @IsString()
  @Length(1, 100)
  lastName: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  countryId: number;
}
