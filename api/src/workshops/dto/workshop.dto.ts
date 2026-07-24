import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkshopDto {
  @IsString() @IsNotEmpty() titulo: string;
  @IsString() @IsNotEmpty() descripcion: string;
  @IsInt() @Min(0) precio: number;
  @IsString() @IsNotEmpty() horario: string;
  @IsIn(['presencial', 'virtual', 'hibrido']) modalidad: 'presencial' | 'virtual' | 'hibrido';
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateWorkshopDto {
  @IsOptional() @IsString() @IsNotEmpty() titulo?: string;
  @IsOptional() @IsString() @IsNotEmpty() descripcion?: string;
  @IsOptional() @IsInt() @Min(0) precio?: number;
  @IsOptional() @IsString() @IsNotEmpty() horario?: string;
  @IsOptional() @IsIn(['presencial', 'virtual', 'hibrido']) modalidad?: 'presencial' | 'virtual' | 'hibrido';
  @IsOptional() @IsBoolean() activo?: boolean;
}
