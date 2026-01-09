import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateTipoVehiculoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsInt()
  @Min(1)
  capacidadPasajeros: number;

  @IsString()
  @IsOptional()
  categoria?: string;
}

export class UpdateTipoVehiculoDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacidadPasajeros?: number;

  @IsString()
  @IsOptional()
  categoria?: string;
}
