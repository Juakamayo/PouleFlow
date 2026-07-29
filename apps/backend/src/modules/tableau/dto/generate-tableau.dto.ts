import { IsInt, IsObject, IsOptional } from 'class-validator';

export class GenerateTableauDto {
  @IsInt()
  @IsOptional()
  targetSize?: number;

  @IsInt()
  @IsOptional()
  defaultTouches?: number; // Por defecto 15 (para rondas no especificadas)

  // Configuración opcional de toques por ronda numérica
  // Ej: { 4: 15, 2: 15 } especifica toques para semifinales y finales.
  @IsObject()
  @IsOptional()
  roundTouchesOverrides?: Record<number, number>; 
}