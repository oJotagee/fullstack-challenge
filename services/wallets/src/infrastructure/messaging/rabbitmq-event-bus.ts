import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';

import type { EventEnvelope } from '@crash/shared/events';

import type { EventBus } from '@/application/ports/event-bus.port';

const EXCHANGE = 'crash.events';

@Injectable()
export class RabbitMqEventBus implements EventBus, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqEventBus.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  async publish<TPayload>(type: string, payload: TPayload): Promise<void> {
    const channel = await this.getChannel();
    const envelope: EventEnvelope<string, TPayload> = {
      eventId: randomUUID(),
      type,
      version: 1,
      payload,
      occurredAt: new Date().toISOString(),
    };

    channel.publish(EXCHANGE, type, Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
      contentType: 'application/json',
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
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
