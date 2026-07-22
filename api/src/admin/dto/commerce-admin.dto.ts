import { IsEmail, IsInt, IsOptional, IsString, IsNotEmpty, IsBoolean, Min, Max, MinLength } from 'class-validator';

export class CreateCommerceDto {
  @IsString() @IsNotEmpty() nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsInt() @Min(0) @Max(100) porcentajeDescuento: number;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class UpdateCommerceDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) porcentajeDescuento?: number;
  @IsOptional() @IsBoolean() activo?: boolean;
}
