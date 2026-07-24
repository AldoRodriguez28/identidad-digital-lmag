import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString() @IsNotEmpty() puesto: string;
  @IsString() @IsNotEmpty() empresa: string;
  @IsString() @IsNotEmpty() requisitos: string;
  @IsString() @IsNotEmpty() contacto: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}

export class UpdateJobDto {
  @IsOptional() @IsString() @IsNotEmpty() puesto?: string;
  @IsOptional() @IsString() @IsNotEmpty() empresa?: string;
  @IsOptional() @IsString() @IsNotEmpty() requisitos?: string;
  @IsOptional() @IsString() @IsNotEmpty() contacto?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
