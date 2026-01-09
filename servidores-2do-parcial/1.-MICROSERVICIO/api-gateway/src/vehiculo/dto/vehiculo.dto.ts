import { IsString, IsNotEmpty, IsOptional, IsInt, IsUUID } from 'class-validator';

export class CreateVehiculoDto {
  @IsString()
  @IsNotEmpty()
  placa: string;

  @IsString()
  @IsNotEmpty()
  marca: string;

  @IsString()
  @IsNotEmpty()
  modelo: string;

  @IsInt()
  anio: number;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsUUID()
  @IsNotEmpty()
  tipoVehiculoId: string;

  @IsString()
  @IsOptional()
  numeroSerie?: string;
}

export class UpdateVehiculoDto {
  @IsString()
  @IsOptional()
  placa?: string;

  @IsString()
  @IsOptional()
  marca?: string;

  @IsString()
  @IsOptional()
  modelo?: string;

  @IsInt()
  @IsOptional()
  anio?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsUUID()
  @IsOptional()
  tipoVehiculoId?: string;

  @IsString()
  @IsOptional()
  numeroSerie?: string;
}
