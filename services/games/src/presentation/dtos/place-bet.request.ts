import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceBetRequestDto {
  @ApiProperty({
    example: '10.50',
    description: 'Valor da aposta em decimal; o backend converte para centavos.',
  })
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/)
  amount!: string;
}
