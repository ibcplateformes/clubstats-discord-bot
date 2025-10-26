-- CreateTable
CREATE TABLE "discord_player_mappings" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "discord_username" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discord_player_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discord_player_mappings_discord_username_key" ON "discord_player_mappings"("discord_username");

-- CreateIndex
CREATE UNIQUE INDEX "discord_player_mappings_player_id_key" ON "discord_player_mappings"("player_id");

-- CreateIndex
CREATE INDEX "discord_player_mappings_discord_id_idx" ON "discord_player_mappings"("discord_id");

-- CreateIndex
CREATE INDEX "discord_player_mappings_player_id_idx" ON "discord_player_mappings"("player_id");

-- AddForeignKey
ALTER TABLE "discord_player_mappings" ADD CONSTRAINT "discord_player_mappings_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (ajout colonne pin si elle n'existe pas déjà)
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "pin" TEXT;
