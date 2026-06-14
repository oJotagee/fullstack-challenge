# Provably Fair

## Objetivo

O crash point precisa ser definido antes da rodada e verificavel depois. O jogador deve conseguir conferir que o servidor nao alterou o resultado apos receber apostas.

## Componentes

- `serverSeed`: segredo usado pelo servidor para calcular o crash.
- `serverSeedHash`: hash SHA-256 publicado antes da rodada.
- `clientSeed`: seed publica do cliente/ambiente.
- `nonce`: numero da rodada dentro da sequencia.
- `crashPoint`: multiplicador calculado por HMAC.

Implementacao principal:

```text
services/games/src/domain/provably-fair/crash-point-calculator.ts
```

## Hash Antes da Rodada

Antes da rodada, o Game publica apenas:

```text
serverSeedHash = sha256(serverSeed)
```

Isso compromete o servidor com uma seed sem revelar o valor.

## Calculo do Crash Point

Depois que a rodada inicia, o crash point e calculado com:

```text
HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`)
```

O codigo usa os primeiros 13 caracteres hexadecimais do HMAC, converte para numero, normaliza por `0x1fffffffffffff` e aplica a formula:

```text
raw = 0.99 / max(1 - ratio, 0.000001)
crashPoint = max(1, floor(raw * 100) / 100)
```

O resultado fica com duas casas decimais.

## Hash Chain

A engine cria uma hash chain reversa a partir de uma seed terminal:

```text
terminalSeed -> sha256 -> sha256 -> ... -> rootHash
```

As rodadas consomem a cadeia de tras para frente. Revelar a seed da rodada encerrada nao permite descobrir a proxima seed futura.

Configuracoes:

```env
ROUND_HASH_CHAIN_SEED=local-development-hash-chain-seed
ROUND_HASH_CHAIN_LENGTH=10000
```

## Verificacao Pelo Jogador

Para verificar uma rodada encerrada:

1. Chame `GET /games/rounds/:roundId/verify`.
2. Pegue `serverSeed`, `serverSeedHash`, `clientSeed`, `nonce` e `crashPoint`.
3. Calcule `sha256(serverSeed)`.
4. Compare com `serverSeedHash`.
5. Recalcule o HMAC com `clientSeed` e `nonce`.
6. Compare o crash point recalculado com o retornado pela API.

Endpoint:

```text
GET http://localhost:8000/games/rounds/:roundId/verify
```

## O Que Isso Garante

- O servidor nao consegue trocar a seed depois de publicar o hash.
- O resultado e deterministico.
- O jogador consegue recalcular o crash point.
- A seed revelada nao entrega a proxima seed da cadeia.

## Limites e Proximos Passos

- A `clientSeed` atual e configurada no servidor para o desafio. Uma evolucao seria permitir seed publica rotacionavel ou combinada com entropia externa.
- O algoritmo esta isolado em dominio e coberto por testes unitarios, mas a UI ainda pode exibir uma tela de verificacao mais completa para o usuario copiar/recalcular dados.
- Em producao, eu armazenaria e exibiria tambem metadados da hash chain, como indice e root hash da cadeia ativa.
