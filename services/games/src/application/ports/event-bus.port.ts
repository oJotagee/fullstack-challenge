export const EVENT_BUS = Symbol('EVENT_BUS');

export interface EventBus {
  publish<TPayload>(type: string, payload: TPayload): Promise<void>;
}
