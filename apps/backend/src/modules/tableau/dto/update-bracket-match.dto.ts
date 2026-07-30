import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateBracketMatchDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  scoreA?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  scoreB?: number;

  @IsInt()
  @IsOptional()
  winnerId?: number | null;
}
