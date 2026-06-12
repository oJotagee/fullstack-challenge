import { Controller, Get } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { HealthCheckResponseDto } from '../dtos/health-check-response.dto';

@Controller()
export class HealthController {
  @Get('health')
  @ApiResponse({ status: 200, type: HealthCheckResponseDto })
  check(): HealthCheckResponseDto {
    return { status: 'ok', service: 'wallets' };
  }
}
