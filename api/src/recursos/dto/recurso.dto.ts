import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const RECURSO_TIPOS = ['educacion', 'deporte', 'cultura'] as const;
export type RecursoTipo = (typeof RECURSO_TIPOS)[number];

export class CreateRecursoDto {
  @IsIn(RECURSO_TIPOS) tipo: RecursoTipo;
  @IsString() @IsNotEmpty() titulo: string;
  @IsString() @IsNotEmpty() categoria: string;
  @IsString() @IsNotEmpty() descripcion: string;
  @IsOptional() @IsString() contacto?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateRecursoDto {
  @IsOptional() @IsIn(RECURSO_TIPOS) tipo?: RecursoTipo;
  @IsOptional() @IsString() @IsNotEmpty() titulo?: string;
  @IsOptional() @IsString() @IsNotEmpty() categoria?: string;
  @IsOptional() @IsString() @IsNotEmpty() descripcion?: string;
  @IsOptional() @IsString() contacto?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
