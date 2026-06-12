ALTER TABLE "rounds" ADD COLUMN "previous_server_seed_hash" TEXT;
ALTER TABLE "rounds" ADD COLUMN "hash_chain_index" INTEGER;

CREATE INDEX "rounds_hash_chain_index_idx" ON "rounds"("hash_chain_index");
