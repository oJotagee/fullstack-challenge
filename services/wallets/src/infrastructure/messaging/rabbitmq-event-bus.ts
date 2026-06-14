import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';

import type { EventEnvelope } from '@crash/shared/events';

import type { EventBus } from '@/application/ports/event-bus.port';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

const EXCHANGE = 'crash.events';
const OUTBOX_BATCH_SIZE = 50;
const OUTBOX_POLL_INTERVAL_MS = 1_000;

@Injectable()
export class RabbitMqEventBus implements EventBus, OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(RabbitMqEventBus.name);
  private connection?: ChannelModel;
  private channel?: Channel;
  private outboxInterval?: ReturnType<typeof setInterval>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // Reenvia eventos pendentes quando o RabbitMQ volta ou quando houve falha temporaria.
    this.outboxInterval = setInterval(() => void this.flushOutbox(), OUTBOX_POLL_INTERVAL_MS);
  }

  async publish<TPayload>(type: string, payload: TPayload): Promise<void> {
    const envelope: EventEnvelope<string, TPayload> = {
      eventId: randomUUID(),
      type,
      version: 1,
      payload,
      occurredAt: new Date().toISOString(),
    };

    await this.prisma.outboxEvent.create({
      data: {
        eventId: envelope.eventId,
        type,
        payload: envelope.payload as never,
        occurredAt: new Date(envelope.occurredAt),
      },
    });

    await this.publishOutboxEvent(envelope.eventId);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.outboxInterval) {
      clearInterval(this.outboxInterval);
    }
    await this.channel?.close();
    await this.connection?.close();
  }

  private async publishEnvelope<TPayload>(
    envelope: EventEnvelope<string, TPayload>,
  ): Promise<void> {
    const channel = await this.getChannel();

    channel.publish(EXCHANGE, envelope.type, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  private async publishOutboxEvent(eventId: string): Promise<void> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { eventId } });

    if (!event || event.publishedAt) {
      return;
    }

    const envelope: EventEnvelope<string, unknown> = {
      eventId: event.eventId,
      type: event.type,
      version: 1,
      payload: event.payload,
      occurredAt: event.occurredAt.toISOString(),
    };

    try {
      await this.publishEnvelope(envelope);
      await this.prisma.outboxEvent.update({
        where: { eventId },
        data: {
          attempts: { increment: 1 },
          lastError: null,
          publishedAt: new Date(),
        },
      });
    } catch (error) {
      await this.prisma.outboxEvent.update({
        where: { eventId },
        data: {
          attempts: { increment: 1 },
          lastError: error instanceof Error ? error.message : 'Unknown publish error',
        },
      });
      this.logger.error(`Failed to publish outbox event ${eventId}.`, error);
    }
  }

  private async flushOutbox(): Promise<void> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { publishedAt: null },
      orderBy: { createdAt: 'asc' },
      take: OUTBOX_BATCH_SIZE,
    });

    for (const event of events) {
      await this.publishOutboxEvent(event.eventId);
    }
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    const rabbitMqUrl = process.env.RABBITMQ_URL ?? 'amqp://admin:admin@rabbitmq:5672';

    const connection = await connect(rabbitMqUrl);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    this.connection = connection;
    this.channel = channel;
    this.logger.log(`Connected to RabbitMQ exchange ${EXCHANGE}.`);

    return channel;
  }
}
