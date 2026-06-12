import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CashOutRequestDto {
  constructor() {}

  @ApiProperty({
    example: 2.5,
    description: 'Multiplicador atual usado para calcular o payout.',
  })
  @IsNumber()
  @Min(1)
  multiplier!: number;
}
