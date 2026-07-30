import { IsObject, IsOptional } from 'class-validator';

export class UpdateTableauConfigDto {
  @IsObject()
  @IsOptional()
  roundConfigs?: Record<number, number>;
}
