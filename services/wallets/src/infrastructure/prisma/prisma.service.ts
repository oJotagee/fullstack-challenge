import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Service NestJS que encapsula o PrismaClient para o auth-api.
 * Gerencia conexão/desconexão no ciclo de vida do módulo.
 * Injetado exclusivamente nos adapters de repositório — nunca nos handlers.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({ adapter: pool });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('Connection with PostgreSQL established.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
    this.logger.log('Connection with PostgreSQL terminated.');
  }
}
