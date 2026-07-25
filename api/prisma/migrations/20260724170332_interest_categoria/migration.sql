-- CreateEnum
CREATE TYPE "CategoriaInteres" AS ENUM ('deporte', 'cultura', 'arte', 'tecnologia');

-- AlterTable
ALTER TABLE "Interest" ADD COLUMN     "categoria" "CategoriaInteres" NOT NULL DEFAULT 'tecnologia';
