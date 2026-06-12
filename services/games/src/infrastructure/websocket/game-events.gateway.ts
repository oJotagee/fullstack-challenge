import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

import type {
  BetAcceptedPayload,
  BetCashedOutPayload,
  MultiplierTickPayload,
  RealtimeEvents,
  RoundBettingStartedPayload,
  RoundCrashedPayload,
  RoundRunningStartedPayload,
} from '@/application/ports/realtime-events.port';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? '*',
  },
})
export class GameEventsGateway implements RealtimeEvents {
  @WebSocketServer()
  private server!: Server;

  emitRoundBettingStarted(payload: RoundBettingStartedPayload): void {
    this.server.emit('round.betting.started', payload);
  }

  emitRoundRunningStarted(payload: RoundRunningStartedPayload): void {
    this.server.emit('round.running.started', payload);
  }

  emitMultiplierTick(payload: MultiplierTickPayload): void {
    this.server.emit('round.multiplier.tick', payload);
  }

  emitBetAccepted(payload: BetAcceptedPayload): void {
    this.server.emit('bet.accepted', payload);
  }

  emitBetCashedOut(payload: BetCashedOutPayload): void {
    this.server.emit('bet.cashed_out', payload);
  }

  emitRoundCrashed(payload: RoundCrashedPayload): void {
    this.server.emit('round.crashed', payload);
  }
}
