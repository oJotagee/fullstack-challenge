import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type {
  WalletCreditFailed,
  WalletDebitFailed,
  WalletDebitSucceeded,
} from '@crash/shared/events';

import { WalletEventsHandler } from '@/application/sagas/wallet-events.handler';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

const EXCHANGE = 'crash.events';
const QUEUE = 'games.wallet-events';
const ROUTING_KEYS = ['wallet.debit.succeeded', 'wallet.debit.failed', 'wallet.credit.failed'];

type GameWalletEvent = WalletDebitSucceeded | WalletDebitFailed | WalletCreditFailed;

@Injectable()
export class WalletEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletEventsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    private readonly handler: WalletEventsHandler,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const rabbitMqUrl = process.env.RABBITMQ_URL ?? 'amqp://admin:admin@rabbitmq:5672';

    const connection = await connect(rabbitMqUrl);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    await channel.assertQueue(QUEUE, { durable: true });

    for (const routingKey of ROUTING_KEYS) {
      await channel.bindQueue(QUEUE, EXCHANGE, routingKey);
    }

    this.connection = connection;
    this.channel = channel;
    await channel.consume(QUEUE, (message) => void this.consume(message), { noAck: false });
    this.logger.log(`Consuming wallet events from ${QUEUE}.`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  private async consume(message: ConsumeMessage | null): Promise<void> {
    if (!message || !this.channel) {
      return;
    }

    try {
      const event = JSON.parse(message.content.toString()) as GameWalletEvent;
      const canProcess = await this.markInboxProcessing(event.eventId, event.type);

      if (!canProcess) {
        this.channel.ack(message);
        return;
      }

      await this.handler.handle(event);
      await this.markInboxProcessed(event.eventId);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error('Failed to process wallet event.', error);
      await this.markInboxFailed(message, error);
      this.channel.nack(message, false, true);
    }
  }

  private async markInboxProcessing(eventId: string, type: string): Promise<boolean> {
    const existing = await this.prisma.inboxEvent.findUnique({ where: { eventId } });

    if (existing?.status === 'PROCESSED') {
      return false;
    }

    if (existing) {
      await this.prisma.inboxEvent.update({
        where: { eventId },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      return true;
    }

    await this.prisma.inboxEvent.create({
      data: {
        eventId,
        type,
        status: 'PROCESSING',
        attempts: 1,
      },
    });

    return true;
  }

  private async markInboxProcessed(eventId: string): Promise<void> {
    await this.prisma.inboxEvent.update({
      where: { eventId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
        lastError: null,
      },
    });
  }

  private async markInboxFailed(message: ConsumeMessage, error: unknown): Promise<void> {
    try {
      const event = JSON.parse(message.content.toString()) as GameWalletEvent;
      await this.prisma.inboxEvent.upsert({
        where: { eventId: event.eventId },
        create: {
          eventId: event.eventId,
          type: event.type,
          status: 'FAILED',
          attempts: 1,
          lastError: error instanceof Error ? error.message : 'Unknown processing error',
        },
        update: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : 'Unknown processing error',
        },
      });
    } catch (inboxError) {
      this.logger.error('Failed to mark inbox event as failed.', inboxError);
    }
  }
}
