FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY services/games/package.json services/games/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install

COPY . .

WORKDIR /app/services/games

EXPOSE 4001

CMD ["bun", "run", "src/main.ts"]
