-- CreateTable
CREATE TABLE "torneos" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categorias" TEXT[],
    "formato" TEXT NOT NULL DEFAULT 'Eliminación directa',
    "genero" TEXT NOT NULL DEFAULT 'Masculino',
    "estado" TEXT NOT NULL DEFAULT 'draft',
    "cupoLibre" BOOLEAN NOT NULL DEFAULT false,
    "cuposPorCategoria" JSONB NOT NULL DEFAULT '{}',
    "cupoEspera" INTEGER NOT NULL DEFAULT 5,
    "canchasAsignadas" INTEGER[],
    "fechaInicio" TEXT,
    "fechaFin" TEXT,
    "fechaLimiteInscripcion" TEXT,
    "diaInicioEliminatoria" TEXT,
    "horaInicioEliminatoria" TEXT,
    "descripcion" TEXT,
    "grupos" JSONB,
    "brackets" JSONB,
    "ganador" TEXT,
    "subcampeon" TEXT,
    "personalizacion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "torneos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parejas" (
    "id" TEXT NOT NULL,
    "torneoId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "jugador1" TEXT NOT NULL,
    "jugador2" TEXT NOT NULL,
    "jugador1Dni" TEXT,
    "jugador2Dni" TEXT,
    "categoria" TEXT NOT NULL,
    "fecha" TEXT,
    "disponibilidad" JSONB,
    "prefiereMismoDia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parejas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parejas" ADD CONSTRAINT "parejas_torneoId_fkey" FOREIGN KEY ("torneoId") REFERENCES "torneos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
