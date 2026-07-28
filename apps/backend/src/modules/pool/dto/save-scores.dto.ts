import { IsArray, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BoutScoreDto {
  @IsInt()
  fencerAId: number;

  @IsInt()
  fencerBId: number;

  @IsInt()
  scoreA: number;

  @IsInt()
  scoreB: number;

  @IsInt()
  boutOrder: number;
}

export class SaveScoresDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoutScoreDto)
  bouts: BoutScoreDto[];
}