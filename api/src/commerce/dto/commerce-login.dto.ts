import { IsEmail, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
export class CommerceLoginDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() password: string;
  @IsOptional() @IsBoolean() remember?: boolean;
}
