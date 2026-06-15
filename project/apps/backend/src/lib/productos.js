import prisma from './prisma.js'

// Snapshot de categoría/costo de productos al momento de venderlos (para reportes y margen).
// Devuelve un map { [productoId]: { categoria, costo } }. costo es UNITARIO.
export const snapshotProductos = async (clubId, ids) => {
  const limpios = [...new Set((ids || []).filter(Boolean))]
  if (limpios.length === 0) return {}
  const prods = await prisma.producto.findMany({
    where: { id: { in: limpios }, clubId },
    select: { id: true, categoria: true, costo: true },
  })
  return Object.fromEntries(prods.map((p) => [p.id, { categoria: p.categoria, costo: p.costo }]))
}
