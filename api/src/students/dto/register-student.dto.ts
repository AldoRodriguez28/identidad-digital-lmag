import {
  IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, IsDateString, IsArray, Length, Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

// Formato oficial: 4 letras + 6 dígitos (fecha) + 1 letra (sexo: H/M) + 5 letras (entidad + consonantes) + 2 alfanuméricos.
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

export class RegisterStudentDto {
  @IsString() @IsNotEmpty() nombreCompleto: string;
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() apellidoPaterno?: string;
  @IsOptional() @IsString() apellidoMaterno?: string;
  @IsDateString() fechaNacimiento: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString() @Length(18, 18, { message: 'El CURP debe tener 18 caracteres' })
  @Matches(CURP_REGEX, { message: 'El CURP no tiene un formato válido' })
  curp: string;

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
  // Llega como JSON string cuando el registro se envía como multipart/form-data (junto con el INE).
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  })
  @IsOptional() @IsArray() @IsString({ each: true }) interestIds?: string[];
}
