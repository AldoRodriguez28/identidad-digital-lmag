import { IsNumber, IsNotEmpty, IsString, Min } from 'class-validator';

export class PurchaseDto {
  @IsString() @IsNotEmpty() credentialToken: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) monto: number;
}
