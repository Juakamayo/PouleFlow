import { IsString, Length } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(3, 3, { message: 'iocCode debe ser el código IOC de 3 letras (ej. CHI, ARG, FRA)' })
  iocCode: string;
}
