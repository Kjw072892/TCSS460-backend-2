/*
  Warnings:

  - Added the required column `author_id` to the `sayings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sayings" ADD COLUMN     "author_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "sayings" ADD CONSTRAINT "sayings_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
