-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('DEBIT', 'CREDIT', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "balance_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "round_id" TEXT,
    "bet_id" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "balance_after_cents" BIGINT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_player_id_key" ON "wallets"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_operation_id_key" ON "ledger_entries"("operation_id");

-- CreateIndex
CREATE INDEX "ledger_entries_wallet_id_idx" ON "ledger_entries"("wallet_id");

-- CreateIndex
CREATE INDEX "ledger_entries_round_id_bet_id_idx" ON "ledger_entries"("round_id", "bet_id");

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
