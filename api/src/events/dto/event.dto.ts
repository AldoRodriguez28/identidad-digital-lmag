import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateEventDto {
  @IsString() @IsNotEmpty() titulo: string;
  @IsString() @IsNotEmpty() descripcion: string;
  @IsIn(['deportivo', 'cultural', 'taller']) categoria: 'deportivo' | 'cultural' | 'taller';
  @IsDateString() fecha: string;
  @IsString() @IsNotEmpty() lugar: string;
  @IsInt() @Min(0) puntosOtorgados: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateEventDto {
  @IsOptional() @IsString() @IsNotEmpty() titulo?: string;
  @IsOptional() @IsString() @IsNotEmpty() descripcion?: string;
  @IsOptional() @IsIn(['deportivo', 'cultural', 'taller']) categoria?: 'deportivo' | 'cultural' | 'taller';
  @IsOptional() @IsDateString() fecha?: string;
  @IsOptional() @IsString() @IsNotEmpty() lugar?: string;
  @IsOptional() @IsInt() @Min(0) puntosOtorgados?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class CheckinDto {
  @IsString() @IsNotEmpty() credentialToken: string;
}
