import { config } from 'dotenv';

import { defineConfig } from 'prisma/config';

config({
  path: process.cwd().endsWith('/services/wallets') ? '.env' : 'services/wallets/.env',
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun run src/infrastructure/seed/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
