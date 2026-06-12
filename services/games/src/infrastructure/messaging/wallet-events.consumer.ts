import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type {
  WalletCreditFailed,
  WalletDebitFailed,
  WalletDebitSucceeded,
} from '@crash/shared/events';

import { WalletEventsHandler } from '@/application/sagas/wallet-events.handler';

const EXCHANGE = 'crash.events';
const QUEUE = 'games.wallet-events';
const ROUTING_KEYS = ['wallet.debit.succeeded', 'wallet.debit.failed', 'wallet.credit.failed'];

type GameWalletEvent = WalletDebitSucceeded | WalletDebitFailed | WalletCreditFailed;

@Injectable()
export class WalletEventsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletEventsConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly handler: WalletEventsHandler) {}

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

      await this.handler.handle(event);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error('Failed to process wallet event.', error);
      this.channel.nack(message, false, true);
    }
  }
}
