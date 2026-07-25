import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export type CategoriaInteres = 'deporte' | 'cultura' | 'arte' | 'tecnologia';

export class InterestDto {
  @IsString() @IsNotEmpty() nombre: string;
  @IsOptional() @IsIn(['deporte', 'cultura', 'arte', 'tecnologia'])
  categoria?: CategoriaInteres;
}
