import { IsString, IsNotEmpty } from 'class-validator';
export class ValidateDto {
  @IsString() @IsNotEmpty() credentialToken: string;
}
