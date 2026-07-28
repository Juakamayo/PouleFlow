import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  @Length(2, 200)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  location?: string;
}
