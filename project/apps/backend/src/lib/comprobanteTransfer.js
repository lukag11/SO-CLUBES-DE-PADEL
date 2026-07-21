// Registrar el comprobante de una transferencia YA cobrada del lado ADMIN. Sube la foto a
// Storage, la IA lee el monto para cruzarlo, y crea un AvisoTransferencia ya 'aprobado'
// (via:'admin') → aparece en Pagados "Ver comprobante". NO imputa (la plata ya se cobró).
// Reusado por Cobrar cuenta, Venta y Mesa. Best-effort: si algo falla, no rompe el cobro.
import prisma from './prisma.js'
import { uploadImage } from './imageUpload.js'
import { extraerComprobanteTransferencia, veredictoTransferencia } from './ocrComprobante.js'

export async function registrarComprobanteAdmin({ clubId, jugadorId, items, monto, comprobante, pagoId = null }) {
  // Requiere jugador (el AvisoTransferencia se ancla a un jugador) + un monto de transferencia > 0.
  if (!comprobante || typeof comprobante !== 'string' || !jugadorId || !(monto > 0)) return null
  try {
    const { url: comprobanteUrl } = await uploadImage(comprobante, { profile: 'default', folder: `comprobantes/${clubId}` })
    if (!comprobanteUrl) return null
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { config: true } })
    const aliasClub = club?.config?.aliasTransferencia || ''
    let iaMonto = null, iaAlias = null, iaFecha = null, iaResumen = null, iaVeredicto = 'sin_comprobante'
    try {
      const ia = await extraerComprobanteTransferencia(comprobante)
      iaMonto = ia.monto; iaAlias = ia.aliasDestino; iaFecha = ia.fecha
      iaResumen = [ia.origen ? `de ${ia.origen}` : null, ia.titularDestino ? `para ${ia.titularDestino}` : null].filter(Boolean).join(' · ') || null
      iaVeredicto = veredictoTransferencia({ iaMonto: ia.monto, iaAlias: ia.aliasDestino, iaCbu: ia.cbuDestino, montoEsperado: monto, aliasClub })
    } catch (e) { console.error('[comprobante admin] OCR', e.message); iaVeredicto = 'dudoso' }
    return await prisma.avisoTransferencia.create({
      data: { clubId, jugadorId, items, montoDeclarado: monto, comprobanteUrl, iaMonto, iaAlias, iaFecha, iaResumen, iaVeredicto, estado: 'aprobado', via: 'admin', pagoId, resueltoAt: new Date() },
    })
  } catch (e) { console.error('[comprobante admin]', e.message); return null }
}
