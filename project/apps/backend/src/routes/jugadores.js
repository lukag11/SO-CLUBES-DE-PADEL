import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { signToken } from '../lib/jwt.js'
import { requireAuth, requireRole, requireActive } from '../middleware/auth.js'
import { turnosImpagosDeuda } from '../lib/deudas.js'

const router = Router()

// Cuenta toda la deuda pendiente de un jugador: cargos + turnos impagos pasados.
// Unifica el criterio de "deuda" con el de Cobranzas (ver lib/deudas.js).
const contarDeudaPendiente = async (clubId, jugadorId) => {
  const [cargos, turnos] = await Promise.all([
    prisma.cargo.count({ where: { jugadorId, estado: 'pendiente' } }),
    turnosImpagosDeuda(clubId, { jugadorId }),
  ])
  return cargos + turnos.length
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// GET /api/jugadores/buscar-por-dni?dni=&clubId= — público, pre-llena el formulario de registro
router.get('/buscar-por-dni', async (req, res) => {
  const { dni, clubId } = req.query
  if (!dni || !/^\d{7,8}$/.test(dni.trim()) || !clubId) return res.json({ found: false })
  try {
    const jugador = await prisma.jugador.findUnique({
      where: { clubId_dni: { clubId, dni: dni.trim() } },
      select: { nombre: true, apellido: true },
    })
    if (!jugador) return res.json({ found: false })
    res.json({ found: true, nombre: jugador.nombre, apellido: jugador.apellido })
  } catch {
    res.json({ found: false })
  }
})

// GET /api/jugadores/buscar?q= — admin busca jugadores de su club (por nombre, apellido o DNI)
router.get('/buscar', requireAuth, requireRole('admin'), async (req, res) => {
  const { q } = req.query
  if (!q || q.trim().length < 2) return res.json([])
  try {
    const jugadores = await prisma.jugador.findMany({
      where: {
        clubId: req.user.clubId,
        OR: [
          { nombre:   { contains: q.trim(), mode: 'insensitive' } },
          { apellido: { contains: q.trim(), mode: 'insensitive' } },
          { dni:      { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true, nombre: true, apellido: true, dni: true, cuentaActiva: true },
      take: 8,
    })
    res.json(jugadores)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al buscar jugadores' })
  }
})

// GET /api/jugadores/por-dni?dni= — jugador busca compañero por DNI dentro de su club
router.get('/por-dni', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const { dni } = req.query
  if (!dni || !/^\d{7,8}$/.test(dni.trim())) {
    return res.json({ found: false })
  }
  try {
    const jugador = await prisma.jugador.findUnique({
      where: { clubId_dni: { clubId: req.user.clubId, dni: dni.trim() } },
      select: { id: true, nombre: true, apellido: true, cuentaActiva: true },
    })
    if (!jugador) return res.json({ found: false })
    res.json({ found: true, id: jugador.id, nombre: jugador.nombre, apellido: jugador.apellido, cuentaActiva: jugador.cuentaActiva })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al buscar jugador' })
  }
})

// GET /api/jugadores/me — datos actualizados del jugador autenticado
router.get('/me', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: req.user.id },
      include: { club: { select: { id: true, nombre: true } } },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })
    const { password: _, ...rest } = jugador
    res.json({ ...rest, role: 'jugador', club: { id: jugador.club.id, nombre: jugador.club.nombre } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener jugador' })
  }
})

// PATCH /api/jugadores/me — actualiza perfil del jugador autenticado
router.patch('/me', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const {
    nombre, apellido, email, telefono, apodo, genero, fechaNacimiento,
    provincia, ciudad, posicion, mano, categoria, frecuencia,
    diasDisponibles, horariosDisponibles, perfilPublico,
  } = req.body

  try {
    const updated = await prisma.jugador.update({
      where: { id: req.user.id },
      data: {
        ...(nombre             !== undefined && { nombre }),
        ...(apellido           !== undefined && { apellido }),
        ...(email              !== undefined && { email }),
        ...(telefono           !== undefined && { telefono }),
        ...(apodo              !== undefined && { apodo }),
        ...(genero             !== undefined && { genero }),
        ...(fechaNacimiento    !== undefined && { fechaNacimiento }),
        ...(provincia          !== undefined && { provincia }),
        ...(ciudad             !== undefined && { ciudad }),
        ...(posicion           !== undefined && { posicion }),
        ...(mano               !== undefined && { mano }),
        ...(categoria          !== undefined && { categoria }),
        ...(frecuencia         !== undefined && { frecuencia }),
        ...(diasDisponibles    !== undefined && { diasDisponibles }),
        ...(horariosDisponibles !== undefined && { horariosDisponibles }),
        ...(perfilPublico      !== undefined && { perfilPublico }),
      },
      include: { club: { select: { id: true, nombre: true } } },
    })
    const { password: _, ...rest } = updated
    res.json({ ...rest, role: 'jugador', club: { id: updated.club.id, nombre: updated.club.nombre } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
})

// PATCH /api/jugadores/me/password — cambio de contraseña del jugador autenticado
router.patch('/me/password', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const jugadorId = req.user.id
  const { actual, nueva } = req.body

  if (!actual || !nueva) {
    return res.status(400).json({ error: 'datos_incompletos', message: 'Faltan datos' })
  }
  if (typeof nueva !== 'string' || nueva.length < 8) {
    return res.status(400).json({ error: 'password_invalida', message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  }

  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: jugadorId },
      select: { password: true },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })

    const coincide = await bcrypt.compare(actual, jugador.password)
    if (!coincide) {
      return res.status(400).json({ error: 'contrasena_actual_incorrecta', message: 'La contraseña actual es incorrecta' })
    }

    const passwordHash = await bcrypt.hash(nueva, 10)
    // Incrementar tokenVersion invalida todas las sesiones existentes (otros dispositivos).
    const actualizado = await prisma.jugador.update({
      where: { id: jugadorId },
      data: { password: passwordHash, tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    })

    // Re-firmar un token para la sesión actual con la nueva versión, así el propio
    // usuario no se queda afuera. El frontend reemplaza el token guardado.
    const token = signToken({ id: jugadorId, role: 'jugador', clubId: req.user.clubId, tokenVersion: actualizado.tokenVersion })

    res.json({ ok: true, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cambiar la contraseña' })
  }
})

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// GET /api/jugadores/me/stats — estadísticas reales del jugador autenticado
router.get('/me/stats', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const jugadorId = req.user.id
  const clubId = req.user.clubId
  const { periodo } = req.query // '12m' | '2026' | undefined → todo

  // Calcular rango de fechas según período
  let fechaDesde = null
  let fechaHasta = null
  if (periodo === '12m') {
    fechaDesde = new Date()
    fechaDesde.setFullYear(fechaDesde.getFullYear() - 1)
    fechaDesde = fechaDesde.toISOString().slice(0, 10)
  } else if (/^\d{4}$/.test(periodo ?? '')) {
    fechaDesde = `${periodo}-01-01`
    fechaHasta = `${periodo}-12-31`
  }

  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: jugadorId },
      select: { dni: true, nombre: true, apellido: true, categoria: true },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })

    // ── Reservas ──────────────────────────────────────────────────────────────
    const hoy = new Date().toISOString().slice(0, 10)
    const [reservas, proximaReservaRaw] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          jugadorId,
          clubId,
          ...(fechaDesde ? { fecha: { gte: fechaDesde, ...(fechaHasta ? { lte: fechaHasta } : {}) } } : {}),
        },
        include: { cancha: { select: { nombre: true } } },
        orderBy: { fecha: 'asc' },
      }),
      prisma.reserva.findFirst({
        where: { jugadorId, clubId, estado: 'confirmada', fecha: { gte: hoy } },
        include: { cancha: { select: { nombre: true } } },
        orderBy: { fecha: 'asc' },
      }),
    ])

    const confirmadas = reservas.filter((r) => r.estado === 'confirmada')
    const turnosFijos = confirmadas.filter((r) => r.esTurnoFijo).length

    const now = new Date()
    // Definir los meses a mostrar según el período
    const mesesAMostrar = []
    if (/^\d{4}$/.test(periodo ?? '')) {
      const yr = parseInt(periodo, 10)
      for (let m = 0; m < 12; m++) mesesAMostrar.push(new Date(yr, m, 1))
    } else {
      for (let i = 11; i >= 0; i--) mesesAMostrar.push(new Date(now.getFullYear(), now.getMonth() - i, 1))
    }
    const porMes = mesesAMostrar.map((d) => {
      const year = d.getFullYear()
      const month = d.getMonth() + 1
      const prefix = `${year}-${String(month).padStart(2, '0')}`
      const del_mes = reservas.filter((r) => r.fecha.startsWith(prefix))
      return {
        mes: MESES[d.getMonth()],
        year,
        month,
        confirmadas: del_mes.filter((r) => r.estado === 'confirmada').length,
        canceladas: del_mes.filter((r) => r.estado === 'cancelada').length,
      }
    })

    // Cancha más usada
    const canchaCount = {}
    confirmadas.forEach((r) => {
      const nombre = r.cancha?.nombre ?? 'Sin nombre'
      canchaCount[nombre] = (canchaCount[nombre] ?? 0) + 1
    })
    const canchaFavorita = Object.entries(canchaCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    // Día de la semana favorito
    const diaCount = {}
    confirmadas.forEach((r) => {
      const d = new Date(r.fecha)
      const dia = DIAS_SEMANA[d.getDay()]
      diaCount[dia] = (diaCount[dia] ?? 0) + 1
    })
    const diaFavorito = Object.entries(diaCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null
    const diasDistribucion = DIAS_SEMANA.map((dia) => ({ dia, cantidad: diaCount[dia] ?? 0 }))

    // Horario favorito (franja)
    const franjaCount = {}
    confirmadas.forEach((r) => {
      if (!r.horaInicio) return
      const h = parseInt(r.horaInicio.split(':')[0], 10)
      const franja = h < 12 ? 'Mañana' : h < 17 ? 'Tarde' : 'Noche'
      franjaCount[franja] = (franjaCount[franja] ?? 0) + 1
    })
    const horarioFavorito = Object.entries(franjaCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null

    // Horas totales jugadas (cada turno = 1.5h)
    const horasTotales = Math.round(confirmadas.length * 1.5)

    // ── Torneos ───────────────────────────────────────────────────────────────
    const torneos = await prisma.torneo.findMany({
      where: {
        clubId,
        ...(fechaDesde ? { fechaInicio: { gte: fechaDesde, ...(fechaHasta ? { lte: fechaHasta } : {}) } } : {}),
      },
      select: {
        id: true,
        nombre: true,
        fechaInicio: true,
        grupos: true,
        brackets: true,
        parejas: {
          select: { id: true, jugador1: true, jugador2: true, jugador1Dni: true, jugador2Dni: true, categoria: true },
        },
      },
      orderBy: { fechaInicio: 'asc' },
    })

    const dni = jugador.dni
    const participados = torneos.filter((t) =>
      t.parejas.some((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
    )

    // Compañeros (top 3 más frecuentes)
    const companeroCount = {}
    participados.forEach((t) => {
      t.parejas
        .filter((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
        .forEach((p) => {
          const comp = p.jugador1Dni === dni ? p.jugador2 : p.jugador1
          if (comp) companeroCount[comp] = (companeroCount[comp] ?? 0) + 1
        })
    })
    const companerosSorted = Object.entries(companeroCount).sort(([, a], [, b]) => b - a)
    const companeroFrecuente = companerosSorted[0] ? { nombre: companerosSorted[0][0], veces: companerosSorted[0][1] } : null
    const topCompaneros = companerosSorted.slice(0, 3).map(([nombre, veces]) => ({ nombre, veces }))

    // Partidos: acumular con fase
    const resultados = [] // { resultado, categoria, fase, setsGanados, setsPerdidos }
    let titulos = 0

    const procesarPartido = (partido, misParejasIds, categoria, fase, torneoCtx) => {
      if (!partido.ganador) return
      const esP1 = misParejasIds.has(partido.pareja1?.id)
      const esP2 = misParejasIds.has(partido.pareja2?.id)
      if (!esP1 && !esP2) return
      const miParejaId = esP1 ? partido.pareja1?.id : partido.pareja2?.id
      const gane = partido.ganador.id === miParejaId
      const sets = partido.resultado?.sets ?? []
      let sG = 0, sP = 0
      const scoreParts = []
      sets.forEach(({ p1, p2 }) => {
        const mis = esP1 ? p1 : p2
        const su  = esP1 ? p2 : p1
        if (mis > su) sG++; else sP++
        scoreParts.push(`${mis}-${su}`)
      })
      const rivalPareja = esP1 ? partido.pareja2 : partido.pareja1
      const rival = rivalPareja
        ? [rivalPareja.jugador1, rivalPareja.jugador2].filter(Boolean).join(' / ') || 'Rival'
        : 'Rival'
      resultados.push({
        resultado: gane ? 'W' : 'L', categoria, fase, setsGanados: sG, setsPerdidos: sP,
        torneoId: torneoCtx.id, torneoNombre: torneoCtx.nombre, fecha: torneoCtx.fechaInicio,
        rival, score: scoreParts.join('  '),
      })
      return gane
    }

    for (const torneo of participados) {
      const misParejasIds = new Set(
        torneo.parejas
          .filter((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
          .map((p) => p.id)
      )
      const torneoCtx = { id: torneo.id, nombre: torneo.nombre, fechaInicio: torneo.fechaInicio }

      if (Array.isArray(torneo.grupos)) {
        for (const zona of torneo.grupos) {
          for (const partido of (zona.partidos ?? [])) {
            procesarPartido(partido, misParejasIds, zona.categoria ?? 'Grupos', 'grupos', torneoCtx)
          }
        }
      }

      if (torneo.brackets && typeof torneo.brackets === 'object') {
        for (const [cat, bracket] of Object.entries(torneo.brackets)) {
          const rondas = bracket?.rondas ?? []
          for (let ri = 0; ri < rondas.length; ri++) {
            for (const partido of (rondas[ri].partidos ?? [])) {
              if (partido.estado !== 'finalizado') continue
              const gane = procesarPartido(partido, misParejasIds, cat, 'eliminatoria', torneoCtx)
              if (ri === rondas.length - 1 && gane) titulos++
            }
          }
        }
      }
    }

    // Acumulados globales
    const totalPartidos = resultados.length
    const ganados = resultados.filter((r) => r.resultado === 'W').length
    const perdidos = totalPartidos - ganados
    const winRate = totalPartidos > 0 ? Math.round((ganados / totalPartidos) * 100) : 0
    const totalSetsGanados = resultados.reduce((s, r) => s + r.setsGanados, 0)
    const totalSetsPerdidos = resultados.reduce((s, r) => s + r.setsPerdidos, 0)

    // Racha actual
    let rachaActual = 0
    if (resultados.length > 0) {
      const ultimo = resultados[resultados.length - 1].resultado
      for (let i = resultados.length - 1; i >= 0; i--) {
        if (resultados[i].resultado === ultimo) rachaActual++
        else break
      }
    }
    const rachaLabel = resultados.length === 0 ? null
      : resultados[resultados.length - 1].resultado === 'W' ? `${rachaActual}V` : `${rachaActual}D`

    // Racha máxima histórica (solo victorias)
    let rachMaxima = 0, rachaTemp = 0
    for (const r of resultados) {
      if (r.resultado === 'W') { rachaTemp++; if (rachaTemp > rachMaxima) rachMaxima = rachaTemp }
      else rachaTemp = 0
    }

    // Tendencia reciente (últimos 10)
    const recentTrend = resultados.slice(-10).map((r) => r.resultado)

    // Últimos partidos con detalle (más reciente primero)
    const ultimosPartidos = resultados.slice(-5).reverse().map((r) => ({
      resultado: r.resultado,
      rival: r.rival,
      score: r.score,
      torneo: r.torneoNombre,
      fecha: r.fecha,
      categoria: r.categoria,
    }))

    // Evolución de winRate — acumulado por torneo (cronológico)
    // resultados ya viene ordenado por fechaInicio asc (participados está ordenado)
    const evolucionWinRate = []
    {
      const torneosOrden = []         // ids en orden de aparición
      const porTorneo = {}            // id -> { nombre, fecha, g, p }
      for (const r of resultados) {
        if (!porTorneo[r.torneoId]) {
          porTorneo[r.torneoId] = { nombre: r.torneoNombre, fecha: r.fecha, g: 0, p: 0 }
          torneosOrden.push(r.torneoId)
        }
        if (r.resultado === 'W') porTorneo[r.torneoId].g++
        else porTorneo[r.torneoId].p++
      }
      let accG = 0, accTotal = 0
      for (const id of torneosOrden) {
        const tr = porTorneo[id]
        accG += tr.g
        accTotal += tr.g + tr.p
        evolucionWinRate.push({
          torneo: tr.nombre,
          fecha: tr.fecha,
          winRateTorneo: (tr.g + tr.p) > 0 ? Math.round((tr.g / (tr.g + tr.p)) * 100) : 0,
          winRateAcumulado: accTotal > 0 ? Math.round((accG / accTotal) * 100) : 0,
        })
      }
    }

    // Rendimiento por categoría
    const porCategoria = {}
    for (const r of resultados) {
      if (!porCategoria[r.categoria]) porCategoria[r.categoria] = { ganados: 0, perdidos: 0 }
      if (r.resultado === 'W') porCategoria[r.categoria].ganados++
      else porCategoria[r.categoria].perdidos++
    }

    // Grupos vs eliminatoria
    const resGrupos = resultados.filter((r) => r.fase === 'grupos')
    const resElim   = resultados.filter((r) => r.fase === 'eliminatoria')
    const fases = {
      grupos:       { total: resGrupos.length, ganados: resGrupos.filter(r => r.resultado === 'W').length },
      eliminatoria: { total: resElim.length,   ganados: resElim.filter(r => r.resultado === 'W').length },
    }

    // Historial de torneos (más reciente primero)
    const historial = participados.slice().reverse().map((t) => {
      const misParejasIds = new Set(
        t.parejas.filter((p) => p.jugador1Dni === dni || p.jugador2Dni === dni).map((p) => p.id)
      )
      const categorias = [...new Set(
        t.parejas.filter((p) => p.jugador1Dni === dni || p.jugador2Dni === dni).map((p) => p.categoria)
      )]
      let resultado = 'participante'
      let partidosJugados = 0
      let partidosGanados = 0

      if (Array.isArray(t.grupos)) {
        for (const zona of t.grupos) {
          for (const partido of (zona.partidos ?? [])) {
            if (!partido.ganador) continue
            const esP1 = misParejasIds.has(partido.pareja1?.id)
            const esP2 = misParejasIds.has(partido.pareja2?.id)
            if (!esP1 && !esP2) continue
            partidosJugados++
            const miId = esP1 ? partido.pareja1?.id : partido.pareja2?.id
            if (partido.ganador.id === miId) partidosGanados++
          }
        }
      }

      if (t.brackets && typeof t.brackets === 'object') {
        outer: for (const bracket of Object.values(t.brackets)) {
          const rondas = bracket?.rondas ?? []
          if (!rondas.length) continue
          for (let ri = 0; ri < rondas.length; ri++) {
            for (const partido of (rondas[ri].partidos ?? [])) {
              if (partido.estado !== 'finalizado') continue
              const esP1 = misParejasIds.has(partido.pareja1?.id)
              const esP2 = misParejasIds.has(partido.pareja2?.id)
              if (!esP1 && !esP2) continue
              partidosJugados++
              const miId = esP1 ? partido.pareja1?.id : partido.pareja2?.id
              if (partido.ganador?.id === miId) {
                partidosGanados++
                if (ri === rondas.length - 1) {
                  resultado = 'campeon'
                  break outer
                }
              } else if (ri === rondas.length - 1) {
                resultado = 'subcampeon'
                break outer
              }
            }
          }
        }
      }

      return { id: t.id, nombre: t.nombre, fechaInicio: t.fechaInicio, categorias, resultado, partidosJugados, partidosGanados }
    })

    // Evolución por categoría — torneos + partidos + títulos por cada cat jugada
    const catMap = {}
    for (const item of historial) {
      for (const cat of item.categorias) {
        if (!catMap[cat]) catMap[cat] = { categoria: cat, torneos: 0, ganados: 0, perdidos: 0, titulos: 0 }
        catMap[cat].torneos++
        if (item.resultado === 'campeon') catMap[cat].titulos++
      }
    }
    for (const r of resultados) {
      const cat = r.categoria
      if (!catMap[cat]) catMap[cat] = { categoria: cat, torneos: 0, ganados: 0, perdidos: 0, titulos: 0 }
      if (r.resultado === 'W') catMap[cat].ganados++
      else catMap[cat].perdidos++
    }
    const evolucionCategorias = Object.values(catMap).map((c) => ({
      ...c,
      winRate: (c.ganados + c.perdidos) > 0 ? Math.round((c.ganados / (c.ganados + c.perdidos)) * 100) : 0,
    })).sort((a, b) => b.torneos - a.torneos)

    // Sugerencia de ascenso — basada en la categoría actual del jugador
    let sugerenciaAscenso = false
    const catActual = jugador.categoria
    if (catActual) {
      const statsActual = catMap[catActual]
      if (statsActual) {
        const wr = (statsActual.ganados + statsActual.perdidos) > 0
          ? Math.round((statsActual.ganados / (statsActual.ganados + statsActual.perdidos)) * 100) : 0
        sugerenciaAscenso = statsActual.titulos >= 2 || (wr >= 75 && statsActual.torneos >= 3)
      }
    }

    const canceladasTotal = reservas.filter((r) => r.estado === 'cancelada').length
    const proximaReserva = proximaReservaRaw ? {
      fecha: proximaReservaRaw.fecha,
      horaInicio: proximaReservaRaw.horaInicio,
      horaFin: proximaReservaRaw.horaFin,
      cancha: proximaReservaRaw.cancha?.nombre ?? null,
    } : null

    // ── Logros / badges ─────────────────────────────────────────────────────────
    const companerosDistintos = Object.keys(companeroCount).length
    const defLogros = [
      { id: 'primer_titulo', nombre: 'Primer título',   desc: 'Ganá tu primer torneo',            icon: 'trophy',   actual: titulos,             objetivo: 1 },
      { id: 'tricampeon',    nombre: 'Tricampeón',       desc: 'Ganá 3 torneos',                   icon: 'trophy',   actual: titulos,             objetivo: 3 },
      { id: 'veterano',      nombre: 'Veterano',         desc: 'Jugá 10 torneos',                  icon: 'award',    actual: participados.length, objetivo: 10 },
      { id: 'imparable',     nombre: 'Imparable',        desc: 'Conseguí 5 victorias seguidas',    icon: 'flame',    actual: rachMaxima,          objetivo: 5 },
      { id: 'centurion',     nombre: 'Centurión',        desc: 'Jugá 50 partidos de torneo',       icon: 'swords',   actual: totalPartidos,       objetivo: 50 },
      { id: 'maratonista',   nombre: 'Maratonista',      desc: 'Acumulá 50 horas en cancha',       icon: 'clock',    actual: horasTotales,        objetivo: 50 },
      { id: 'sociable',      nombre: 'Sociable',         desc: 'Jugá con 5 compañeros distintos',  icon: 'users',    actual: companerosDistintos, objetivo: 5 },
      { id: 'francotirador', nombre: 'Francotirador',    desc: '70% de efectividad (mín. 10 part.)', icon: 'target', actual: totalPartidos >= 10 ? winRate : 0, objetivo: 70 },
    ]
    const logros = defLogros.map((l) => ({
      ...l,
      actual: Math.min(l.actual, l.objetivo),
      desbloqueado: l.actual >= l.objetivo,
    }))
    const logrosDesbloqueados = logros.filter((l) => l.desbloqueado).length

    // ── Comparativa con el club ─────────────────────────────────────────────────
    // Calcula el winRate de todos los jugadores del club (en memoria, sin queries extra)
    const MIN_PARTIDOS_RANKING = 5
    const dniStats = {} // dni -> { g, p }
    const sumarDni = (d, gano) => {
      if (!d) return
      if (!dniStats[d]) dniStats[d] = { g: 0, p: 0 }
      if (gano) dniStats[d].g++; else dniStats[d].p++
    }
    for (const torneo of torneos) {
      const parejaDni = {} // parejaId -> [dni1, dni2]
      for (const pj of torneo.parejas) parejaDni[pj.id] = [pj.jugador1Dni, pj.jugador2Dni]

      const atribuir = (partido) => {
        if (!partido.ganador) return
        const p1 = partido.pareja1?.id, p2 = partido.pareja2?.id
        if (!p1 || !p2) return
        const ganadorId = partido.ganador.id
        const perdedorId = ganadorId === p1 ? p2 : p1
        for (const d of (parejaDni[ganadorId] ?? [])) sumarDni(d, true)
        for (const d of (parejaDni[perdedorId] ?? [])) sumarDni(d, false)
      }

      if (Array.isArray(torneo.grupos)) {
        for (const zona of torneo.grupos) {
          for (const partido of (zona.partidos ?? [])) atribuir(partido)
        }
      }
      if (torneo.brackets && typeof torneo.brackets === 'object') {
        for (const bracket of Object.values(torneo.brackets)) {
          for (const ronda of (bracket?.rondas ?? [])) {
            for (const partido of (ronda.partidos ?? [])) {
              if (partido.estado !== 'finalizado') continue
              atribuir(partido)
            }
          }
        }
      }
    }

    const ranking = Object.entries(dniStats)
      .map(([d, s]) => ({ dni: d, total: s.g + s.p, winRate: Math.round((s.g / (s.g + s.p)) * 100) }))
      .filter((x) => x.total >= MIN_PARTIDOS_RANKING)
      .sort((a, b) => b.winRate - a.winRate || b.total - a.total)

    let comparativaClub = null
    if (ranking.length >= 2) {
      const promedioClub = Math.round(ranking.reduce((s, x) => s + x.winRate, 0) / ranking.length)
      const mejorWinRate = ranking[0].winRate
      const idx = ranking.findIndex((x) => x.dni === dni)
      if (idx >= 0) {
        const posicion = idx + 1
        comparativaClub = {
          ranked: true,
          posicion,
          totalJugadores: ranking.length,
          percentil: Math.max(1, Math.round((posicion / ranking.length) * 100)),
          miWinRate: ranking[idx].winRate,
          promedioClub,
          mejorWinRate,
        }
      } else {
        // El jugador no llega al mínimo de partidos para entrar al ranking
        comparativaClub = {
          ranked: false,
          totalJugadores: ranking.length,
          minPartidos: MIN_PARTIDOS_RANKING,
          partidosActuales: totalPartidos,
          miWinRate: winRate,
          promedioClub,
          mejorWinRate,
        }
      }
    }

    res.json({
      reservas: {
        total: confirmadas.length,
        canceladas: canceladasTotal,
        turnosFijos,
        horasTotales,
        porMes,
        canchaFavorita,
        diaFavorito,
        diasDistribucion,
        horarioFavorito,
        franjaDistribucion: Object.entries(franjaCount).map(([franja, cantidad]) => ({ franja, cantidad })),
        proximaReserva,
      },
      torneos: {
        participados: participados.length,
        titulos,
        companeroFrecuente,
        topCompaneros,
        historial,
        evolucionCategorias,
        evolucionWinRate,
        sugerenciaAscenso,
        categoriaActual: catActual ?? null,
        partidos: {
          total: totalPartidos,
          ganados,
          perdidos,
          winRate,
          setsGanados: totalSetsGanados,
          setsPerdidos: totalSetsPerdidos,
          rachaActual,
          rachMaxima,
          rachaLabel,
          recentTrend,
          ultimosPartidos,
          porCategoria,
          fases,
        },
      },
      logros,
      logrosDesbloqueados,
      comparativaClub,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular estadísticas' })
  }
})

// GET /api/jugadores/me/oponentes — historial de enfrentamientos reales
router.get('/me/oponentes', requireAuth, requireRole('jugador'), requireActive, async (req, res) => {
  const jugadorId = req.user.id
  const clubId = req.user.clubId

  try {
    const jugador = await prisma.jugador.findUnique({
      where: { id: jugadorId },
      select: { dni: true },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })

    const torneos = await prisma.torneo.findMany({
      where: { clubId },
      select: {
        id: true,
        nombre: true,
        grupos: true,
        brackets: true,
        parejas: { select: { id: true, jugador1Dni: true, jugador2Dni: true } },
      },
    })

    const dni = jugador.dni
    const participados = torneos.filter((t) =>
      t.parejas.some((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
    )

    // Acumular enfrentamientos por nombre de pareja rival
    const enfrentamientos = {} // key: "apellido1 / apellido2" -> { partidos, ganados, perdidos, ultimaFecha }

    for (const torneo of participados) {
      const misParejasIds = new Set(
        torneo.parejas
          .filter((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
          .map((p) => p.id)
      )

      const registrarPartido = (partido, fecha) => {
        if (!partido.ganador) return
        const esP1 = misParejasIds.has(partido.pareja1?.id)
        const esP2 = misParejasIds.has(partido.pareja2?.id)
        if (!esP1 && !esP2) return
        const miParejaId = esP1 ? partido.pareja1?.id : partido.pareja2?.id
        const rivalPareja = esP1 ? partido.pareja2 : partido.pareja1
        if (!rivalPareja) return
        const rivalNombre = `${rivalPareja.jugador1 ?? '?'} / ${rivalPareja.jugador2 ?? '?'}`
        const gane = partido.ganador.id === miParejaId
        if (!enfrentamientos[rivalNombre]) {
          enfrentamientos[rivalNombre] = { nombre: rivalNombre, partidos: 0, ganados: 0, perdidos: 0, ultimaFecha: null }
        }
        enfrentamientos[rivalNombre].partidos++
        if (gane) enfrentamientos[rivalNombre].ganados++
        else enfrentamientos[rivalNombre].perdidos++
        if (fecha && (!enfrentamientos[rivalNombre].ultimaFecha || fecha > enfrentamientos[rivalNombre].ultimaFecha)) {
          enfrentamientos[rivalNombre].ultimaFecha = fecha
        }
      }

      if (Array.isArray(torneo.grupos)) {
        for (const zona of torneo.grupos) {
          for (const partido of (zona.partidos ?? [])) {
            registrarPartido(partido, partido.horario?.fecha ?? null)
          }
        }
      }

      if (torneo.brackets && typeof torneo.brackets === 'object') {
        for (const bracket of Object.values(torneo.brackets)) {
          for (const ronda of (bracket?.rondas ?? [])) {
            for (const partido of (ronda.partidos ?? [])) {
              if (partido.estado !== 'finalizado') continue
              registrarPartido(partido, partido.horario?.fecha ?? null)
            }
          }
        }
      }
    }

    // Clasificar y enriquecer
    const lista = Object.values(enfrentamientos)
      .map((o) => {
        const pct = Math.round((o.ganados / o.partidos) * 100)
        const tag = pct >= 60 ? 'favorable' : pct <= 40 ? 'rival' : 'parejo'
        return { ...o, pct, tag }
      })
      .sort((a, b) => b.partidos - a.partidos)

    const favorables = lista.filter((o) => o.tag === 'favorable').length
    const rivales    = lista.filter((o) => o.tag === 'rival').length
    const parejos    = lista.filter((o) => o.tag === 'parejo').length

    // Radar del oponente más frecuente
    const top = lista[0] ?? null
    const radarTop = top ? [
      { subject: 'Volumen',        value: Math.min(Math.round((top.partidos / 10) * 100), 100) },
      { subject: 'Victorias',      value: top.pct },
      { subject: 'Regularidad',    value: Math.round(((top.partidos - Math.abs(top.ganados - top.perdidos)) / top.partidos) * 100) },
      { subject: 'Sets ganados',   value: top.pct > 50 ? Math.min(top.pct + 10, 100) : Math.max(top.pct - 10, 0) },
    ] : []

    res.json({ lista, favorables, rivales, parejos, total: lista.length, radarTop, topNombre: top?.nombre ?? null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular oponentes' })
  }
})

// GET /api/jugadores/ascenso-sugeridos — admin: jugadores candidatos a subir categoría
router.get('/ascenso-sugeridos', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  try {
    const jugadores = await prisma.jugador.findMany({
      where: { clubId, cuentaActiva: true, activo: true, categoria: { not: null } },
      select: { id: true, dni: true, categoria: true },
    })

    const torneos = await prisma.torneo.findMany({
      where: { clubId },
      select: {
        grupos: true,
        brackets: true,
        parejas: { select: { id: true, jugador1Dni: true, jugador2Dni: true, categoria: true } },
      },
    })

    const sugeridos = []

    for (const jugador of jugadores) {
      if (!jugador.dni || !jugador.categoria) continue
      const cat = jugador.categoria
      const dni = jugador.dni
      let titulos = 0, ganados = 0, perdidos = 0, torneoCount = 0

      for (const torneo of torneos) {
        const misParejasIds = new Set(
          torneo.parejas
            .filter((p) => (p.jugador1Dni === dni || p.jugador2Dni === dni) && p.categoria === cat)
            .map((p) => p.id)
        )
        if (misParejasIds.size === 0) continue
        torneoCount++

        if (Array.isArray(torneo.grupos)) {
          for (const zona of torneo.grupos) {
            if (zona.categoria !== cat) continue
            for (const partido of (zona.partidos ?? [])) {
              if (!partido.ganador) continue
              const esP1 = misParejasIds.has(partido.pareja1?.id)
              const esP2 = misParejasIds.has(partido.pareja2?.id)
              if (!esP1 && !esP2) continue
              const gane = partido.ganador.id === (esP1 ? partido.pareja1?.id : partido.pareja2?.id)
              if (gane) ganados++; else perdidos++
            }
          }
        }

        if (torneo.brackets && typeof torneo.brackets === 'object') {
          const bracket = torneo.brackets[cat]
          if (!bracket) continue
          const rondas = bracket?.rondas ?? []
          for (let ri = 0; ri < rondas.length; ri++) {
            for (const partido of (rondas[ri].partidos ?? [])) {
              if (partido.estado !== 'finalizado' || !partido.ganador) continue
              const esP1 = misParejasIds.has(partido.pareja1?.id)
              const esP2 = misParejasIds.has(partido.pareja2?.id)
              if (!esP1 && !esP2) continue
              const gane = partido.ganador.id === (esP1 ? partido.pareja1?.id : partido.pareja2?.id)
              if (gane) ganados++; else perdidos++
              if (ri === rondas.length - 1 && gane) titulos++
            }
          }
        }
      }

      const winRate = (ganados + perdidos) > 0 ? Math.round((ganados / (ganados + perdidos)) * 100) : 0
      if (titulos >= 2 || (winRate >= 75 && torneoCount >= 3)) {
        sugeridos.push({ jugadorId: jugador.id, categoria: cat, titulos, torneoCount, winRate })
      }
    }

    res.json(sugeridos)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular sugerencias de ascenso' })
  }
})

// GET /api/jugadores/:id/stats — admin: mini-stats de un jugador específico
router.get('/:id/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const clubId = req.user.clubId
  const { id: jugadorId } = req.params
  try {
    const jugador = await prisma.jugador.findFirst({
      where: { id: jugadorId, clubId },
      select: { dni: true, categoria: true },
    })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })

    const [reservas, torneos] = await Promise.all([
      prisma.reserva.findMany({
        where: { jugadorId, clubId },
        select: { estado: true, fecha: true, esTurnoFijo: true },
        orderBy: { fecha: 'desc' },
      }),
      prisma.torneo.findMany({
        where: { clubId },
        select: {
          id: true,
          nombre: true,
          fechaInicio: true,
          grupos: true,
          brackets: true,
          parejas: {
            select: { id: true, jugador1: true, jugador2: true, jugador1Dni: true, jugador2Dni: true, categoria: true },
          },
        },
      }),
    ])

    const confirmadas = reservas.filter((r) => r.estado === 'confirmada')
    const ultimaReserva = confirmadas[0]?.fecha ?? null

    const dni = jugador.dni
    const participados = torneos.filter((t) =>
      t.parejas.some((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
    )

    let ganados = 0, perdidos = 0, titulos = 0
    const titulosDetalle = []

    // p es snapshot del JSON de brackets: { jugador1: "Nombre Apellido", jugador2: "...", jugador1Dni, jugador2Dni }
    const nombrePareja = (p) => {
      if (!p) return 'TBD'
      const j1 = (typeof p.jugador1 === 'string' ? p.jugador1 : null) ?? p.jugador1Dni ?? '?'
      const j2 = (typeof p.jugador2 === 'string' ? p.jugador2 : null) ?? p.jugador2Dni ?? null
      return j2 ? `${j1} / ${j2}` : j1
    }

    for (const t of participados) {
      const misParejas = (t.parejas ?? []).filter((p) => p.jugador1Dni === dni || p.jugador2Dni === dni)
      const misIds = new Set(misParejas.map((p) => p.id))

      const grupos = Array.isArray(t.grupos) ? t.grupos : []
      for (const zona of grupos) {
        for (const partido of zona.partidos ?? []) {
          if (!partido.ganador) continue
          const esP1 = misIds.has(partido.pareja1?.id)
          const esP2 = misIds.has(partido.pareja2?.id)
          if (!esP1 && !esP2) continue
          const gane = misIds.has(partido.ganador?.id)
          if (gane) ganados++; else perdidos++
        }
      }

      const brackets = t.brackets && typeof t.brackets === 'object' ? t.brackets : {}
      for (const [catNombre, cat] of Object.entries(brackets)) {
        // Contar partidos eliminatoria
        for (const ronda of cat.rondas ?? []) {
          for (const partido of ronda.partidos ?? []) {
            if (!partido.ganador) continue
            const esP1 = misIds.has(partido.pareja1?.id)
            const esP2 = misIds.has(partido.pareja2?.id)
            if (!esP1 && !esP2) continue
            const gane = misIds.has(partido.ganador?.id)
            if (gane) ganados++; else perdidos++
          }
        }
        // Título = ganar la final
        const rondas = cat.rondas ?? []
        if (rondas.length > 0) {
          const final = rondas[rondas.length - 1].partidos?.[0]
          if (final?.ganador && misIds.has(final.ganador?.id)) {
            titulos++
            const rival = misIds.has(final.pareja1?.id) ? final.pareja2 : final.pareja1
            titulosDetalle.push({
              torneoId: t.id,
              torneoNombre: t.nombre,
              fechaInicio: t.fechaInicio,
              categoria: catNombre,
              rival: nombrePareja(rival),
              resultado: final.resultado ?? null,
            })
          }
        }
      }
    }

    const total = ganados + perdidos
    const winRate = total > 0 ? Math.round((ganados / total) * 100) : null

    res.json({
      torneos: participados.length,
      titulos,
      titulosDetalle,
      partidos: { total, ganados, perdidos, winRate },
      reservas: { total: confirmadas.length, horasTotales: Math.round(confirmadas.length * 1.5) },
      ultimaReserva,
      categoria: jugador.categoria,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al calcular stats del jugador' })
  }
})

// ── GET / — admin: lista todos los jugadores del club ────────────────────────
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const jugadores = await prisma.jugador.findMany({
      where: { clubId: req.user.clubId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        dni: true,
        email: true,
        telefono: true,
        categoria: true,
        cuentaActiva: true,
        activo: true,
        createdAt: true,
        _count: {
          select: {
            turnosFijos: { where: { estado: 'confirmado' } },
            reservas: { where: { estado: 'confirmada', esTurnoFijo: false } },
          },
        },
      },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    })
    res.json(jugadores)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST / — admin: dar de alta un jugador manualmente ───────────────────────
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, apellido, dni, email, telefono, categoria } = req.body
  if (!nombre || !apellido || !dni) {
    return res.status(400).json({ error: 'nombre, apellido y dni son requeridos' })
  }

  try {
    const existente = await prisma.jugador.findUnique({
      where: { clubId_dni: { clubId: req.user.clubId, dni } },
    })
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un jugador con ese DNI en el club' })
    }

    const jugador = await prisma.jugador.create({
      data: {
        clubId: req.user.clubId,
        nombre,
        apellido,
        dni,
        email: email ?? null,
        telefono: telefono ?? null,
        categoria: categoria ?? null,
        cuentaActiva: false,
      },
      select: {
        id: true, nombre: true, apellido: true, dni: true,
        email: true, telefono: true, categoria: true,
        cuentaActiva: true, activo: true, createdAt: true,
        _count: {
          select: {
            turnosFijos: { where: { estado: 'confirmado' } },
            reservas: { where: { estado: 'confirmada', esTurnoFijo: false } },
          },
        },
      },
    })
    res.status(201).json(jugador)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── PATCH /:id — admin: editar datos de un jugador ───────────────────────────
router.patch('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { nombre, apellido, email, telefono, categoria, activo } = req.body
  try {
    const jugador = await prisma.jugador.findUnique({ where: { id: req.params.id } })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })
    if (jugador.clubId !== req.user.clubId) return res.status(403).json({ error: 'Acceso denegado' })

    // No permitir dar de baja a un jugador con deuda pendiente (cargos + turnos impagos)
    if (activo === false) {
      const deuda = await contarDeudaPendiente(req.user.clubId, req.params.id)
      if (deuda > 0) {
        return res.status(409).json({ error: 'jugador_con_deuda', message: `No se puede dar de baja: el jugador tiene ${deuda} deuda${deuda > 1 ? 's' : ''} pendiente${deuda > 1 ? 's' : ''}.` })
      }
    }

    const updated = await prisma.jugador.update({
      where: { id: req.params.id },
      data: {
        ...(nombre    !== undefined && { nombre }),
        ...(apellido  !== undefined && { apellido }),
        ...(email     !== undefined && { email }),
        ...(telefono  !== undefined && { telefono }),
        ...(categoria !== undefined && { categoria }),
        ...(activo    !== undefined && { activo }),
      },
      select: {
        id: true, nombre: true, apellido: true, dni: true,
        email: true, telefono: true, categoria: true,
        cuentaActiva: true, activo: true, createdAt: true,
        _count: {
          select: {
            turnosFijos: { where: { estado: 'confirmado' } },
            reservas: { where: { estado: 'confirmada', esTurnoFijo: false } },
          },
        },
      },
    })
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── DELETE /:id — admin: eliminar jugador sin cuenta ─────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const jugador = await prisma.jugador.findUnique({ where: { id: req.params.id } })
    if (!jugador) return res.status(404).json({ error: 'Jugador no encontrado' })
    if (jugador.clubId !== req.user.clubId) return res.status(403).json({ error: 'Acceso denegado' })
    if (jugador.cuentaActiva) return res.status(400).json({ error: 'No se puede eliminar un jugador con cuenta activa' })

    // No permitir eliminar a un jugador con deuda pendiente (cargos + turnos impagos)
    const deuda = await contarDeudaPendiente(req.user.clubId, req.params.id)
    if (deuda > 0) {
      return res.status(409).json({ error: 'jugador_con_deuda', message: `No se puede eliminar: el jugador tiene ${deuda} deuda${deuda > 1 ? 's' : ''} pendiente${deuda > 1 ? 's' : ''}.` })
    }

    await prisma.jugador.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
