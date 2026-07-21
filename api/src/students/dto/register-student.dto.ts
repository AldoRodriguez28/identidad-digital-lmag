import {
  IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsDateString, IsArray,
} from 'class-validator';

export class RegisterStudentDto {
  @IsString() @IsNotEmpty() nombreCompleto: string;
  @IsDateString() fechaNacimiento: string;
  @IsString() @IsNotEmpty() curp: string;
  @IsString() @IsNotEmpty() sexo: string;
  @IsString() @IsNotEmpty() escolaridad: string;
  @IsEmail() correo: string;
  @IsString() @IsNotEmpty() telefono: string;
  @IsString() @IsNotEmpty() calle: string;
  @IsString() @IsNotEmpty() colonia: string;
  @IsString() @IsNotEmpty() codigoPostal: string;
  @IsString() @IsNotEmpty() numExt: string;
  @IsString() @MinLength(8) password: string;

  @IsOptional() @IsString() numInt?: string;
  @IsOptional() @IsString() entreCalles?: string;
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsString() tiktok?: string;
  @IsOptional() @IsString() whatsapp?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) interestIds?: string[];
}
