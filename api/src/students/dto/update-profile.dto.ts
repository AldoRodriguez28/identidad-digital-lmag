import { IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() escolaridad?: string;
  @IsOptional() @IsString() calle?: string;
  @IsOptional() @IsString() colonia?: string;
  @IsOptional() @IsString() codigoPostal?: string;
  @IsOptional() @IsString() numExt?: string;
  @IsOptional() @IsString() numInt?: string;
  @IsOptional() @IsString() entreCalles?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interestIds?: string[];
}
