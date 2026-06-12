import { connect, type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import type { WalletCreditRequested, WalletDebitRequested } from '@crash/shared/events';

import { WalletCommandEventsHandler } from '@/application/handlers/wallet-command-events.handler';

const EXCHANGE = 'crash.events';
const QUEUE = 'wallets.commands';
const ROUTING_KEYS = ['wallet.debit.requested', 'wallet.credit.requested'];

type WalletCommandEvent = WalletDebitRequested | WalletCreditRequested;

@Injectable()
export class WalletCommandConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WalletCommandConsumer.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(private readonly handler: WalletCommandEventsHandler) {}

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
    this.logger.log(`Consuming wallet commands from ${QUEUE}.`);
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
      const event = JSON.parse(message.content.toString()) as WalletCommandEvent;

      await this.handler.handle(event);
      this.channel.ack(message);
    } catch (error) {
      this.logger.error('Failed to process wallet command.', error);
      this.channel.nack(message, false, true);
    }
  }
}
