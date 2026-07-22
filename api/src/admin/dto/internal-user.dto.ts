import { IsEmail, IsIn, IsOptional, IsString, IsNotEmpty, IsBoolean, MinLength } from 'class-validator';

export class CreateInternalUserDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() nombre: string;
  @IsIn(['admin', 'gestor']) rol: 'admin' | 'gestor';
  @IsString() @MinLength(8) password: string;
}

export class UpdateInternalUserDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsIn(['admin', 'gestor']) rol?: 'admin' | 'gestor';
  @IsOptional() @IsBoolean() activo?: boolean;
}
