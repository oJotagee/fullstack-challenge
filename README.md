# Crash Game

Backend e frontend de um Crash Game multiplayer em tempo real. O projeto usa dois servicos NestJS separados, comunicacao assincrona por RabbitMQ, PostgreSQL, Kong, Keycloak e frontend Next.js.

## Stack

- Runtime: Bun
- Backend: NestJS + TypeScript strict
- ORM: Prisma
- Banco: PostgreSQL
- Mensageria: RabbitMQ
- API Gateway: Kong
- IdP: Keycloak
- Realtime: Socket.IO via `@nestjs/websockets`
- Frontend: Next.js + React + Tailwind CSS
- Testes: Bun test runner para unitarios e Playwright para E2E
- Infra: Docker Compose

## Setup

Clone o repositorio e entre na pasta:

```bash
git clone <url-do-repositorio>
cd fullstack-challenge
```

Instale as dependencias:

```bash
bun install
```

Copie os arquivos de ambiente:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
```

Os `.env` dos servicos apontam para os nomes dos containers (`postgres`, `rabbitmq`, `keycloak`). A raiz `.env` alimenta os argumentos do frontend no Docker Compose.

## Seed

No fluxo principal com Docker, o seed da Wallet roda automaticamente junto com a subida da stack:

```bash
bun run docker:up
```

Esse comando builda os servicos, roda `prisma generate`, aplica migrations, executa o seed da Wallet e inicia o projeto completo.

Se precisar rodar o seed manualmente fora do Docker:

```bash
bun run prisma:seed:wallets
```

## Rodar

Suba tudo com Docker Compose:

```bash
bun run docker:up
```

Esse comando sobe PostgreSQL, RabbitMQ, Keycloak, Kong, Game Service, Wallet Service e Frontend.

Para parar:

```bash
bun run docker:down
```

Para remover containers, volumes e dados locais:

```bash
bun run docker:prune
```

## URLs Locais

| Item                     | URL                                      |
| ------------------------ | ---------------------------------------- |
| Frontend                 | `http://localhost:3000`                  |
| Kong gateway             | `http://localhost:8000`                  |
| Games via Kong           | `http://localhost:8000/games`            |
| Wallets via Kong         | `http://localhost:8000/wallets`          |
| WebSocket via Kong       | `http://localhost:8000/socket.io`        |
| Games direto             | `http://localhost:4001`                  |
| Wallets direto           | `http://localhost:4002`                  |
| Swagger Games via Kong   | `http://localhost:8000/games/api/docs`   |
| Swagger Wallets via Kong | `http://localhost:8000/wallets/api/docs` |
| Keycloak                 | `http://localhost:8080`                  |
| RabbitMQ Management      | `http://localhost:15672`                 |

## Usuarios

Keycloak:

- Admin: `admin` / `admin`
- Realm: `crash-game`
- Client ID: `crash-game-client`
- Usuario de teste: `player` / `player123`

RabbitMQ Management:

- `admin` / `admin`

PostgreSQL:

- `admin` / `admin`
- Databases: `games`, `wallets`

## Fluxo Manual Principal

1. Rode `bun install`.
2. Copie os `.env`.
3. Rode `bun run docker:up`.
4. Abra `http://localhost:3000`.
5. Login com `player / player123`.
6. Confira o saldo inicial.
7. Espere a fase de apostas.
8. Aposte `10.00`.
9. Confira o debito no saldo.
10. Veja o multiplicador subir.
11. Faca cash out antes do crash.
12. Confira o credito no saldo.
13. Abra duas abas e confirme que ambas recebem os mesmos eventos.
14. Deixe uma aposta sem cash out e confirme que ela perde no crash.
15. Veja historico de rodadas.
16. Abra a verificacao provably fair de uma rodada encerrada.

## Testes

Unitarios:

```bash
bun run test:unit
```

Por servico:

```bash
bun run test:wallets
bun run test:games
```

Coverage:

```bash
bun run test:coverage
```

E2E com Playwright:

```bash
bun run docker:up
bun run test:e2e
```

Os E2E exigem Keycloak, Kong, RabbitMQ e PostgreSQL rodando. Eles usam o usuario `player`, acessam APIs reais via Kong e preparam dados nos bancos `games` e `wallets`.

## Arquitetura

O sistema foi separado em dois bounded contexts:

- Game Service: rodada, aposta, cash out, crash point, WebSocket e provably fair.
- Wallet Service: saldo, ledger, credito, debito e idempotencia financeira.

Game e Wallet ficam separados porque dinheiro e jogo possuem invariantes diferentes. O Game nao altera saldo diretamente: ele publica comandos financeiros e reage aos eventos de sucesso/falha do Wallet. Isso reduz acoplamento, protege o dominio financeiro e deixa claro onde auditar movimentacoes.

Mais detalhes:

- [Arquitetura](docs/architecture.md)
- [Eventos e RabbitMQ](docs/events.md)
- [Provably Fair](docs/provably-fair.md)
- [Testes](docs/testing.md)

## Decisoes Importantes

- Dinheiro nunca usa ponto flutuante. Valores monetarios trafegam em centavos como `bigint` no dominio e `string` nos contratos.
- `operationId` torna debitos e creditos idempotentes. Evento duplicado nao altera saldo duas vezes.
- Apostas sao feitas por REST; WebSocket e apenas server-to-client.
- WebSocket passa pelo Kong em `/socket.io`, mantendo um unico ponto de entrada local.
- O multiplicador usado no cash out e calculado no servidor com base no tempo da rodada. O cliente nao envia multiplicador.
- RabbitMQ usa exchange topic `crash.events` com envelopes versionados.
- Outbox/inbox persistem eventos de negocio para retry e processamento idempotente entre servicos.
- A Wallet mantem ledger persistido; o saldo atual e consequencia das operacoes aceitas.

## Trade-offs e Proximos Passos

- Os E2E Playwright validam os fluxos principais por API e banco. O proximo passo seria adicionar testes browser completos cobrindo login visual, duas abas e interacoes da UI.
- Outbox/inbox foi implementado para a comunicacao entre Game e Wallet. Um proximo passo de producao seria adicionar retencao/limpeza periodica das tabelas de eventos ja processados.
- A engine recupera rodadas ativas ao reiniciar, mas ainda pode evoluir para ter locks/distribuicao caso exista mais de uma instancia do Game Service.
- Observabilidade ainda e basica. Eu adicionaria OpenTelemetry, metricas de RTP, volume apostado, latencia de eventos e dashboards.

## Arquivos Mais Importantes Para Review

- `services/wallets/src/domain/money/money.vo.ts`
- `services/wallets/src/domain/wallet/wallet.entity.ts`
- `services/wallets/prisma/schema.prisma`
- `services/games/src/domain/round/round.entity.ts`
- `services/games/src/domain/bet/bet.entity.ts`
- `services/games/src/domain/provably-fair/crash-point-calculator.ts`
- `services/games/prisma/schema.prisma`
- `packages/shared/src/events/wallet.events.ts`
- `services/games/src/application/use-cases/place-bet.use-case.ts`
- `services/games/src/application/use-cases/cash-out.use-case.ts`
- `services/games/src/application/sagas/wallet-events.handler.ts`
- `services/wallets/src/application/handlers/wallet-command-events.handler.ts`
- `services/games/src/infrastructure/websocket/game-events.gateway.ts`
- `frontend/features/game/game-socket.ts`
- `README.md`
