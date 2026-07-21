import { IsEmail, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
export class StudentLoginDto {
  @IsEmail() correo: string;
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
