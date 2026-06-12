FROM oven/bun:1-alpine

WORKDIR /app
RUN apk add --no-cache curl

COPY package.json bun.lock ./
COPY services/games/package.json services/games/package.json
COPY services/wallets/package.json services/wallets/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .

WORKDIR /app/services/games

EXPOSE 4001

CMD ["sh", "-c", "bunx prisma generate --config prisma.config.ts && bunx prisma migrate deploy --config prisma.config.ts && bun run start"]
