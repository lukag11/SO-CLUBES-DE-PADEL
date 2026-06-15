// Recibo imprimible + exportación CSV de cobranzas. Todo en cliente (sin backend).
import { METODO_MAP } from '../../lib/metodosPago'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// Abre una ventana con el recibo de un pago y dispara la impresión.
// No es un comprobante fiscal — es una constancia interna de pago.
export const imprimirRecibo = (deuda, club) => {
  const fecha = deuda.pagadoAt ? new Date(deuda.pagadoAt) : new Date()
  const fechaStr = fecha.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const metodo = METODO_MAP[deuda.metodoPago]?.label ?? deuda.metodoPago ?? '—'
  const jugador = `${deuda.jugador?.nombre ?? ''} ${deuda.jugador?.apellido ?? ''}`.trim() || '—'
  const nro = String(deuda.refId ?? '').slice(-6).toUpperCase()
  const logo = club?.logo ? `<img src="${esc(club.logo)}" style="max-height:48px;max-width:140px;object-fit:contain" />` : ''
  const win = window.open('', '_blank', 'width=420,height=640')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Recibo ${esc(nro)}</title>
  <style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
    body{margin:0;padding:28px;color:#1e293b}
    .head{text-align:center;border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:18px}
    .club{font-size:18px;font-weight:700;margin-top:6px}
    h1{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:18px 0 4px}
    .nro{font-size:12px;color:#94a3b8}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px}
    .row .l{color:#64748b}
    .row .v{font-weight:600;text-align:right}
    .total{display:flex;justify-content:space-between;margin-top:18px;padding-top:14px;border-top:2px solid #e2e8f0;font-size:20px;font-weight:800}
    .foot{margin-top:24px;text-align:center;font-size:11px;color:#94a3b8}
    @media print{body{padding:12px}}
  </style></head><body>
    <div class="head">${logo}<div class="club">${esc(club?.nombre || 'Club de Pádel')}</div></div>
    <h1>Recibo de pago</h1>
    <div class="nro">Comprobante #${esc(nro)} · ${esc(fechaStr)}</div>
    <div style="margin-top:16px">
      <div class="row"><span class="l">Jugador</span><span class="v">${esc(jugador)}</span></div>
      ${deuda.jugador?.dni ? `<div class="row"><span class="l">DNI</span><span class="v">${esc(deuda.jugador.dni)}</span></div>` : ''}
      <div class="row"><span class="l">Concepto</span><span class="v">${esc(deuda.concepto)}</span></div>
      <div class="row"><span class="l">Método</span><span class="v">${esc(metodo)}</span></div>
    </div>
    <div class="total"><span>Total</span><span>${esc(money(deuda.monto))}</span></div>
    <div class="foot">Constancia interna de pago · ${esc(club?.nombre || '')}</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`)
  win.document.close()
}

// ── Ticket de consumo (mesa / venta) ────────────────────────────────────────
// ticket: { etiqueta?, items:[{nombre, cantidad, monto}], total, metodoLabel?, fecha? }
export const imprimirTicket = (ticket, club) => {
  const fecha = (ticket.fecha ? new Date(ticket.fecha) : new Date()).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const filas = (ticket.items || []).map((i) => `<tr><td>${i.cantidad > 1 ? `${i.cantidad}× ` : ''}${esc(i.nombre)}</td><td style="text-align:right">${esc(money(i.monto))}</td></tr>`).join('')
  const logo = club?.logo ? `<img src="${esc(club.logo)}" style="max-height:42px;max-width:120px;object-fit:contain" />` : ''
  const win = window.open('', '_blank', 'width=320,height=600')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket</title>
  <style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,monospace}
    body{margin:0;padding:16px;color:#1e293b;width:280px}
    .head{text-align:center;border-bottom:1px dashed #cbd5e1;padding-bottom:10px;margin-bottom:10px}
    .club{font-size:15px;font-weight:700;margin-top:4px}
    .meta{font-size:11px;color:#64748b;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td{padding:3px 0}
    .total{display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px dashed #cbd5e1;font-size:16px;font-weight:800}
    .pago{font-size:12px;color:#64748b;text-align:right;margin-top:4px}
    .foot{margin-top:14px;text-align:center;font-size:10px;color:#94a3b8}
    @media print{body{padding:6px}}
  </style></head><body>
    <div class="head">${logo}<div class="club">${esc(club?.nombre || 'Club de Pádel')}</div>
      ${ticket.etiqueta ? `<div class="meta">${esc(ticket.etiqueta)}</div>` : ''}<div class="meta">${esc(fecha)}</div></div>
    <table>${filas}</table>
    <div class="total"><span>Total</span><span>${esc(money(ticket.total))}</span></div>
    ${ticket.metodoLabel ? `<div class="pago">Pago: ${esc(ticket.metodoLabel)}</div>` : ''}
    <div class="foot">¡Gracias! · Comprobante no fiscal</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`)
  win.document.close()
}

// Texto del ticket para enviar por WhatsApp
export const ticketTexto = (ticket, club) => {
  const lineas = (ticket.items || []).map((i) => `• ${i.cantidad > 1 ? `${i.cantidad}× ` : ''}${i.nombre} — ${money(i.monto)}`).join('\n')
  return [`*${club?.nombre ?? 'Club de Pádel'}*`, ticket.etiqueta || '', '', lineas, '', `*Total: ${money(ticket.total)}*`, ticket.metodoLabel ? `Pago: ${ticket.metodoLabel}` : '', '', '¡Gracias!'].filter((l) => l !== null && l !== undefined).join('\n')
}

// Abre WhatsApp con el texto (y número opcional del cliente)
export const enviarWhatsApp = (texto, telefono = '') => {
  const tel = String(telefono || '').replace(/\D/g, '')
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(texto)}`, '_blank')
}

// Genera un reporte PDF branded (vía impresión del navegador → "Guardar como PDF").
// deudas: lista filtrada; club: para logo/nombre/color; filtroLabel: descripción del filtro aplicado.
export const generarReporteCobranzas = (deudas, club, filtroLabel = 'Todas') => {
  const TIPO = { cancelacion: 'Cancelación', manual: 'Manual', reserva: 'Turno', torneo: 'Torneo', producto: 'Producto' }
  const color = club?.colorPrimario || '#afca0b'
  const hoy = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const logo = club?.logo ? `<img src="${esc(club.logo)}" style="max-height:46px;max-width:150px;object-fit:contain" />` : ''

  const pendientes = deudas.filter((d) => d.estado === 'pendiente')
  const pagadas = deudas.filter((d) => d.estado === 'pagado')
  const totalPend = pendientes.reduce((s, d) => s + (d.monto ?? 0), 0)
  const totalPag = pagadas.reduce((s, d) => s + (d.monto ?? 0), 0)

  const estadoChip = (d) => {
    if (d.estado === 'pagado') return '<span style="color:#059669;font-weight:600">Pagado</span>'
    if (d.vencido) return '<span style="color:#e11d48;font-weight:600">Vencido</span>'
    return '<span style="color:#d97706;font-weight:600">Pendiente</span>'
  }
  const filas = deudas.map((d, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}">
    <td>${esc(`${d.jugador?.nombre ?? ''} ${d.jugador?.apellido ?? ''}`.trim() || '—')}</td>
    <td>${esc(d.concepto)}</td>
    <td>${esc(TIPO[d.tipo] ?? d.tipo)}</td>
    <td>${estadoChip(d)}</td>
    <td>${esc(METODO_MAP[d.metodoPago]?.label ?? '—')}</td>
    <td style="text-align:right;font-weight:600">${esc(money(d.monto))}</td>
  </tr>`).join('')

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de cobranzas</title>
  <style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
    body{margin:0;padding:32px;color:#1e293b;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${color};padding-bottom:16px;margin-bottom:20px}
    .club{font-size:20px;font-weight:800}
    .meta{text-align:right;font-size:12px;color:#64748b}
    h1{font-size:16px;margin:0 0 4px}
    .chips{display:flex;gap:12px;margin:18px 0}
    .chip{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px}
    .chip .l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
    .chip .v{font-size:20px;font-weight:800;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;border-bottom:2px solid #e2e8f0;padding:8px 10px}
    th:last-child{text-align:right}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
    .foot{margin-top:18px;text-align:center;font-size:11px;color:#94a3b8}
    @media print{body{padding:14px} tr{break-inside:avoid}}
  </style></head><body>
    <div class="head">
      <div>${logo}<div class="club">${esc(club?.nombre || 'Club de Pádel')}</div></div>
      <div class="meta"><h1>Reporte de cobranzas</h1>Filtro: ${esc(filtroLabel)}<br/>Generado: ${esc(hoy)}</div>
    </div>
    <div class="chips">
      <div class="chip"><div class="l">Registros</div><div class="v">${deudas.length}</div></div>
      <div class="chip"><div class="l">Pendiente</div><div class="v" style="color:#d97706">${esc(money(totalPend))}</div></div>
      <div class="chip"><div class="l">Pagado</div><div class="v" style="color:#059669">${esc(money(totalPag))}</div></div>
    </div>
    <table>
      <thead><tr><th>Jugador</th><th>Concepto</th><th>Tipo</th><th>Estado</th><th>Método</th><th>Monto</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:24px">Sin registros</td></tr>'}</tbody>
    </table>
    <div class="foot">${esc(club?.nombre || '')} · Reporte interno de cobranzas</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`)
  win.document.close()
}

// ── Reporte y CSV de GASTOS ──────────────────────────────────────────────────
// gastos: lista filtrada; club: branding; filtroLabel: descripción del filtro.
export const generarReporteGastos = (gastos, club, filtroLabel = 'Todos') => {
  const color = club?.colorPrimario || '#afca0b'
  const hoy = new Date().toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const logo = club?.logo ? `<img src="${esc(club.logo)}" style="max-height:46px;max-width:150px;object-fit:contain" />` : ''
  const fmt = (d) => d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-AR') : ''

  const pagados = gastos.filter((g) => g.pagado)
  const pendientes = gastos.filter((g) => !g.pagado)
  const totalPag = pagados.reduce((s, g) => s + (g.monto ?? 0), 0)
  const totalPend = pendientes.reduce((s, g) => s + (g.monto ?? 0), 0)

  const filas = gastos.map((g, i) => `<tr style="background:${i % 2 ? '#f8fafc' : '#fff'}">
    <td>${esc(fmt(g.fecha))}</td>
    <td>${esc(g.concepto)}</td>
    <td>${esc(g.proveedor || '—')}</td>
    <td>${esc(g.categoria || '—')}</td>
    <td>${g.pagado ? '<span style="color:#059669;font-weight:600">Pagado</span>' : '<span style="color:#d97706;font-weight:600">A pagar</span>'}</td>
    <td>${esc(g.pagado ? (METODO_MAP[g.metodoPago]?.label ?? '—') : '—')}</td>
    <td style="text-align:right;font-weight:600">${esc(money(g.monto))}</td>
  </tr>`).join('')

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reporte de gastos</title>
  <style>
    *{box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,sans-serif}
    body{margin:0;padding:32px;color:#1e293b;font-size:13px}
    .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid ${color};padding-bottom:16px;margin-bottom:20px}
    .club{font-size:20px;font-weight:800}
    .meta{text-align:right;font-size:12px;color:#64748b}
    h1{font-size:16px;margin:0 0 4px}
    .chips{display:flex;gap:12px;margin:18px 0}
    .chip{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px}
    .chip .l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
    .chip .v{font-size:20px;font-weight:800;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;border-bottom:2px solid #e2e8f0;padding:8px 10px}
    th:last-child{text-align:right}
    td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
    .foot{margin-top:18px;text-align:center;font-size:11px;color:#94a3b8}
    @media print{body{padding:14px} tr{break-inside:avoid}}
  </style></head><body>
    <div class="head">
      <div>${logo}<div class="club">${esc(club?.nombre || 'Club de Pádel')}</div></div>
      <div class="meta"><h1>Reporte de gastos</h1>Filtro: ${esc(filtroLabel)}<br/>Generado: ${esc(hoy)}</div>
    </div>
    <div class="chips">
      <div class="chip"><div class="l">Registros</div><div class="v">${gastos.length}</div></div>
      <div class="chip"><div class="l">A pagar</div><div class="v" style="color:#d97706">${esc(money(totalPend))}</div></div>
      <div class="chip"><div class="l">Pagado</div><div class="v" style="color:#059669">${esc(money(totalPag))}</div></div>
    </div>
    <table>
      <thead><tr><th>Fecha</th><th>Concepto</th><th>Proveedor</th><th>Categoría</th><th>Estado</th><th>Método</th><th>Monto</th></tr></thead>
      <tbody>${filas || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:24px">Sin registros</td></tr>'}</tbody>
    </table>
    <div class="foot">${esc(club?.nombre || '')} · Reporte interno de gastos</div>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`)
  win.document.close()
}

export const exportarGastosCSV = (gastos, nombreArchivo = 'gastos') => {
  const cols = ['Fecha', 'Concepto', 'Proveedor', 'Categoría', 'Monto', 'Estado', 'Método', 'N° factura', 'Pagado el']
  const celda = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const fmt = (d) => d ? new Date(d).toLocaleDateString('es-AR') : ''
  const filas = gastos.map((g) => [
    fmt(g.fecha), g.concepto, g.proveedor ?? '', g.categoria ?? '', g.monto,
    g.pagado ? 'Pagado' : 'A pagar', METODO_MAP[g.metodoPago]?.label ?? '', g.numeroFactura ?? '', fmt(g.pagadoAt),
  ].map(celda).join(';'))
  const csv = '﻿' + [cols.join(';'), ...filas].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Descarga un CSV (compatible Excel es-AR) con las cobranzas dadas.
export const exportarCobranzasCSV = (deudas, nombreArchivo = 'cobranzas') => {
  const cols = ['Fecha', 'Jugador', 'DNI', 'Concepto', 'Tipo', 'Monto', 'Estado', 'Método', 'Pagado el']
  const celda = (v) => {
    const s = String(v ?? '')
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const fmt = (d) => d ? new Date(d).toLocaleDateString('es-AR') : ''
  const filas = deudas.map((d) => [
    fmt(d.fecha), `${d.jugador?.nombre ?? ''} ${d.jugador?.apellido ?? ''}`.trim(),
    d.jugador?.dni ?? '', d.concepto, d.tipo, d.monto, d.estado,
    METODO_MAP[d.metodoPago]?.label ?? d.metodoPago ?? '', fmt(d.pagadoAt),
  ].map(celda).join(';'))
  // ';' como separador (Excel es-AR) + BOM para acentos
  const csv = '﻿' + [cols.join(';'), ...filas].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
