import { IsEmail } from 'class-validator';

export class ResetRequestDto {
  @IsEmail() correo: string;
}
