/*
  Warnings:

  - You are about to drop the column `internalUserId` on the `Session` table. All the data in the column will be lost.
  - Added the required column `principalId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `principalType` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PrincipalType" AS ENUM ('internal_user', 'student');

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_internalUserId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "internalUserId",
ADD COLUMN     "principalId" TEXT NOT NULL,
ADD COLUMN     "principalType" "PrincipalType" NOT NULL;

-- CreateIndex
CREATE INDEX "Session_principalType_principalId_idx" ON "Session"("principalType", "principalId");
