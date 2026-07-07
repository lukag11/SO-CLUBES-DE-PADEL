import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth, requireRole, requireOwner } from '../middleware/auth.js'
import { tienePermiso } from '../lib/permisos.js'
import { inicioMesArg, hoyArgStr, ahoraArgHHMM, rangoDiaArg, finEnMin, franjasDia } from '../lib/tiempo.js'
import { turnosImpagosDeuda } from '../lib/deudas.js'
import { gatherInsightData, generarInsightIA, generarConvocatoriaWhatsapp, gatherDisponibilidad, generarPostDisponibilidad, generarPostLiberado, responderChatAgente } from '../lib/insight.js'
import { organizarConvocatoria, crearConvocatoriaCompleta } from '../lib/convocatorias.js'
import { normalizarCategoria } from '../lib/categorias.js'
import { nivelDeCategoria, catCorta, registrarCambioCategoria } from '../lib/ascenso.js'

const router = Router()

// Convenciones de día: config.horarios usa capitalizado con acento; turnoFijo.dia usa minúscula sin acento.
const DIAS_CFG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_TF  = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LBL = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const toMinT = (t) => { const [h, m] = (t || '0:0').split(':').map(Number); return h * 60 + m }
// franjasDia vive en tiempo.js (fuente única, cross-midnight aware).
// 'YYYY-MM-DD' de hace N días (en ARG) a partir del string de hoy.
const fechaArgMenos = (hoyStr, n) => {
  const [y, m, d] = hoyStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d - n))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
// Día ARG ('YYYY-MM-DD') de un instante UTC (pagadoAt/createdAt).
const argDayStr = (date) => {
  const a = new Date(new Date(date).getTime() - 3 * 60 * 60 * 1000)
  return `${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, '0')}-${String(a.getUTCDate()).padStart(2, '0')}`
}
const pct = (hoy, ayer) => {
  if (!ayer) return hoy > 0 ? 100 : 0
  return Math.round(((hoy - ayer) / ayer) * 100)
}

// GET /api/clubs/me   — admin obtiene la config de su club
router.get('/me', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.user.clubId },
      include: { canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } } },
    })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

// GET /api/clubs/me/dashboard — métricas reales para el resumen del admin
router.get('/me/dashboard', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    // Resumen adaptativo: lo financiero solo se incluye si el admin tiene 'caja'
    // (o es dueño). El empleado de mostrador ve lo operativo, sin números de plata.
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, select: { rol: true, permisos: true } })
    const verCaja = tienePermiso(admin, 'caja')                                  // totales/ingresos/márgenes (SENSIBLE)
    const verCobros = verCaja || tienePermiso(admin, 'ventas')                    // estado de cobro: pago de turnos, deuda por cobrar

    // Límites de fecha/hora en hora local Argentina (el server corre en UTC)
    const inicioMes = inicioMesArg()
    const hoyStr = hoyArgStr()
    const ahoraHHMM = ahoraArgHHMM()

    // Día de hoy (ARG) + día de la semana en ambas convenciones
    const ayerStr = fechaArgMenos(hoyStr, 1)
    const [hy, hm, hd] = hoyStr.split('-').map(Number)
    const wd = new Date(Date.UTC(hy, hm - 1, hd)).getUTCDay()
    const diaCfg = DIAS_CFG[wd]
    const diaTF = DIAS_TF[wd]
    // Ventana de los últimos 7 días (para la serie de tendencia)
    const dias7 = Array.from({ length: 7 }, (_, i) => fechaArgMenos(hoyStr, 6 - i)) // viejo→hoy
    const inicio7d = rangoDiaArg(dias7[0]).desde

    const [
      reservasPagadasMes, cargosPagadosMes,
      reservasHoyList, turnosFijosHoy,
      jugadoresActivos, canchas,
      torneosActivos, torneosAbiertos, deudaCargos,
      turnosFijosPendientes, reservasPendientes,
      ultimasReservas, ultimosJugadores, ultimosCargos,
      reservasPagadas7d, cargosPagados7d, reservas7d,
      reservasAyer, club, impagos,
    ] = await Promise.all([
      prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicioMes } }, select: { precio: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicioMes } }, select: { monto: true } }),
      prisma.reserva.findMany({ where: { clubId, fecha: hoyStr, estado: 'confirmada' }, select: { canchaId: true, horaInicio: true, horaFin: true, esTurnoFijo: true, tipo: true, pagado: true, jugadores: true, cancha: { select: { nombre: true } }, jugador: { select: { nombre: true, apellido: true } } } }),
      prisma.turnoFijo.findMany({ where: { clubId, dia: diaTF, estado: 'confirmado' }, select: { canchaId: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true, cancha: { select: { nombre: true } }, jugador: { select: { nombre: true, apellido: true } } } }),
      prisma.jugador.count({ where: { clubId, activo: true } }),
      prisma.cancha.findMany({ where: { clubId, activo: true }, select: { id: true, horarios: true } }),
      prisma.torneo.count({ where: { clubId, estado: { in: ['in_progress', 'open'] } } }),
      prisma.torneo.count({ where: { clubId, estado: 'open' } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pendiente' }, select: { monto: true } }),
      prisma.turnoFijo.count({ where: { clubId, estado: 'pendiente' } }),
      prisma.reserva.count({ where: { clubId, estado: 'pendiente' } }),
      prisma.reserva.findMany({ where: { clubId }, orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, fecha: true, horaInicio: true, cancha: { select: { nombre: true } }, jugador: { select: { nombre: true, apellido: true } } } }),
      prisma.jugador.findMany({ where: { clubId }, orderBy: { createdAt: 'desc' }, take: 5, select: { createdAt: true, nombre: true, apellido: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado' }, orderBy: { pagadoAt: 'desc' }, take: 5, select: { pagadoAt: true, monto: true, concepto: true } }),
      prisma.reserva.findMany({ where: { clubId, pagado: true, pagadoAt: { gte: inicio7d } }, select: { pagadoAt: true, precio: true } }),
      prisma.cargo.findMany({ where: { clubId, estado: 'pagado', pagadoAt: { gte: inicio7d } }, select: { pagadoAt: true, monto: true } }),
      prisma.reserva.findMany({ where: { clubId, estado: 'confirmada', fecha: { in: dias7 } }, select: { fecha: true } }),
      prisma.reserva.count({ where: { clubId, fecha: ayerStr, estado: 'confirmada' } }),
      prisma.club.findUnique({ where: { id: clubId }, select: { config: true } }),
      turnosImpagosDeuda(clubId),
    ])

    const sumPrecio = (arr) => arr.reduce((s, r) => s + (r.precio ?? 0), 0)
    const sumMonto = (arr) => arr.reduce((s, r) => s + (r.monto ?? 0), 0)

    // ── Ingresos día/mes (el del día se recalcula desde la serie 7d, abajo) ──
    const ingresosMes = sumPrecio(reservasPagadasMes) + sumMonto(cargosPagadosMes)

    // ── Ocupación del día: slots ocupados / slots disponibles ──
    const horariosClub = club?.config?.horarios || {}
    let slotsTotales = 0
    for (const c of canchas) {
      const h = (c.horarios && c.horarios[diaCfg]) || horariosClub[diaCfg]
      slotsTotales += franjasDia(h)
    }
    // Turnos fijos vigentes hoy, deduplicando los que ya tienen una reserva materializada
    // (un TF puntual creado por el admin genera una Reserva esTurnoFijo + el TF virtual → no contar dos veces).
    const reservaTFKeys = new Set(reservasHoyList.filter((r) => r.esTurnoFijo).map((r) => `${r.canchaId}|${r.horaInicio}`))
    const tfHoyActivos = turnosFijosHoy
      .filter((t) => !t.diasAusentes.includes(hoyStr) && (!t.desde || t.desde <= hoyStr))
      .filter((t) => !reservaTFKeys.has(`${t.canchaId}|${t.horaInicio}`))
    const slotsOcupados = Math.min(reservasHoyList.length + tfHoyActivos.length, slotsTotales || Infinity)
    const ocupacionPct = slotsTotales > 0 ? Math.round((slotsOcupados / slotsTotales) * 100) : 0

    // ── Canchas en uso AHORA (snapshot) ──
    const ahoraMinOcup = toMinT(ahoraHHMM)
    // Fin cross-midnight aware vía helper único (ver tiempo.js) → no marca mal de noche.
    const enCurso = (ini, fin) => toMinT(ini) <= ahoraMinOcup && ahoraMinOcup < finEnMin(ini, fin)
    const ocupadasAhora = reservasHoyList.filter((r) => enCurso(r.horaInicio, r.horaFin)).length
      + tfHoyActivos.filter((t) => enCurso(t.horaInicio, t.horaFin)).length

    // ── Agenda de hoy (reservas + turnos fijos), ordenada por hora ──
    const nombreDe = (x) => x.jugador ? `${x.jugador.nombre} ${x.jugador.apellido ?? ''}`.trim() : (x.jugadores?.[0] ?? '')
    // El estado de pago solo se expone a quien puede cobrar (ventas/caja); sino va null (sin badge).
    const agenda = [
      ...reservasHoyList.map((r) => ({ horaInicio: r.horaInicio, horaFin: r.horaFin, cancha: r.cancha?.nombre ?? '', jugador: nombreDe(r), pagado: verCobros ? !!r.pagado : null, tipo: r.esTurnoFijo ? 'fijo' : (r.tipo || 'eventual') })),
      // Un turno fijo virtual (sin reserva materializada) no tiene cobro de hoy → impago.
      ...tfHoyActivos.map((t) => ({ horaInicio: t.horaInicio, horaFin: t.horaFin, cancha: t.cancha?.nombre ?? '', jugador: nombreDe(t), pagado: verCobros ? false : null, tipo: 'fijo' })),
    ].sort((a, b) => toMinT(a.horaInicio) - toMinT(b.horaInicio)).slice(0, 12)

    // ── Tendencia y serie de 7 días ──
    const ingDia = {}, resDia = {}
    dias7.forEach((d) => { ingDia[d] = 0; resDia[d] = 0 })
    reservasPagadas7d.forEach((r) => { const d = argDayStr(r.pagadoAt); if (d in ingDia) ingDia[d] += (r.precio ?? 0) })
    cargosPagados7d.forEach((c) => { const d = argDayStr(c.pagadoAt); if (d in ingDia) ingDia[d] += (c.monto ?? 0) })
    reservas7d.forEach((r) => { if (r.fecha in resDia) resDia[r.fecha] += 1 })
    const serie7d = dias7.map((d) => {
      const [yy, mm, dd] = d.split('-').map(Number)
      const lbl = DIAS_LBL[new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay()]
      // Los ingresos por día solo viajan si tiene 'caja' (sino ni se exponen en el payload).
      return { dia: lbl, fecha: d, reservas: resDia[d], ...(verCaja ? { ingresos: ingDia[d] } : {}) }
    })
    const ingresosDia = ingDia[hoyStr] ?? 0
    const ingresosAyer = ingDia[ayerStr] ?? 0

    // ── Necesita tu atención ──
    const montoImpagos = impagos.reduce((s, t) => s + (t.monto ?? 0), 0)
    const deudaCargosMonto = sumMonto(deudaCargos)
    const atencion = {
      turnosFijosPendientes,
      reservasPendientes,
      porCobrarCount: impagos.length + deudaCargos.length,
      torneosAbiertos,
    }

    // Feed de actividad reciente (mezcla y ordena por fecha)
    const actividad = [
      ...ultimasReservas.map((r) => ({
        createdAt: r.createdAt,
        text: `Reserva — ${r.cancha?.nombre ?? 'Cancha'} ${r.fecha} ${r.horaInicio}${r.jugador ? ` · ${r.jugador.nombre} ${r.jugador.apellido}` : ''}`,
        tipo: 'reserva',
      })),
      ...ultimosJugadores.map((j) => ({ createdAt: j.createdAt, text: `Nuevo jugador: ${j.nombre} ${j.apellido}`, tipo: 'jugador' })),
      ...(verCaja ? ultimosCargos.filter((c) => c.pagadoAt).map((c) => ({ createdAt: c.pagadoAt, text: `Pago recibido: $${(c.monto ?? 0).toLocaleString('es-AR')} — ${c.concepto}`, tipo: 'pago' })) : []),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6)

    res.json({
      reservasHoy: reservasHoyList.length,
      reservasAyer,
      reservasHoyPct: pct(reservasHoyList.length, reservasAyer),
      jugadoresActivos,
      canchasActivas: canchas.length,
      ocupadasAhora,
      ocupacionPct,
      slotsOcupados,
      slotsTotales,
      torneosActivos,
      agenda,
      ahora: ahoraHHMM,
      serie7d,
      atencion,
      actividad,
      // Flags de permiso para que el front sepa qué puede pintar
      verCaja,
      verCobros,
      // Por cobrar / deuda: visible para quien cobra (ventas o caja)
      ...(verCobros ? { deudaPendiente: deudaCargosMonto + montoImpagos } : {}),
      // Ingresos / totales: SOLO caja (SENSIBLE) — sino ni se mandan
      ...(verCaja ? {
        ingresosDia,
        ingresosMes,
        ingresosAyer,
        ingresosDiaPct: pct(ingresosDia, ingresosAyer),
      } : {}),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular el dashboard' })
  }
})

// GET /api/clubs/me/insight — "Insight del día" con IA (solo dueño). Cacheado 24h por club.
router.get('/me/insight', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const hoyStr = hoyArgStr()
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { config: true } })
    const cache = club?.config?.insightDelDia
    const forzar = req.query.force === '1' || req.query.force === 'true'
    // Cache: si ya generamos el insight hoy, lo devolvemos sin volver a llamar a la IA
    // (salvo que el dueño pida regenerar con ?force=1).
    if (!forzar && cache && cache.fecha === hoyStr && cache.texto) {
      return res.json({ texto: cache.texto, fecha: cache.fecha, cacheado: true })
    }
    const data = await gatherInsightData(clubId)
    const { texto } = await generarInsightIA(data)
    // Guardar en config (preservando el resto de la config del club)
    await prisma.club.update({
      where: { id: clubId },
      data: { config: { ...(club?.config || {}), insightDelDia: { fecha: hoyStr, texto } } },
    })
    res.json({ texto, fecha: hoyStr, cacheado: false })
  } catch (err) {
    console.error('Error insight IA:', err.message)
    res.status(500).json({ error: 'No se pudo generar el insight' })
  }
})

// POST /api/clubs/me/insight/convocatoria-mensaje — redacta un mensaje de WhatsApp para
// convocar un Americano/Super 8 y llenar una franja (solo dueño). On-demand, no cacheado.
router.post('/me/insight/convocatoria-mensaje', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const { modalidad = 'americano', dia, horario, categoria, cupos } = req.body || {}
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
    const { texto } = await generarConvocatoriaWhatsapp({ club: club?.nombre, modalidad, dia, horario, categoria, cupos })
    res.json({ mensaje: texto })
  } catch (err) {
    console.error('Error convocatoria WhatsApp:', err.message)
    res.status(500).json({ error: 'No se pudo generar el mensaje' })
  }
})

// POST /api/clubs/me/insight/post-disponibilidad — la IA redacta el posteo de turnos
// libres de una fecha para difundir en redes/WhatsApp (solo dueño). On-demand, no cacheado.
router.post('/me/insight/post-disponibilidad', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const fecha = (req.body && req.body.fecha) || hoyArgStr()
    const data = await gatherDisponibilidad(clubId, fecha)
    const { texto } = await generarPostDisponibilidad(data)
    res.json({ mensaje: texto, total: data.total, libres: data.libres, fecha })
  } catch (err) {
    console.error('Error post disponibilidad:', err.message)
    res.status(500).json({ error: 'No se pudo generar el posteo' })
  }
})

// GET /api/clubs/me/insight/liberados — turnos liberados recientemente (cancelación/ausencia)
// que siguen LIBRES hoy o en adelante, listos para re-publicar (solo dueño).
router.get('/me/insight/liberados', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const hoyStr = hoyArgStr()
    const notifs = await prisma.notificacion.findMany({
      where: { clubId, jugadorId: null, profesorId: null, tipo: { in: ['turno_liberado_auto', 'cancelacion_reserva'] } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: { data: true },
    })
    // Candidatos: deduplicados, de hoy en adelante
    const vistos = new Set()
    const candidatos = []
    for (const n of notifs) {
      const d = n.data || {}
      if (!d.fecha || d.fecha < hoyStr || !d.horaInicio) continue
      const key = `${d.canchaNombre}|${d.fecha}|${d.horaInicio}`
      if (vistos.has(key)) continue
      vistos.add(key)
      candidatos.push({ canchaNombre: d.canchaNombre || '', fecha: d.fecha, horaInicio: d.horaInicio, dia: d.dia || null })
      if (candidatos.length >= 20) break
    }
    // Cruce contra disponibilidad real: solo los que SIGUEN libres (no re-tomados)
    const fechas = [...new Set(candidatos.map((c) => c.fecha))]
    const dispPorFecha = {}
    for (const f of fechas) dispPorFecha[f] = await gatherDisponibilidad(clubId, f)
    const libres = candidatos.filter((c) => {
      const disp = dispPorFecha[c.fecha]
      const cancha = disp?.libres.find((x) => x.cancha === c.canchaNombre)
      return cancha && cancha.horas.includes(c.horaInicio)
    })
    res.json(libres)
  } catch (err) {
    console.error('Error liberados:', err.message)
    res.status(500).json({ error: 'No se pudo obtener los turnos liberados' })
  }
})

// POST /api/clubs/me/insight/post-liberado — la IA arma el aviso de un turno liberado (solo dueño).
router.post('/me/insight/post-liberado', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const { canchaNombre, dia, horario } = req.body || {}
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { nombre: true } })
    const { texto } = await generarPostLiberado({ club: club?.nombre, canchaNombre, dia, horario })
    res.json({ mensaje: texto })
  } catch (err) {
    console.error('Error post liberado:', err.message)
    res.status(500).json({ error: 'No se pudo generar el aviso' })
  }
})

// POST /api/clubs/me/insight/chat — chat de WIarky: responde preguntas sobre el club
// grounded en datos reales (solo dueño). Body: { mensajes: [{role, content}] }.
router.post('/me/insight/chat', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const entrada = Array.isArray(req.body?.mensajes) ? req.body.mensajes : []
    let limpios = entrada
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
      .slice(-10)
    // La API exige que arranque con 'user': descarto turnos 'assistant' al principio.
    while (limpios.length && limpios[0].role === 'assistant') limpios.shift()
    if (!limpios.length || limpios[limpios.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Mensaje inválido' })
    }
    const { texto, artefactos } = await responderChatAgente(clubId, limpios)
    res.json({ respuesta: texto, artefactos: artefactos || [] })
  } catch (err) {
    console.error('Error chat WIarky:', err.message)
    res.status(500).json({ error: 'No pude responder ahora' })
  }
})

// POST /api/clubs/me/insight/accion — ejecuta una acción de WIarky CONFIRMADA por el dueño
// (write de verdad, separado del chat para que nunca escriba sin confirmación). Solo dueño.
router.post('/me/insight/accion', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const clubId = req.user.clubId
  try {
    const { accion, datos } = req.body || {}
    if (accion === 'cargar_gasto') {
      const monto = Math.round(Number(datos?.monto) || 0)
      const concepto = (datos?.concepto || '').toString().trim()
      if (monto <= 0 || !concepto) return res.status(400).json({ error: 'Monto o concepto inválido' })
      const categoria = datos?.categoria ? datos.categoria.toString().trim() : null
      const g = await prisma.gasto.create({
        data: { clubId, concepto, monto, categoria, fecha: hoyArgStr(), pagado: true, pagadoAt: new Date(), fuente: 'manual' },
      })
      return res.json({ ok: true, mensaje: `Gasto de $${monto.toLocaleString('es-AR')} cargado ✅`, id: g.id })
    }
    if (accion === 'crear_convocatoria') {
      const d = datos || {}
      const modalidad = d.modalidad === 'super8' ? 'super8' : 'americano'
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? d.fecha : null
      const horaInicio = /^\d{2}:\d{2}$/.test(d.horaInicio) ? d.horaInicio : null
      const cupoMax = Math.round(Number(d.cupoMax) || 0)
      if (!fecha || !horaInicio || cupoMax < 2) return res.status(400).json({ error: 'Datos de convocatoria inválidos' })
      const categorias = Array.isArray(d.categorias) ? d.categorias.map((c) => `${c}`.trim()).filter(Boolean) : []
      const genero = ['masculino', 'femenino', 'mixto'].includes(d.genero) ? d.genero : null
      const canchas = Math.max(1, Math.round(Number(d.canchas) || 1))
      const organizadorJugadorId = d.organizadorJugadorId
      if (!organizadorJugadorId) return res.status(400).json({ error: 'Falta el jugador organizador' })
      const visibilidad = d.visibilidad === 'privada' ? 'privada' : 'publica'
      try {
        const r = await crearConvocatoriaCompleta({ clubId, organizadorJugadorId, modalidad, fecha, horaInicio, categorias, genero, cupoMax, canchas, visibilidad })
        return res.json({ ok: true, mensaje: `Convocatoria creada ✅ Canchas reservadas: ${(r.canchasReservadas || []).join(', ')}`, copiable: { titulo: 'Mensaje para WhatsApp', texto: r.mensajeWhatsapp } })
      } catch (e) {
        return res.status(e.status === 409 ? 409 : 500).json({ error: e.message || 'No se pudo crear la convocatoria' })
      }
    }
    if (accion === 'ascender_jugador') {
      const jugadorId = (datos?.jugadorId || '').toString().trim()
      const aCategoria = normalizarCategoria(datos?.aCategoria)
      if (!jugadorId || !aCategoria) return res.status(400).json({ error: 'Faltan datos del ascenso' })
      const jugador = await prisma.jugador.findFirst({ where: { id: jugadorId, clubId }, select: { id: true, nombre: true, apellido: true, categoria: true } })
      if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })
      const deCategoria = normalizarCategoria(jugador.categoria)
      // Dirección: la categoría destino tiene que ser un ASCENSO (nivel menor = mejor).
      const nA = nivelDeCategoria(aCategoria), nD = nivelDeCategoria(deCategoria)
      if (nA != null && nD != null && nA >= nD) return res.status(400).json({ error: 'La categoría destino no es un ascenso' })
      await prisma.jugador.update({ where: { id: jugador.id }, data: { categoria: aCategoria } })
      // Auditoría: queda registrado el ascenso (origen WIarky).
      registrarCambioCategoria({
        clubId, jugadorId: jugador.id, de: deCategoria, a: aCategoria, origen: 'wiark',
        motivo: (datos?.motivo || '').toString().trim() || null,
      }).catch(() => {})
      // Notificación de FELICITACIÓN al jugador (logro, no castigo — regla del dominio).
      prisma.notificacion.create({
        data: { clubId, jugadorId: jugador.id, tipo: 'ascenso_categoria', data: { de: deCategoria, a: aCategoria, mensaje: `¡Felicitaciones! Ascendiste a ${catCorta(aCategoria)}. Le quedó chica la categoría 🎾` } },
      }).catch(() => {})
      return res.json({ ok: true, mensaje: `${jugador.nombre} ${jugador.apellido || ''}`.trim() + ` ascendido a ${catCorta(aCategoria)} ✅` })
    }
    if (accion === 'abrir_caja') {
      const yaAbierta = await prisma.arqueoCaja.findFirst({ where: { clubId, estado: 'abierta' }, select: { id: true } })
      if (yaAbierta) return res.status(409).json({ error: 'Ya hay una caja abierta.' })
      const fondoInicial = Math.max(0, Math.round(Number(datos?.fondoInicial) || 0))
      const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, select: { nombre: true } })
      await prisma.arqueoCaja.create({ data: { clubId, empleadoId: req.user.id, empleadoNombre: admin?.nombre ?? null, fondoInicial } })
      return res.json({ ok: true, mensaje: fondoInicial > 0 ? `Caja abierta con fondo $${fondoInicial.toLocaleString('es-AR')} ✅` : 'Caja del día abierta ✅' })
    }
    return res.status(400).json({ error: 'Acción desconocida' })
  } catch (err) {
    console.error('Error acción WIarky:', err.message)
    res.status(500).json({ error: 'No se pudo ejecutar la acción' })
  }
})

// PATCH /api/clubs/me   — admin guarda config del club
router.patch('/me', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const { config } = req.body
  if (!config) return res.status(400).json({ error: 'config requerido' })

  try {
    const updated = await prisma.club.update({
      where: { id: req.user.clubId },
      data: { config },
    })
    res.json({ id: updated.id, config: updated.config })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al guardar config' })
  }
})

// PATCH /api/clubs/me/canchas  — admin sincroniza canchas (crea, actualiza, desactiva)
router.patch('/me/canchas', requireAuth, requireRole('admin'), requireOwner, async (req, res) => {
  const { canchas } = req.body
  if (!Array.isArray(canchas)) return res.status(400).json({ error: 'canchas debe ser un array' })

  const clubId = req.user.clubId

  try {
    // IDs actuales en la DB
    const dbCanchas = await prisma.cancha.findMany({ where: { clubId }, select: { id: true } })
    const dbIds = new Set(dbCanchas.map((c) => c.id))

    // IDs que llegan con CUID válido (string de 25 chars aprox)
    const isCuid = (id) => typeof id === 'string' && id.length > 10

    const upsertOps = canchas.map((c, i) => {
      if (isCuid(c.id) && dbIds.has(c.id)) {
        // Actualizar existente
        return prisma.cancha.update({
          where: { id: c.id },
          data: {
            nombre: c.nombre,
            tipo: c.tipo ?? 'Cristal',
            indoor: c.indoor ?? true,
            precioTurno: c.precioTurno ?? 0,
            horarios: c.horarios ?? null,
            activo: true,
          },
        })
      }
      // Crear nueva
      return prisma.cancha.create({
        data: {
          clubId,
          nombre: c.nombre || `Cancha ${i + 1}`,
          tipo: c.tipo ?? 'Cristal',
          indoor: c.indoor ?? true,
          precioTurno: c.precioTurno ?? 0,
          horarios: c.horarios ?? null,
          activo: true,
        },
      })
    })

    // Desactivar las que ya no están en la lista
    const incomingCuids = new Set(canchas.filter((c) => isCuid(c.id)).map((c) => c.id))
    const toDeactivate = [...dbIds].filter((id) => !incomingCuids.has(id))
    const deactivateOps = toDeactivate.map((id) =>
      prisma.cancha.update({ where: { id }, data: { activo: false } })
    )

    await prisma.$transaction([...upsertOps, ...deactivateOps])
    // Devolver canchas activas actualizadas para que el frontend actualice IDs
    const canchasActualizadas = await prisma.cancha.findMany({
      where: { clubId, activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json({ ok: true, canchas: canchasActualizadas })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al sincronizar canchas' })
  }
})

// GET /api/clubs/info   — jugador autenticado obtiene config + canchas de su club
router.get('/info', requireAuth, requireRole('jugador'), async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { id: req.user.clubId },
      include: { canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } } },
    })
    if (!club) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

// GET /api/clubs/:slug/disponibilidad?fecha=YYYY-MM-DD  — público, slots ocupados del día para la landing
router.get('/:slug/disponibilidad', async (req, res) => {
  const { fecha } = req.query
  if (!fecha) return res.status(400).json({ error: 'fecha requerida' })

  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, activo: true },
    })
    if (!club || !club.activo) return res.status(404).json({ error: 'Club no encontrado' })

    const reservas = await prisma.reserva.findMany({
      where: {
        clubId: club.id,
        fecha,
        estado: { in: ['pendiente', 'confirmada'] },
      },
      select: { canchaId: true, horaInicio: true, horaFin: true },
    })

    // Incluir TurnoFijos confirmados para ese día de la semana (excluyendo ausencias)
    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const [fy, fm, fd] = fecha.split('-').map(Number)
    const dia = DIAS[new Date(fy, fm - 1, fd).getDay()]

    const turnosFijos = await prisma.turnoFijo.findMany({
      where: { clubId: club.id, dia, estado: 'confirmado' },
      select: { canchaId: true, horaInicio: true, horaFin: true, diasAusentes: true, desde: true },
    })

    const slotsTF = turnosFijos
      .filter((t) => !t.diasAusentes.includes(fecha) && (!t.desde || t.desde <= fecha))
      .map(({ canchaId, horaInicio, horaFin }) => ({ canchaId, horaInicio, horaFin }))

    res.json([...reservas, ...slotsTF])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener disponibilidad' })
  }
})

// GET /api/clubs/:slug   — público, info básica del club + canchas activas para la landing
router.get('/:slug', async (req, res) => {
  try {
    const club = await prisma.club.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true, nombre: true, slug: true, logoUrl: true, config: true, activo: true,
        canchas: { where: { activo: true }, orderBy: { nombre: 'asc' } },
      },
    })
    if (!club || !club.activo) return res.status(404).json({ error: 'Club no encontrado' })
    res.json(club)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener club' })
  }
})

export default router
