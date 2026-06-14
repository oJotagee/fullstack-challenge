# Testes

## Unitarios

Rodar todos os unitarios dos servicos:

```bash
bun run test:unit
```

Rodar por servico:

```bash
bun run test:wallets
bun run test:games
```

Os testes unitarios cobrem:

- `Money`: conversao decimal para centavos, rejeicao de formato invalido e saldo negativo.
- `Wallet`: credito, debito, saldo insuficiente, ledger e idempotencia por `operationId`.
- `Round`: transicoes validas e invalidas.
- `Bet`: aceite, rejeicao, cash out, payout em centavos e limites de aposta.
- `Provably fair`: determinismo, hash de seed e hash chain.
- Use cases de Game e Wallet com repositorios fake.
- Guards JWT e controllers.
- Consumers/handlers de eventos.

## Coverage

Rodar coverage completo:

```bash
bun run test:coverage
```

Por servico:

```bash
bun run test:coverage:wallets
bun run test:coverage:games
```

O objetivo do desafio e manter cobertura acima de 80% nos pontos centrais de dominio e aplicacao.

## E2E com Playwright

Os testes E2E ficam em:

```text
services/games/tests/e2e
```

Rodar:

```bash
bun run docker:up
bun run test:e2e
```

O Playwright usa APIs reais via Kong e prepara estado diretamente nos bancos para tornar os cenarios deterministicos. Ele precisa que estes servicos estejam ativos:

- Keycloak em `http://localhost:8080`
- Kong em `http://localhost:8000`
- PostgreSQL em `localhost:5432`
- RabbitMQ em `localhost:5672`
- Game Service
- Wallet Service

## Variaveis dos E2E

Valores padrao:

```env
E2E_API_BASE_URL=http://localhost:8000
E2E_KEYCLOAK_URL=http://localhost:8080
E2E_KEYCLOAK_REALM=crash-game
E2E_KEYCLOAK_CLIENT_ID=crash-game-client
E2E_PLAYER_ID=player
E2E_PLAYER_PASSWORD=player123
E2E_GAMES_DATABASE_URL=postgresql://admin:admin@localhost:5432/games
E2E_WALLETS_DATABASE_URL=postgresql://admin:admin@localhost:5432/wallets
```

Normalmente nao e necessario setar nada se a stack local estiver rodando com Docker Compose.

## Cenarios E2E Implementados

- Apostar -> debito -> cash out -> credito.
- Apostar -> crash -> bet perdida.
- Saldo insuficiente rejeita aposta.
- Aposta duplicada e bloqueada.
- Payload invalido e rejeitado.

## Checklist Manual

Antes da entrega, validar tambem no navegador:

1. Abrir `http://localhost:3000`.
2. Login com `player / player123`.
3. Ver saldo inicial.
4. Esperar fase de apostas.
5. Apostar `10.00`.
6. Ver saldo debitar.
7. Ver multiplicador subir.
8. Fazer cash out.
9. Ver saldo creditar.
10. Abrir duas abas e confirmar sincronizacao.
11. Deixar aposta sem cash out e ver perder no crash.
12. Ver historico.
13. Abrir verificacao provably fair.

## Observacao Sobre Infra

Se `bun run test:e2e` falhar com `ECONNREFUSED` em `8080`, `8000` ou `5432`, a stack ainda nao esta pronta. Aguarde os containers ficarem saudaveis ou rode novamente apos:

```bash
bun run docker:up
```
