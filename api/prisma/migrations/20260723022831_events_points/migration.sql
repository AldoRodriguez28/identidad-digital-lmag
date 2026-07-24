-- CreateEnum
CREATE TYPE "EventoCategoria" AS ENUM ('deportivo', 'cultural', 'taller');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('evento', 'ajuste');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" "EventoCategoria" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "lugar" TEXT NOT NULL,
    "puntosOtorgados" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCheckin" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "otorgadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsMovement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "referencia" TEXT,
    "puntos" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventCheckin_eventId_studentId_key" ON "EventCheckin"("eventId", "studentId");

-- AddForeignKey
ALTER TABLE "EventCheckin" ADD CONSTRAINT "EventCheckin_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCheckin" ADD CONSTRAINT "EventCheckin_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsMovement" ADD CONSTRAINT "PointsMovement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
