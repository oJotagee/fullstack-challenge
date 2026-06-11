# Crash Game

Monorepo para um desafio fullstack baseado em microservicos. A estrutura atual contem dois servicos NestJS executados com Bun, um API Gateway com Kong e infraestrutura local com PostgreSQL, RabbitMQ e Keycloak via Docker Compose.

## Stack

- Bun
- NestJS
- PostgreSQL
- RabbitMQ
- Keycloak
- Kong
- Docker Compose

## Estrutura

```text
.
├── docker/                 # Configuracoes de infraestrutura
│   ├── keycloak/
│   ├── kong/
│   └── postgres/
├── frontend/               # Placeholder para o frontend
├── packages/               # Placeholder para pacotes compartilhados
└── services/
    ├── games/              # Servico de jogos
    └── wallets/            # Servico de carteiras
```

## Pre-requisitos

- Docker e Docker Compose
- Bun

## Configuracao

Crie os arquivos de ambiente dos servicos a partir dos exemplos:

```bash
cp services/games/.env.example services/games/.env
cp services/wallets/.env.example services/wallets/.env
```

Os valores padrao ja apontam para os containers definidos no `docker-compose.yml`.

## Instalar dependencias

```bash
bun install
```

## Rodar o projeto com Docker

Suba toda a stack:

```bash
bun run docker:up
```

Esse comando executa:

- PostgreSQL em `localhost:5432`
- RabbitMQ em `localhost:5672`
- RabbitMQ Management em `http://localhost:15672`
- Keycloak em `http://localhost:8080`
- Kong em `http://localhost:8000`
- Games service em `http://localhost:4001`
- Wallets service em `http://localhost:4002`

Credenciais padrao:

- PostgreSQL: `admin` / `admin`
- RabbitMQ Management: `admin` / `admin`
- Keycloak admin: `admin` / `admin`

## Verificar se esta rodando

Health checks diretos:

```bash
curl http://localhost:4001/health
curl http://localhost:4002/health
```

Health checks via Kong:

```bash
curl http://localhost:8000/games/health
curl http://localhost:8000/wallets/health
```

## Parar o projeto

```bash
bun run docker:down
```

Para parar e remover volumes e containers orfaos:

```bash
bun run docker:prune
```

## Rodar servicos localmente

Com a infraestrutura rodando no Docker, tambem e possivel executar os servicos fora dos containers.

Games:

```bash
bun --cwd services/games run dev
```

Wallets:

```bash
bun --cwd services/wallets run dev
```

## Testes

Executar todos os testes configurados no monorepo:

```bash
bun test
```

Executar testes por servico:

```bash
bun --cwd services/games test
bun --cwd services/wallets test
```
