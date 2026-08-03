import { IsEmail, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class UpdateCommerceProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsEmail() email?: string;
}
