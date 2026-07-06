// MOTOR DE SEÑALES DE ASCENSO ("está pasado"). Detecta jugadores demasiado buenos para su
// categoría, con reglas de TÍTULOS (no ELO — un club chico no tiene volumen para un ranking
// dinámico; ver research del bibliotecario). Asistido: acá NO se asciende a nadie, solo se
// computa la señal + un `motivo` en criollo que WIarky usa para avisarle al dueño.
//
// Reglas (configurables por club, defaults abajo), sobre TORNEOS de los últimos N meses
// (los Americano/Super 8 NO cuentan — no son categoría competitiva):
//   - ganó >= `titulos` torneos en su categoría, O
//   - ganó con >= `parejasDistintas` compañeros distintos (mérito individual), O
//   - ganó >= `mismaPareja` veces con el mismo compañero (esa dupla domina).
import prisma from './prisma.js'
import { normalizarCategoria } from './categorias.js'

export const REGLAS_ASCENSO_DEFAULT = {
  titulos: 2,           // 2 torneos ganados en la categoría → pasado
  parejasDistintas: 3,  // ganó con 3 compañeros distintos → pasado (mérito individual)
  mismaPareja: 3,       // 3 títulos con el mismo compañero → pasado (dupla dominante)
  ventanaMeses: 12,     // ventana móvil: solo cuentan los torneos del último año
}

// Orden de categorías: índice 0 = 1ra (la mejor) … índice 7 = 8va. Ascender = bajar de número.
const ORD = ['1ra', '2da', '3ra', '4ta', '5ta', '6ta', '7ma', '8va']

// Categoría corta ("5ta Categoría" → "5ta") para los mensajes.
export const catCorta = (cat) => `${cat ?? ''}`.trim().split(' ')[0]

// Nivel numérico (1-8) de una categoría, o null si no se reconoce.
export const nivelDeCategoria = (cat) => {
  const t = catCorta(cat).toLowerCase()
  const i = ORD.indexOf(t)
  return i >= 0 ? i + 1 : null
}

// La categoría inmediatamente superior (una mejor), o null si ya es 1ra / no se reconoce.
export const categoriaSuperior = (cat) => {
  const n = nivelDeCategoria(cat)
  if (n == null || n <= 1) return null
  return `${ORD[n - 2]} Categoría`
}

// Fecha 'YYYY-MM-DD' de un torneo para la ventana (fin > inicio > createdAt).
const fechaTorneo = (t) =>
  t.fechaFin || t.fechaInicio || (t.createdAt ? t.createdAt.toISOString().slice(0, 10) : null)

/**
 * Calcula las señales de "está pasado" de TODOS los jugadores del club.
 * @param {string} clubId
 * @param {object} [reglas] - umbrales (default REGLAS_ASCENSO_DEFAULT)
 * @returns {Promise<Array>} señales de los jugadores pasados, ordenadas por fuerza de la señal
 */
export async function calcularSenalesAscenso(clubId, reglas = REGLAS_ASCENSO_DEFAULT) {
  const r = { ...REGLAS_ASCENSO_DEFAULT, ...(reglas || {}) }

  const [jugadores, torneos] = await Promise.all([
    prisma.jugador.findMany({
      where: { clubId, cuentaActiva: true, activo: true, categoria: { not: null } },
      select: { id: true, dni: true, nombre: true, apellido: true, categoria: true },
    }),
    prisma.torneo.findMany({
      where: { clubId },
      select: {
        grupos: true, brackets: true, fechaFin: true, fechaInicio: true, createdAt: true,
        parejas: { select: { id: true, jugador1Dni: true, jugador2Dni: true, categoria: true } },
      },
    }),
  ])

  // Ventana móvil: cutoff = hace `ventanaMeses` meses.
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - r.ventanaMeses)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  const enVentana = torneos.filter((t) => { const f = fechaTorneo(t); return f && f >= cutoffStr })

  const senales = []

  for (const j of jugadores) {
    if (!j.dni || !j.categoria) continue
    const cat = normalizarCategoria(j.categoria)
    const dni = j.dni
    if (categoriaSuperior(cat) == null) continue // ya está en 1ra → no hay a dónde ascender

    let torneoCount = 0, ganados = 0, perdidos = 0, titulos = 0, finales = 0
    const titulosPorCompanero = {} // dniCompañero → cantidad de títulos ganados con él

    for (const t of enVentana) {
      // Parejas del jugador en ESTA categoría dentro de este torneo.
      const misParejas = t.parejas.filter(
        (p) => (p.jugador1Dni === dni || p.jugador2Dni === dni) && normalizarCategoria(p.categoria) === cat
      )
      if (misParejas.length === 0) continue
      torneoCount++
      const misIds = new Set()
      const companeroDe = {} // parejaId → dni del compañero
      for (const p of misParejas) {
        misIds.add(p.id)
        companeroDe[p.id] = p.jugador1Dni === dni ? (p.jugador2Dni ?? '?') : (p.jugador1Dni ?? '?')
      }

      // Fase de grupos: solo ganados/perdidos (no hay títulos acá).
      if (Array.isArray(t.grupos)) {
        for (const zona of t.grupos) {
          if (normalizarCategoria(zona.categoria) !== cat) continue
          for (const partido of (zona.partidos ?? [])) {
            if (!partido.ganador) continue
            const esP1 = misIds.has(partido.pareja1?.id), esP2 = misIds.has(partido.pareja2?.id)
            if (!esP1 && !esP2) continue
            const gane = partido.ganador.id === (esP1 ? partido.pareja1?.id : partido.pareja2?.id)
            if (gane) ganados++; else perdidos++
          }
        }
      }

      // Eliminatoria: ganados/perdidos + TÍTULO (ganar la última ronda) + FINAL (jugar la última ronda).
      if (t.brackets && typeof t.brackets === 'object') {
        // El bracket se indexa por la categoría TAL CUAL se guardó (puede ser "4° Categoría" viejo).
        // Buscamos la key cuya forma normalizada coincida con la del jugador, en vez de acceso directo.
        const bracketKey = Object.keys(t.brackets).find((k) => normalizarCategoria(k) === cat)
        const bracket = bracketKey ? t.brackets[bracketKey] : null
        const rondas = bracket?.rondas ?? []
        for (let ri = 0; ri < rondas.length; ri++) {
          const esUltima = ri === rondas.length - 1
          for (const partido of (rondas[ri].partidos ?? [])) {
            if (partido.estado !== 'finalizado' || !partido.ganador) continue
            const esP1 = misIds.has(partido.pareja1?.id), esP2 = misIds.has(partido.pareja2?.id)
            if (!esP1 && !esP2) continue
            const miParejaId = esP1 ? partido.pareja1?.id : partido.pareja2?.id
            const gane = partido.ganador.id === miParejaId
            if (gane) ganados++; else perdidos++
            if (esUltima) {
              finales++
              if (gane) {
                titulos++
                const comp = companeroDe[miParejaId] ?? '?'
                titulosPorCompanero[comp] = (titulosPorCompanero[comp] || 0) + 1
              }
            }
          }
        }
      }
    }

    const winRate = (ganados + perdidos) > 0 ? Math.round((ganados / (ganados + perdidos)) * 100) : 0
    const parejasDistintasConTitulo = Object.keys(titulosPorCompanero).length
    const maxTitulosMismaPareja = Object.values(titulosPorCompanero).reduce((m, v) => Math.max(m, v), 0)

    // ── Reglas → razones (en criollo, para WIarky) ──
    const razones = []
    if (titulos >= r.titulos) razones.push(`ganó ${titulos} torneos en ${catCorta(cat)}`)
    if (parejasDistintasConTitulo >= r.parejasDistintas) razones.push(`ganó con ${parejasDistintasConTitulo} parejas distintas`)
    if (maxTitulosMismaPareja >= r.mismaPareja) razones.push(`ganó ${maxTitulosMismaPareja} veces con la misma pareja`)
    // Señal secundaria (heurística previa): dominante por winRate aunque no llegue a los títulos.
    if (razones.length === 0 && winRate >= 75 && torneoCount >= 3) razones.push(`${winRate}% de victorias en ${torneoCount} torneos`)

    if (razones.length === 0) continue

    senales.push({
      jugadorId: j.id,
      nombre: `${j.nombre} ${j.apellido || ''}`.trim(),
      dni,
      categoria: cat,
      categoriaSugerida: categoriaSuperior(cat),
      titulos, finales, torneoCount, winRate,
      parejasDistintasConTitulo, maxTitulosMismaPareja,
      motivo: razones.join(' · '),
    })
  }

  // Más "pasados" primero: por títulos, luego por parejas distintas.
  senales.sort((a, b) => b.titulos - a.titulos || b.parejasDistintasConTitulo - a.parejasDistintasConTitulo)
  return senales
}

/**
 * EL "CUT": alertas de inscripción. Dado un conjunto de parejas anotadas (cada una con su
 * categoría de inscripción), marca a los jugadores que están "pasados" para esa categoría, por
 * dos señales confiables (con la data que tenemos — de ESTE club, no de otros):
 *   1. categoria_superior: su categoría DECLARADA es mejor que la de inscripción (ej. es 3ra y
 *      se anota en 4ta). Directo y 100% confiable.
 *   2. pasado: por resultados en su propia categoría (motor de señales) coincide con la de inscripción.
 * @param {string} clubId
 * @param {Array} parejas - [{ id, jugador1, jugador2, jugador1Dni, jugador2Dni, categoria }]
 * @returns {Promise<Array>} [{ parejaId, alertas: [{ dni, nombre, tipo, mensaje }] }]
 */
export async function detectarAlertasInscripcion(clubId, parejas) {
  const [jugadores, senales] = await Promise.all([
    prisma.jugador.findMany({ where: { clubId }, select: { dni: true, categoria: true } }),
    calcularSenalesAscenso(clubId),
  ])
  const catByDni = {}
  for (const j of jugadores) if (j.dni) catByDni[j.dni] = normalizarCategoria(j.categoria)
  const senalByDni = {}
  for (const s of senales) senalByDni[s.dni] = s

  const out = []
  for (const p of (parejas ?? [])) {
    const parejaCat = normalizarCategoria(p.categoria)
    const nivelP = nivelDeCategoria(parejaCat)
    const alertas = []
    const miembros = [
      { dni: p.jugador1Dni, nombreCompleto: p.jugador1 },
      { dni: p.jugador2Dni, nombreCompleto: p.jugador2 },
    ]
    for (const m of miembros) {
      if (!m.dni) continue
      const nombre = (m.nombreCompleto || '').trim().split(' ')[0] || m.nombreCompleto || 'Jugador'
      const declarada = catByDni[m.dni]
      const nivelD = nivelDeCategoria(declarada)
      // Señal 1: su categoría es mejor (número menor) que la de inscripción.
      if (nivelD != null && nivelP != null && nivelD < nivelP) {
        alertas.push({
          dni: m.dni, nombre, tipo: 'categoria_superior',
          mensaje: `${nombre} es ${catCorta(declarada)} — está anotado en ${catCorta(parejaCat)}`,
        })
        continue
      }
      // Señal 2: está "pasado" por resultados en la misma categoría de la inscripción.
      const s = senalByDni[m.dni]
      if (s && normalizarCategoria(s.categoria) === parejaCat) {
        alertas.push({
          dni: m.dni, nombre, tipo: 'pasado',
          mensaje: `${nombre} está pasado para ${catCorta(parejaCat)}: ${s.motivo}`,
        })
      }
    }
    if (alertas.length) out.push({ parejaId: p.id, alertas })
  }
  return out
}
