import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @Length(2, 150)
  name: string;

  @IsInt()
  @Min(1)
  countryId: number;
}
