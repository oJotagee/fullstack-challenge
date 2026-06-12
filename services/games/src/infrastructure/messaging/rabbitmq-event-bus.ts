import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { randomUUID } from 'crypto';

import type { EventEnvelope } from '@crash/shared/events';

import type { EventBus } from '@/application/ports/event-bus.port';
import {
  REALTIME_EVENTS,
  type BetAcceptedPayload,
  type BetCashedOutPayload,
  type MultiplierTickPayload,
  type RealtimeEvents,
  type RoundBettingStartedPayload,
  type RoundCrashedPayload,
  type RoundRunningStartedPayload,
} from '@/application/ports/realtime-events.port';

const EXCHANGE = 'crash.events';

@Injectable()
export class RabbitMqEventBus implements EventBus, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqEventBus.name);
  private connection?: ChannelModel;
  private channel?: Channel;

  constructor(
    @Optional()
    @Inject(REALTIME_EVENTS)
    private readonly realtimeEvents?: RealtimeEvents,
  ) {}

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
    this.emitRealtimeEvent(type, payload);
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

  private emitRealtimeEvent<TPayload>(type: string, payload: TPayload): void {
    if (!this.realtimeEvents) {
      return;
    }

    // O WebSocket e somente server-to-client: nao registra comandos vindos do cliente.
    if (type === 'round.betting.started') {
      this.realtimeEvents.emitRoundBettingStarted(payload as RoundBettingStartedPayload);
      return;
    }

    if (type === 'round.running.started') {
      this.realtimeEvents.emitRoundRunningStarted(payload as RoundRunningStartedPayload);
      return;
    }

    if (type === 'round.multiplier.tick') {
      this.realtimeEvents.emitMultiplierTick(payload as MultiplierTickPayload);
      return;
    }

    if (type === 'bet.accepted') {
      this.realtimeEvents.emitBetAccepted(payload as BetAcceptedPayload);
      return;
    }

    if (type === 'bet.cashed_out') {
      this.realtimeEvents.emitBetCashedOut(payload as BetCashedOutPayload);
      return;
    }

    if (type === 'round.crashed') {
      this.realtimeEvents.emitRoundCrashed(payload as RoundCrashedPayload);
    }
  }
}
