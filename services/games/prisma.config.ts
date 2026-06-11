import { config } from 'dotenv';

import { defineConfig } from 'prisma/config';

config({
  path: process.cwd().endsWith('/services/games') ? '.env' : 'services/games/.env',
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
