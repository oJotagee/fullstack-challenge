# Arquitetura

## Visao Geral

O projeto segue uma divisao por bounded contexts:

- `services/games`: regras de rodada, aposta, cash out, crash, historico, provably fair e WebSocket.
- `services/wallets`: regras financeiras, saldo, ledger, debito, credito e idempotencia.
- `packages/shared`: contratos compartilhados de eventos.
- `frontend`: cliente Next.js que consome REST via Kong e eventos realtime via Socket.IO.

Cada servico backend segue camadas:

```text
domain -> application -> infrastructure -> presentation
```

O dominio nao importa NestJS, Prisma, RabbitMQ ou detalhes HTTP.

## Por Que Game e Wallet Sao Separados

Game e Wallet foram separados porque possuem responsabilidades e riscos diferentes:

- Game controla estado da rodada, aceite de aposta, cash out e sincronizacao realtime.
- Wallet controla dinheiro, ledger e consistencia financeira.

O Game nunca debita nem credita saldo diretamente. Ele cria uma bet pendente e publica um comando para o Wallet. O Wallet aplica a operacao financeira e responde com evento de sucesso ou falha. Isso deixa as regras financeiras isoladas, auditaveis e testaveis sem depender da engine do jogo.

## Game Service

Responsabilidades:

- Criar rodadas automaticamente.
- Controlar transicoes `BETTING -> RUNNING -> CRASHED -> SETTLED`.
- Garantir uma aposta por jogador por rodada.
- Criar bet `PENDING_DEBIT`.
- Aceitar/rejeitar bet conforme resposta do Wallet.
- Calcular cash out no servidor.
- Emitir eventos WebSocket server-to-client.
- Expor endpoints REST de jogo.

Principais arquivos:

- `services/games/src/domain/round/round.entity.ts`
- `services/games/src/domain/bet/bet.entity.ts`
- `services/games/src/domain/provably-fair/crash-point-calculator.ts`
- `services/games/src/application/use-cases/place-bet.use-case.ts`
- `services/games/src/application/use-cases/cash-out.use-case.ts`
- `services/games/src/infrastructure/scheduler/round-engine.service.ts`
- `services/games/src/infrastructure/websocket/game-events.gateway.ts`

## Wallet Service

Responsabilidades:

- Criar carteira por jogador.
- Manter saldo em centavos.
- Registrar ledger para cada movimento financeiro.
- Rejeitar saldo negativo.
- Garantir idempotencia por `operationId`.
- Consumir comandos financeiros do Game.
- Publicar eventos de sucesso/falha.

Principais arquivos:

- `services/wallets/src/domain/money/money.vo.ts`
- `services/wallets/src/domain/wallet/wallet.entity.ts`
- `services/wallets/src/application/use-cases/debit-wallet.use-case.ts`
- `services/wallets/src/application/use-cases/credit-wallet.use-case.ts`
- `services/wallets/src/application/handlers/wallet-command-events.handler.ts`
- `services/wallets/src/infrastructure/persistence/prisma-wallet.repository.ts`

## API Gateway e Auth

Todos os endpoints REST principais passam pelo Kong em `http://localhost:8000`.

- `/games/*` roteia para o Game Service.
- `/wallets/*` roteia para o Wallet Service.

Keycloak importa automaticamente o realm `crash-game` no `docker:up`. Os guards dos servicos validam JWTs emitidos por esse realm e extraem `playerId` a partir do usuario autenticado.

## WebSocket

O WebSocket e usado apenas para eventos do servidor para o cliente. As acoes do jogador continuam por REST:

- `POST /games/bet`
- `POST /games/bet/cashout`

Em local, o frontend conecta no Kong (`NEXT_PUBLIC_WS_URL=http://localhost:8000`) e o gateway encaminha `/socket.io` para o Game Service. As acoes do jogador continuam via REST; o socket e usado apenas para push server-to-client.

## Protecao Monetaria

Dinheiro e tratado como centavos:

- No dominio: `bigint`.
- Nos DTOs/eventos: `string`.
- No banco: `BigInt`.

Nenhuma regra financeira usa `number` ou ponto flutuante. A conversao de decimal para centavos rejeita mais de duas casas decimais.

## Persistencia

Cada servico possui seu proprio banco logico:

- `games`: tabelas `rounds` e `bets`.
- `wallets`: tabelas `wallets` e `ledger_entries`.

Essa separacao evita que o Game dependa de tabelas internas da Wallet.

## Trade-offs

- A saga usa RabbitMQ e idempotencia, mas ainda nao possui outbox/inbox transacional.
- A engine foi feita para ambiente local e uma instancia do Game Service. Para multiplas instancias, seria necessario lock distribuido ou leader election.
- Os E2E cobrem fluxos principais por API. Testes browser completos com duas abas ainda seriam um proximo passo.
