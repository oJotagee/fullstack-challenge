# Eventos e RabbitMQ

## Exchange

Os servicos usam a exchange topic:

```text
crash.events
```

Cada mensagem e publicada como envelope versionado:

```ts
{
  eventId: string;
  type: string;
  version: 1;
  payload: object;
  occurredAt: string;
}
```

Os contratos ficam em `packages/shared/src/events`.

## Fluxo de Aposta

1. Cliente chama `POST /games/bet`.
2. Game valida rodada `BETTING` e aposta duplicada.
3. Game cria bet `PENDING_DEBIT`.
4. Game publica `wallet.debit.requested`.
5. Wallet consome o comando.
6. Wallet tenta debitar saldo.
7. Wallet publica `wallet.debit.succeeded` ou `wallet.debit.failed`.
8. Game consome a resposta.
9. Game muda a bet para `ACCEPTED` ou `REJECTED`.
10. Game publica evento de realtime para a UI.

Eventos:

```text
wallet.debit.requested
wallet.debit.succeeded
wallet.debit.failed
bet.accepted
bet.rejected
```

## Fluxo de Cash Out

1. Cliente chama `POST /games/bet/cashout`.
2. Game valida rodada `RUNNING`.
3. Game calcula o multiplicador atual no servidor.
4. Game calcula payout em centavos.
5. Game muda a bet para `CASHED_OUT`.
6. Game publica `bet.cashed_out`.
7. Game publica `wallet.credit.requested`.
8. Wallet consome o comando e credita saldo.
9. Wallet publica `wallet.credit.succeeded` ou `wallet.credit.failed`.

Eventos:

```text
bet.cashed_out
wallet.credit.requested
wallet.credit.succeeded
wallet.credit.failed
```

## Fluxo de Crash e Settlement

1. Engine inicia rodada em `BETTING`.
2. Engine muda para `RUNNING`.
3. Engine emite ticks de multiplicador.
4. Ao atingir crash point, a rodada muda para `CRASHED`.
5. Bets `ACCEPTED` sem cash out viram `LOST`.
6. Rodada muda para `SETTLED`.
7. Nova rodada e agendada.

Eventos:

```text
round.betting.started
round.running.started
round.multiplier.tick
round.crashed
round.settled
```

## Idempotencia

Cada operacao financeira tem um `operationId`:

- Debito de aposta: `bet:{betId}:debit`
- Credito de cash out: `bet:{betId}:credit`

A Wallet persiste `operationId` no ledger e restaura a lista de operacoes processadas a partir dele. Se o mesmo comando chegar de novo, a operacao nao altera saldo novamente.

## Outbox e Inbox

Eventos de negocio publicados pelos servicos sao gravados em `outbox_events` antes da tentativa de envio para o RabbitMQ. Se o broker estiver indisponivel, o evento permanece pendente e o publisher do servico tenta reenviar periodicamente.

Cada consumer registra o `eventId` recebido em `inbox_events`:

- `PROCESSING`: evento em processamento.
- `PROCESSED`: evento concluido e seguro para ignorar em retry.
- `FAILED`: processamento falhou e pode ser tentado novamente.

Isso entrega at-least-once delivery no broker com processamento idempotente no consumidor. Ticks de multiplicador sao tratados como evento efemero de realtime e nao sao persistidos na outbox para evitar volume desnecessario.

## Falhas e Compensacao

Falha de debito:

- Wallet publica `wallet.debit.failed`.
- Game rejeita a bet.
- Motivos mapeados: `INSUFFICIENT_FUNDS`, `WALLET_NOT_FOUND`, `UNKNOWN`.

Falha de credito:

- Game ja marcou a bet como `CASHED_OUT`.
- Wallet publica `wallet.credit.failed`.
- Game publica `bet.credit_failed` para futura compensacao operacional.

## Realtime

O Game reutiliza os eventos de dominio/aplicacao para emitir WebSocket:

- `round.betting.started`
- `round.running.started`
- `round.multiplier.tick`
- `bet.accepted`
- `bet.cashed_out`
- `round.crashed`

O WebSocket nao aceita comandos do cliente. Aposta e cash out sao sempre REST.
