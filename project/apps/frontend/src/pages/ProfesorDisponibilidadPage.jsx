import { useState, useMemo } from 'react'
import {
  ChevronLeft, ChevronRight, Clock, X, AlertCircle,
  CheckCircle, Trash2, CalendarDays,
} from 'lucide-react'
import useAuthProfesorStore from '../store/authProfesorStore'
import useReservasAdminStore from '../store/reservasAdminStore'
import useClubStore from '../store/clubStore'
import { FRANJAS_PROFESOR } from '../features/admin/reservasMockData'
import { inRange } from '../utils/timeUtils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const addDays = (iso, n) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const fmtFecha = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const fmtDiaCorto = (iso) => {
  const d = new Date(iso + 'T12:00:00')
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return dias[d.getDay()]
}

const DIAS_CLUB = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const getDiaNombre = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return DIAS_CLUB[new Date(y, m - 1, d).getDay()]
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ProfesorDisponibilidadPage = () => {
  const { profesor } = useAuthProfesorStore()
  const reservas = useReservasAdminStore((s) => s.reservas)
  const addReservaAdmin = useReservasAdminStore((s) => s.addReserva)
  const deleteReservaAdmin = useReservasAdminStore((s) => s.deleteReserva)
  const horarios = useClubStore((s) => s.club.horarios)

  const hoy = todayISO()
  const [fecha, setFecha] = useState(hoy)
  const [modoBloqueo, setModoBloqueo] = useState('franjas') // 'diaCompleto' | 'franjas'
  const [franjasSeleccionadas, setFranjasSeleccionadas] = useState([])
  const [guardado, setGuardado] = useState(false)

  const diasSemana = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(hoy, i)), // 2 semanas adelante
    [hoy]
  )

  // Horario del club para el día seleccionado
  const horarioDelDia = useMemo(() => {
    const diaNombre = getDiaNombre(fecha)
    return horarios[diaNombre] ?? { apertura: '07:00', cierre: '23:00', activo: true }
  }, [fecha, horarios])

  // Franjas filtradas por horario del club (mismo patrón que PlayerReservasPage)
  const franjasDelDia = useMemo(() => {
    if (!horarioDelDia.activo) return []
    return FRANJAS_PROFESOR.filter((f) => inRange(f.inicio, f.fin, horarioDelDia.apertura, horarioDelDia.cierre))
  }, [horarioDelDia])

  // No-disponibilidades ya marcadas para este día
  const noDisponiblesDelDia = useMemo(
    () =>
      reservas.filter(
        (r) =>
          r.tipo === 'bloqueado' &&
          r.profesorId === profesor?.id &&
          r.fecha === fecha
      ),
    [reservas, profesor, fecha]
  )

  // Franja bloqueada por el propio profesor
  const esPropioBloqueado = (franja) =>
    noDisponiblesDelDia.some(
      (r) => r.inicio <= franja.inicio && r.fin >= franja.fin
    )

  // Bloqueo de día completo (cubre todas las franjas)
  const tieneDiaCompleto = noDisponiblesDelDia.some((r) => r.diaCompleto)

  // Franjas con conflictos (el profesor tiene una clase en ese horario)
  const misClasesDia = useMemo(
    () =>
      reservas.filter(
        (r) => r.tipo === 'clase' && r.profesorId === profesor?.id && r.fecha === fecha
      ),
    [reservas, profesor, fecha]
  )

  const tieneConflicto = (franja) =>
    misClasesDia.some(
      (c) => c.inicio <= franja.inicio && c.fin >= franja.fin
    )

  const toggleFranja = (franja) => {
    setFranjasSeleccionadas((prev) =>
      prev.includes(franja.inicio)
        ? prev.filter((f) => f !== franja.inicio)
        : [...prev, franja.inicio]
    )
  }

  const handleGuardar = () => {
    if (!profesor) return

    if (modoBloqueo === 'diaCompleto') {
      // Bloquea un slot que abarca todo el día
      addReservaAdmin({
        id: Date.now(),
        tipo: 'bloqueado',
        profesorId: profesor.id,
        profesorNombre: `${profesor.nombre} ${profesor.apellido}`,
        diaCompleto: true,
        canchaId: 0, // 0 = todos los recursos del profesor (no es una cancha específica)
        fecha,
        inicio: horarioDelDia.apertura,
        fin: horarioDelDia.cierre,
        razon: 'Indisponibilidad - Profesor',
        notas: `No disponible: ${profesor.nombre} ${profesor.apellido}`,
        estado: 'confirmada',
        jugadores: [],
        pago: null,
        monto: 0,
        creadoPor: 'profesor',
      })
    } else {
      // Bloquea cada franja seleccionada individualmente
      franjasSeleccionadas.forEach((inicioFranja, i) => {
        const franja = franjasDelDia.find((f) => f.inicio === inicioFranja)
        if (!franja) return
        addReservaAdmin({
          id: Date.now() + i,
          tipo: 'bloqueado',
          profesorId: profesor.id,
          profesorNombre: `${profesor.nombre} ${profesor.apellido}`,
          diaCompleto: false,
          canchaId: 0,
          fecha,
          inicio: franja.inicio,
          fin: franja.fin,
          razon: 'Indisponibilidad - Profesor',
          notas: `No disponible: ${profesor.nombre} ${profesor.apellido}`,
          estado: 'confirmada',
          jugadores: [],
          pago: null,
          monto: 0,
          creadoPor: 'profesor',
        })
      })
    }

    setFranjasSeleccionadas([])
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2500)
  }

  const handleEliminarBloqueo = (id) => {
    deleteReservaAdmin(id)
  }

  const conflictosDiaCompleto = misClasesDia.length > 0

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Mi disponibilidad</h1>
        <p className="text-white/40 text-sm mt-1">
          Marcá los días u horarios en los que no vas a poder dar clases
        </p>
      </div>

      {/* Aviso */}
      <div className="bg-orange-400/8 border border-orange-400/20 rounded-2xl px-5 py-4 flex gap-3">
        <AlertCircle size={16} className="text-orange-400 shrink-0 mt-0.5" />
        <p className="text-white/60 text-sm leading-relaxed">
          Los bloques de no-disponibilidad son visibles para el administrador del club.
          Si ya tenés clases en ese horario, el admin verá el conflicto.
        </p>
      </div>

      {/* Selector de día */}
      <div>
        <p className="text-white/50 text-xs font-medium mb-3 uppercase tracking-wide">Seleccioná el día</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFecha((f) => addDays(f, -1)); setFranjasSeleccionadas([]) }}
            disabled={fecha <= hoy}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 disabled:opacity-20 transition-all"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="flex gap-1.5 flex-1 overflow-x-auto pb-1">
            {diasSemana.map((d) => {
              const tieneBloqueo = reservas.some(
                (r) => r.tipo === 'bloqueado' && r.profesorId === profesor?.id && r.fecha === d
              )
              const sel = d === fecha
              return (
                <button
                  key={d}
                  onClick={() => { setFecha(d); setFranjasSeleccionadas([]) }}
                  className={[
                    'flex flex-col items-center px-2.5 py-2 rounded-xl border transition-all min-w-[44px] shrink-0',
                    sel
                      ? 'bg-orange-400/15 border-orange-400/40 text-orange-400'
                      : tieneBloqueo
                        ? 'border-red-500/40 text-red-400 bg-red-500/8'
                        : 'border-white/8 text-white/40 hover:text-white hover:bg-white/4',
                  ].join(' ')}
                >
                  <span className="text-[8px] font-bold uppercase">{d === hoy ? 'Hoy' : fmtDiaCorto(d)}</span>
                  <span className="text-sm font-black leading-none">{new Date(d + 'T12:00:00').getDate()}</span>
                  {tieneBloqueo && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-0.5" />}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => { setFecha((f) => addDays(f, 1)); setFranjasSeleccionadas([]) }}
            className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Bloqueos existentes */}
      {noDisponiblesDelDia.length > 0 && (
        <div className="bg-red-500/8 border border-red-500/20 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-red-500/15">
            <p className="text-red-400 text-sm font-bold">
              No-disponibilidades marcadas — {fmtFecha(fecha)}
            </p>
          </div>
          <div className="divide-y divide-red-500/10">
            {noDisponiblesDelDia.map((b) => (
              <div key={b.id} className="px-5 py-3 flex items-center gap-4">
                <Clock size={14} className="text-red-400 shrink-0" />
                <div className="flex-1">
                  {b.diaCompleto ? (
                    <p className="text-red-300 text-sm font-medium">Día completo</p>
                  ) : (
                    <p className="text-red-300 text-sm font-medium">{b.inicio} a {b.fin}</p>
                  )}
                </div>
                <button
                  onClick={() => handleEliminarBloqueo(b.id)}
                  className="text-red-500/50 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nuevo bloqueo */}
      {!tieneDiaCompleto && (
        <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5">
            <p className="text-white font-bold text-sm">Marcar no-disponibilidad</p>
            <p className="text-white/40 text-xs mt-0.5 capitalize">{fmtFecha(fecha)}</p>
          </div>

          <div className="px-5 py-5 flex flex-col gap-5">

            {/* Modo */}
            <div>
              <p className="text-white/50 text-xs font-medium mb-3 uppercase tracking-wide">Tipo de bloqueo</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setModoBloqueo('franjas'); setFranjasSeleccionadas([]) }}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all',
                    modoBloqueo === 'franjas'
                      ? 'bg-orange-400/15 border-orange-400/40 text-orange-400'
                      : 'border-white/10 text-white/40 hover:text-white',
                  ].join(' ')}
                >
                  Franjas específicas
                </button>
                <button
                  onClick={() => { setModoBloqueo('diaCompleto'); setFranjasSeleccionadas([]) }}
                  disabled={conflictosDiaCompleto}
                  className={[
                    'flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                    modoBloqueo === 'diaCompleto'
                      ? 'bg-orange-400/15 border-orange-400/40 text-orange-400'
                      : 'border-white/10 text-white/40 hover:text-white',
                  ].join(' ')}
                >
                  Día completo
                </button>
              </div>
              {conflictosDiaCompleto && (
                <p className="text-amber-400 text-xs mt-2 flex items-center gap-1.5">
                  <AlertCircle size={12} />
                  Tenés clases en este día. No podés bloquear el día completo.
                </p>
              )}
            </div>

            {/* Franjas */}
            {modoBloqueo === 'franjas' && (
              <div>
                <p className="text-white/50 text-xs font-medium mb-3 uppercase tracking-wide">
                  Seleccioná los horarios
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {franjasDelDia.map((f) => {
                    const yaBloqueda = esPropioBloqueado(f)
                    const conflicto = tieneConflicto(f)
                    const seleccionada = franjasSeleccionadas.includes(f.inicio)

                    return (
                      <button
                        key={f.inicio}
                        type="button"
                        disabled={yaBloqueda || conflicto}
                        onClick={() => toggleFranja(f)}
                        className={[
                          'py-2.5 px-1 rounded-xl text-[10px] font-bold transition-all border text-center',
                          yaBloqueda
                            ? 'bg-red-500/15 border-red-500/30 text-red-400 cursor-not-allowed opacity-60'
                            : conflicto
                              ? 'bg-amber-400/10 border-amber-400/30 text-amber-400 cursor-not-allowed opacity-60'
                              : seleccionada
                                ? 'bg-orange-400 border-orange-400 text-white'
                                : 'border-white/10 text-white/50 hover:border-orange-400/40 hover:text-white bg-white/4',
                        ].join(' ')}
                      >
                        <span className="block">{f.inicio}</span>
                        {yaBloqueda && <span className="block text-[8px] opacity-70">bloqueado</span>}
                        {conflicto && <span className="block text-[8px] opacity-70">clase</span>}
                      </button>
                    )
                  })}
                </div>
                <p className="text-white/20 text-xs mt-2">
                  {franjasSeleccionadas.length === 0
                    ? 'Seleccioná al menos un horario'
                    : `${franjasSeleccionadas.length} horario${franjasSeleccionadas.length !== 1 ? 's' : ''} seleccionado${franjasSeleccionadas.length !== 1 ? 's' : ''}`
                  }
                </p>
              </div>
            )}

            {/* Día completo: solo confirmar */}
            {modoBloqueo === 'diaCompleto' && (
              <div className="bg-orange-400/8 border border-orange-400/20 rounded-xl px-4 py-3">
                <p className="text-white/60 text-sm">
                  Se marcará todo el día como no disponible. El administrador verá este bloqueo en la grilla.
                </p>
              </div>
            )}

            {/* Botón guardar */}
            <button
              onClick={handleGuardar}
              disabled={modoBloqueo === 'franjas' && franjasSeleccionadas.length === 0}
              className="w-full bg-orange-400 hover:bg-orange-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
            >
              {guardado ? (
                <>
                  <CheckCircle size={16} />
                  Guardado
                </>
              ) : (
                <>
                  <Clock size={16} />
                  Marcar no-disponibilidad
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {tieneDiaCompleto && (
        <div className="bg-white/4 border border-white/8 rounded-2xl px-5 py-5 text-center">
          <CalendarDays size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-white/60 text-sm">Este día ya está marcado como no disponible.</p>
          <p className="text-white/30 text-xs mt-1">Eliminá el bloqueo de arriba para modificarlo.</p>
        </div>
      )}
    </div>
  )
}

export default ProfesorDisponibilidadPage
