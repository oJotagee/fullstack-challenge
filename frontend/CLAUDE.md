@AGENTS.md

# Frontend — Crash Game

## Stack

- **Framework**: Next.js 16 (App Router) — veja `node_modules/next/dist/docs/` antes de usar APIs que você conhece de versões anteriores
- **Runtime**: Bun
- **Estilo**: Tailwind CSS v4 + shadcn/ui
- **Estado servidor**: TanStack Query v5
- **Estado cliente**: Zustand v5
- **Validação**: Zod v4
- **Componentes base**: Base UI + Radix UI + shadcn
- **Linguagem**: TypeScript strict

## Estrutura de Pastas

```
frontend/
  app/                    # Next.js App Router — rotas e layouts
    (auth)/               # Grupo: páginas sem autenticação (login, callback)
    (game)/               # Grupo: páginas protegidas (jogo principal)
    layout.tsx
    providers.tsx
  components/             # Componentes visuais reutilizáveis sem lógica de negócio
    ui/                   # Primitivos shadcn gerados
  features/               # Lógica por domínio
    auth/                 # OIDC, token store, guards
    game/                 # Store do jogo, socket, API calls
    wallet/               # API e query do saldo
  lib/                    # Utilitários sem estado: http client, formatters
```

## Regras de Arquitetura

- `app/` contém apenas rotas e composição de componentes. Nada de lógica de negócio.
- `features/` encapsula toda lógica de um domínio. Componentes em `app/` importam de `features/`, nunca o inverso.
- `components/` só recebe props — sem chamadas de API, sem stores, sem efeitos de negócio.
- `lib/` é puro: sem React, sem estado global.
- Nunca importe diretamente de `node_modules/next` caminhos internos — use só a API pública.

## Autenticação (Passo 16)

- Fluxo OIDC Authorization Code com PKCE S256 contra Keycloak.
- Keycloak roda em `http://localhost:8080`, realm `crash-game`, client `crash-game-client`.
- Usuário de teste: `player / player123`.
- Após callback, armazenar `access_token` e `refresh_token` (em memória ou sessionStorage — nunca localStorage para tokens).
- `playerId` e `username` vêm do claim `sub` e `preferred_username` do JWT.
- Rotas protegidas redirecionam para login se não houver token válido.
- Endpoints de variável de ambiente:
  - `NEXT_PUBLIC_KEYCLOAK_URL` — ex: `http://localhost:8080`
  - `NEXT_PUBLIC_KEYCLOAK_REALM` — `crash-game`
  - `NEXT_PUBLIC_KEYCLOAK_CLIENT_ID` — `crash-game-client`

## HTTP Client (Passo 17)

- Base URL via `NEXT_PUBLIC_API_BASE_URL` — ex: `http://localhost:8000` (Kong).
- Sempre enviar `Authorization: Bearer <token>` nos endpoints protegidos.
- Erros HTTP devem lançar com a mensagem do corpo da resposta para que TanStack Query trate.
- Nunca usar `fetch` diretamente nas features — sempre via `lib/http-client.ts`.

## WebSocket (Passo 17)

- Conectar via Socket.IO em `NEXT_PUBLIC_WS_URL` — ex: `http://localhost:8000` ou direto no game service `http://localhost:4001`.
- Transporte: `['websocket']` apenas.
- O WebSocket é **somente leitura** no frontend — nenhuma ação de jogo (aposta, cashout) passa por ele.
- Eventos recebidos do servidor:
  - `round.betting.started` — nova fase de apostas
  - `round.running.started` — multiplicador começa a subir
  - `round.multiplier.tick` — tick com `{ multiplier: number, elapsed: number }`
  - `bet.accepted` — aposta de qualquer jogador confirmada
  - `bet.cashed_out` — cashout de qualquer jogador
  - `round.crashed` — rodada encerrou, revela `crashPoint` e seeds
- O store Zustand do jogo deve ser a única fonte de verdade derivada dos eventos.
- Reconexão automática deve ser habilitada.

## Game Store (Zustand)

Estado mínimo obrigatório:

```ts
type GameState = {
  phase: 'BETTING' | 'RUNNING' | 'CRASHED' | 'IDLE'
  currentRound: Round | null
  multiplier: number
  bets: Bet[]
  myBet: Bet | null
  roundHistory: RoundSummary[]
}
```

- `multiplier` sobe via ticks do WebSocket durante `RUNNING`.
- `myBet` é a aposta do jogador autenticado na rodada atual.
- `roundHistory` mantém os últimos 20 crash points.

## Componentes do Jogo (Passo 18)

### CrashChart

- Exibir multiplicador atual animado subindo de `1.00x`.
- Curva visual suave (canvas ou SVG com animação).
- Indicação clara do crash (ex: linha vermelha, texto de crash point).
- Mostrar hash da seed (`serverSeedHash`) antes da rodada começar.
- Mostrar seed revelada após crash para verificação.

### BetPanel

- Input de valor da aposta com validação (mínimo `1.00`, máximo `1000.00`).
- Botão "Apostar" habilitado **somente** quando `phase === 'BETTING'` e usuário não tem aposta ativa.
- Botão "Cash Out" habilitado **somente** quando `phase === 'RUNNING'` e `myBet?.status === 'ACCEPTED'`.
- Exibir payout potencial (`aposta × multiplicador atual`) como estimativa visual durante `RUNNING`.
- Backend é a fonte de verdade — o payout real vem da resposta da API.
- Timer de contagem regressiva durante a fase de apostas.

### CurrentBetsList

- Lista em tempo real de todas as apostas da rodada atual.
- Colunas: username, valor, status.
- Destacar visualmente apostas que fizeram cashout (cor diferente, multiplicador).
- Atualizar via eventos WebSocket (`bet.accepted`, `bet.cashed_out`).

### RoundHistory

- Últimos ~20 crash points.
- Código de cores: vermelho para crash baixo (< 2x), verde para crash alto (>= 2x) — ajustar thresholds conforme UX.
- Cada item clicável para abrir verificação provably fair.

### PlayerSummary

- Saldo atual em destaque (buscar via `GET /wallets/me`).
- Invalidar query de saldo após cashout confirmado e após crash.
- Username do JWT.

### VerifyRoundDialog

- Abrir ao clicar em rodada do histórico.
- Exibir: `serverSeed`, `serverSeedHash`, `clientSeed`, `nonce`, `crashPoint`.
- Instruções de como o jogador pode verificar independentemente.

## Geração de Telas UI/UX

Antes de implementar qualquer tela, componente visual ou layout novo, invoque o skill `/ui-ux-pro-max-skill` para gerar o design da tela. Só escreva código após ter o design aprovado.

```
/ui-ux-pro-max-skill <descrição da tela ou componente>
```

Exemplos de uso obrigatório:
- Tela de login (redirect Keycloak)
- Página principal do jogo (crash chart, bet panel, bets list, history)
- Componente de histórico de rodadas
- Dialog de verificação provably fair
- Player summary / wallet display

## UI/UX

- **Dark mode obrigatório** — fundo escuro, acentos neon/vibrantes.
- **Responsivo** — funcionar em desktop e mobile.
- **Loading states** — usar skeleton ou spinner enquanto dados carregam.
- **Toast notifications** — erros de rede, saldo insuficiente, aposta rejeitada, cashout confirmado.
- **Animações** — multiplicador sobe com curva suave, feedback visual de cashout, animação de crash.
- Não usar `alert()` ou `confirm()` — sempre toasts ou modais de shadcn.

## Dinheiro

- **Nunca** usar ponto flutuante para valores monetários.
- A API retorna e recebe `amountCents` como string (ex: `"1050"` = R$ 10,50).
- Exibir para o usuário em formato decimal (ex: `10.50`).
- Input do usuário em decimal — converter para centavos antes de enviar à API.
- Usar `lib/format-money.ts` para todas as conversões e formatações.

## Variáveis de Ambiente

Prefixo `NEXT_PUBLIC_` para variáveis acessíveis no browser:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=http://localhost:4001
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=crash-game
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=crash-game-client
```

Manter `.env.example` com todas as variáveis documentadas.

## Testes (Passo 20)

- Runner: Bun test ou Vitest.
- Testar: `format-money.ts` (conversões de centavos), lógica de payout estimado, guards de autenticação.
- Rodar com: `cd frontend && bun test`.

## O que não fazer

- Não armazenar tokens em localStorage.
- Não fazer chamadas de API diretamente em Server Components sem necessidade — preferir Client Components para dados em tempo real.
- Não duplicar estado entre Zustand e TanStack Query — Query para dados do servidor, Zustand para estado de UI e eventos WebSocket.
- Não enviar ações de jogo via WebSocket — só REST.
- Não calcular payout final no frontend — apenas estimativa visual.
- Não usar `any` sem justificativa.
