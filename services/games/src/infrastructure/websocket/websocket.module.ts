import { Module } from '@nestjs/common';

import { REALTIME_EVENTS } from '@/application/ports/realtime-events.port';
import { GameEventsGateway } from './game-events.gateway';

@Module({
  providers: [
    GameEventsGateway,
    {
      provide: REALTIME_EVENTS,
      useExisting: GameEventsGateway,
    },
  ],
  exports: [REALTIME_EVENTS],
})
export class WebsocketModule {}
