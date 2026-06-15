// Helpers de stock. Solo afectan productos con controlaStock = true.
// lineas: [{ productoId, cantidad }]. db puede ser prisma o un tx.

const moverStock = async (db, clubId, lineas, signo, tipo, ref) => {
  const items = (lineas || []).filter((l) => l.productoId && l.cantidad > 0)
  if (items.length === 0) return
  const ids = [...new Set(items.map((l) => l.productoId))]
  const prods = await db.producto.findMany({ where: { id: { in: ids }, clubId, controlaStock: true }, select: { id: true } })
  const controla = new Set(prods.map((p) => p.id))
  for (const l of items) {
    if (!controla.has(l.productoId)) continue
    await db.producto.update({ where: { id: l.productoId }, data: { stock: { increment: signo * l.cantidad } } })
    await db.movimientoStock.create({
      data: { clubId, productoId: l.productoId, tipo, cantidad: signo * l.cantidad, costoUnit: ref.costoUnit ?? null, motivo: ref.motivo ?? null, refTipo: ref.tipo ?? null, refId: ref.id ?? null },
    })
  }
}

// Salida por venta/consumo
export const descontarStock = (db, clubId, lineas, ref = {}) => moverStock(db, clubId, lineas, -1, 'salida', { motivo: 'Venta', ...ref })
// Reposición por anulación/eliminación de una venta
export const reponerStock = (db, clubId, lineas, ref = {}) => moverStock(db, clubId, lineas, +1, 'ajuste', { motivo: 'Anulación', ...ref })
// Entrada por compra (factura proveedor) — actualiza también el costo del producto
export const ingresarStock = async (db, clubId, lineas, ref = {}) => {
  for (const l of (lineas || []).filter((x) => x.productoId && x.cantidad > 0)) {
    const data = { stock: { increment: l.cantidad } }
    if (l.costoUnit != null) data.costo = Math.round(Number(l.costoUnit))
    if (!l.controlaStock) data.controlaStock = true // si entra a stock, queda controlado
    await db.producto.update({ where: { id: l.productoId }, data })
    await db.movimientoStock.create({
      data: { clubId, productoId: l.productoId, tipo: 'entrada', cantidad: l.cantidad, costoUnit: l.costoUnit != null ? Math.round(Number(l.costoUnit)) : null, motivo: ref.motivo ?? 'Compra', refTipo: ref.tipo ?? 'gasto', refId: ref.id ?? null },
    })
  }
}
