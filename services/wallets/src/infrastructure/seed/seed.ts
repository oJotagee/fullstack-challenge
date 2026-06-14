import { PrismaClient } from '@generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // playerId = preferred_username do Keycloak (conforme jwt-auth.guard.ts)
  const playerId = 'player';
  const walletId = 'wallet-player-seed';
  const initialBalance = 100_000n; // $ 1.000,00

  await prisma.wallet.upsert({
    where: { playerId },
    create: {
      id: walletId,
      playerId,
      balanceCents: initialBalance,
    },
    update: {
      balanceCents: initialBalance,
    },
  });

  console.log(`Wallet seed: playerId=${playerId} balance=${initialBalance} cents ($ 1.000,00)`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
