import { IsEmail, IsOptional, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}
