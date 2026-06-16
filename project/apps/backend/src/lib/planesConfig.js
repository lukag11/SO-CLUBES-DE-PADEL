import prisma from './prisma.js'
import { DEFAULT_MATRIZ } from './planes.js'

const CLAVE = 'planMatriz'

// Lee la matriz de planes vigente desde la DB. Si no existe todavía, devuelve la
// default (no la escribe hasta que se edite/seede explícitamente).
export const getMatriz = async () => {
  const row = await prisma.platformSetting.findUnique({ where: { clave: CLAVE } })
  return row?.valor || DEFAULT_MATRIZ
}

// Guarda (upsert) la matriz editada desde el panel.
export const setMatriz = async (matriz) => {
  const row = await prisma.platformSetting.upsert({
    where: { clave: CLAVE },
    update: { valor: matriz },
    create: { clave: CLAVE, valor: matriz },
  })
  return row.valor
}
