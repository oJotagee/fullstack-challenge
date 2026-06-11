-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('BETTING', 'RUNNING', 'CRASHED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING_DEBIT', 'ACCEPTED', 'REJECTED', 'CASHED_OUT', 'LOST');

-- CreateEnum
CREATE TYPE "BetRejectedReason" AS ENUM ('INSUFFICIENT_FUNDS', 'DUPLICATED_BET', 'ROUND_NOT_BETTING', 'UNKNOWN');

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'BETTING',
    "server_seed_hash" TEXT NOT NULL,
    "server_seed" TEXT,
    "client_seed" TEXT,
    "nonce" INTEGER,
    "crash_point" DECIMAL(10,4),
    "betting_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "betting_ends_at" TIMESTAMP(3) NOT NULL,
    "running_started_at" TIMESTAMP(3),
    "crashed_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING_DEBIT',
    "rejected_reason" "BetRejectedReason",
    "cashout_multiplier" DECIMAL(10,4),
    "payout_cents" BIGINT,
    "debit_operation_id" TEXT,
    "credit_operation_id" TEXT,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "cashed_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rounds_status_idx" ON "rounds"("status");

-- CreateIndex
CREATE INDEX "rounds_created_at_idx" ON "rounds"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "bets_debit_operation_id_key" ON "bets"("debit_operation_id");

-- CreateIndex
CREATE UNIQUE INDEX "bets_credit_operation_id_key" ON "bets"("credit_operation_id");

-- CreateIndex
CREATE INDEX "bets_player_id_idx" ON "bets"("player_id");

-- CreateIndex
CREATE INDEX "bets_round_id_status_idx" ON "bets"("round_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bets_round_id_player_id_key" ON "bets"("round_id", "player_id");

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_round_id_fkey" FOREIGN KEY ("round_id") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
