import { Prisma } from '@prisma/client'
import prisma from './prisma.js'

// Ejecuta el chequeo-de-conflicto + escritura en una transacción Serializable.
// READ COMMITTED (el default de Postgres) NO impide el doble-booking: dos requests
// simultáneos pueden pasar ambos la validación y escribir para el mismo slot (TOCTOU).
// En Serializable, Postgres aborta una de las dos con un error de serialización
// (P2034 / 40001); reintentamos y, al re-correr el chequeo, esa segunda transacción
// ya ve la fila commiteada y devuelve el 409 limpio.
//
// Usar SIEMPRE que un endpoint cree o confirme reservas / turnos fijos / clases.
export const runSerializable = async (fn, retries = 2) => {
  for (let intento = 0; ; intento++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (err) {
      const serializationFail = err?.code === 'P2034' || err?.code === '40001'
      if (serializationFail && intento < retries) continue
      throw err
    }
  }
}
