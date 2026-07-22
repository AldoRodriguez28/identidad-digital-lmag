import { IsString, IsNotEmpty } from 'class-validator';
export class InterestDto {
  @IsString() @IsNotEmpty() nombre: string;
}
