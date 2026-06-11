export type EventEnvelope<TType extends string, TPayload> = {
  eventId: string;
  type: TType;
  version: 1;
  payload: TPayload;
  occurredAt: string;
  correlationId?: string;
  causationId?: string;
};
