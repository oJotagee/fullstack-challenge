import { ApiProperty } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok', description: 'The status of the health check' })
  status!: string;

  @ApiProperty({ example: 'wallets', description: 'The name of the service' })
  service!: string;
}
