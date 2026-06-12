FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY services/wallets/package.json services/wallets/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install

COPY . .

WORKDIR /app/services/wallets

EXPOSE 4002

CMD ["bun", "run", "src/main.ts"]
