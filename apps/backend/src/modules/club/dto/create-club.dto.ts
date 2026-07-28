import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @Length(2, 150)
  name: string;

  @IsString()
  @Length(2, 10, { message: 'shortCode debe tener entre 2 y 10 caracteres (ej. ASTAR, CESJ)' })
  shortCode: string;

  @IsInt()
  @Min(1)
  countryId: number;
}
