-- CreateEnum
CREATE TYPE "Nivel" AS ENUM ('bronce', 'plata', 'oro', 'diamante');

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "curp" TEXT NOT NULL,
    "sexo" TEXT NOT NULL,
    "escolaridad" TEXT NOT NULL,
    "anioVigenciaCredencial" INTEGER,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "codigoPostal" TEXT NOT NULL,
    "numExt" TEXT NOT NULL,
    "numInt" TEXT,
    "entreCalles" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "tiktok" TEXT,
    "whatsapp" TEXT,
    "ineFrente" TEXT,
    "ineReverso" TEXT,
    "nivel" "Nivel" NOT NULL DEFAULT 'bronce',
    "puntosAcumulados" INTEGER NOT NULL DEFAULT 0,
    "credentialToken" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInterest" (
    "studentId" TEXT NOT NULL,
    "interestId" TEXT NOT NULL,

    CONSTRAINT "StudentInterest_pkey" PRIMARY KEY ("studentId","interestId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_curp_key" ON "Student"("curp");

-- CreateIndex
CREATE UNIQUE INDEX "Student_correo_key" ON "Student"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Student_credentialToken_key" ON "Student"("credentialToken");

-- CreateIndex
CREATE UNIQUE INDEX "Interest_nombre_key" ON "Interest"("nombre");

-- AddForeignKey
ALTER TABLE "StudentInterest" ADD CONSTRAINT "StudentInterest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInterest" ADD CONSTRAINT "StudentInterest_interestId_fkey" FOREIGN KEY ("interestId") REFERENCES "Interest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
