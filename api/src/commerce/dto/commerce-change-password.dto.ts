import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CommerceChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}
