-- CreateEnum
CREATE TYPE "RecursoTipo" AS ENUM ('educacion', 'deporte', 'cultura');

-- CreateTable
CREATE TABLE "Recurso" (
    "id" TEXT NOT NULL,
    "tipo" "RecursoTipo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "contacto" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);
