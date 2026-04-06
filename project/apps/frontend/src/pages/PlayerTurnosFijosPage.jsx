import { Repeat, AlertTriangle, CalendarDays, X, Clock } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import useNotificacionesStore from '../store/notificacionesStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import { useState } from 'react'

const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const DIAS_INDEX = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// Si hoy es el día del turno y la hora no pasó → devuelve hoy.
// Si no → devuelve la próxima ocurrencia (máx 7 días).
const getFechaDisponible = (diaKey, horaInicio) => {
  const ahora = new Date()
  const target = DIAS_INDEX[diaKey]

  if (ahora.getDay() === target) {
    // Estamos en el día correcto: ver si la hora de inicio todavía no pasó
    const [h, m] = horaInicio.split(':').map(Number)
    const inicioMs = h * 60 + m
    const ahoraMs = ahora.getHours() * 60 + ahora.getMinutes()
    if (ahoraMs < inicioMs) {
      // Turno vigente hoy
      const hoy = new Date(ahora)
      hoy.setHours(0, 0, 0, 0)
      return hoy
    }
  }

  // Próxima ocurrencia (nunca hoy)
  const base = new Date(ahora)
  base.setHours(0, 0, 0, 0)
  const diff = (target - base.getDay() + 7) % 7
  base.setDate(base.getDate() + (diff === 0 ? 7 : diff))
  return base
}

const fmtFechaLegible = (d) =>
  `${DIAS_LABEL[['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][d.getDay()]]} ${d.getDate()} ${MESES[d.getMonth()]}`

// ─── Modal ausencia ───────────────────────────────────────────────────────────

const ModalAusencia = ({ turno, fecha, onConfirmar, onCerrar }) => {
  const esHoy = localISO(fecha) === localISO(new Date())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">No puedo asistir</p>
              <p className="text-white/30 text-xs mt-0.5">{turno.canchaNombre} · {turno.inicio} a {turno.fin}</p>
            </div>
          </div>
          <button onClick={onCerrar} className="text-white/20 hover:text-white/60 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          <p className="text-white/50 text-xs leading-relaxed">
            {esHoy
              ? 'Estás avisando que no podés asistir al turno de hoy. El admin liberará el slot.'
              : 'Tu aviso se enviará al admin para que libere el turno de esa fecha.'}
          </p>

          {/* Fecha destacada */}
          <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-red-500/8 border border-red-500/20">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-red-300 font-bold text-sm">{fmtFechaLegible(fecha)}</p>
                {esHoy && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30">
                    Hoy
                  </span>
                )}
              </div>
              <p className="text-white/30 text-xs mt-0.5">{turno.inicio} a {turno.fin}</p>
            </div>
          </div>

          <button
            onClick={() => onConfirmar(localISO(fecha))}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all
              bg-red-500 text-white hover:bg-red-400 active:scale-[0.98] shadow-lg shadow-red-500/20"
          >
            <AlertTriangle size={15} />
            Confirmar ausencia
          </button>

          <button onClick={onCerrar} className="text-white/25 hover:text-white/50 text-xs text-center transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PlayerTurnosFijosPage = () => {
  const player = usePlayerStore((s) => s.player)
  const liberarTurnoNotif = useNotificacionesStore((s) => s.liberarTurno)
  const { turnosFijos, registrarAusenciaPendiente } = useTurnosFijosStore()

  const [modalTurno, setModalTurno] = useState(null)

  const activos = turnosFijos.filter((t) => t.activo)

  const handleConfirmarAusencia = (fecha) => {
    registrarAusenciaPendiente(modalTurno.id, fecha)
    liberarTurnoNotif({
      jugador: `${player?.nombre ?? ''} ${player?.apellido ?? ''}`.trim(),
      cancha: modalTurno.canchaNombre,
      fecha,
      inicio: modalTurno.inicio,
      fin: modalTurno.fin,
      turnoFijoId: modalTurno.id,
    })
    setModalTurno(null)
  }

  return (
    <div className="flex flex-col gap-6">

      {modalTurno && (
        <ModalAusencia
          turno={modalTurno}
          fecha={getFechaDisponible(modalTurno.dia, modalTurno.inicio)}
          onConfirmar={handleConfirmarAusencia}
          onCerrar={() => setModalTurno(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold">Mis turnos fijos</h1>
        <p className="text-white/40 text-sm mt-1">
          {activos.length} turno{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Lista */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2">
          <Repeat size={16} className="text-[#afca0b]" />
          <h3 className="text-white font-semibold">Turnos reservados</h3>
        </div>

        {activos.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-white/25">
            <CalendarDays size={32} className="opacity-40" />
            <p className="text-sm">No tenés turnos fijos asignados.</p>
            <p className="text-xs text-white/20">Solicitá uno desde "Reservar cancha" activando la opción de turno fijo.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {activos.map((turno) => {
              const pendientes = turno.ausenciasPendientes || []
              const ausentes = turno.diasAusentes || []

              const proxFecha = getFechaDisponible(turno.dia, turno.inicio)
              const proxISO = localISO(proxFecha)
              const esPendiente = pendientes.includes(proxISO)
              const esAusente = ausentes.includes(proxISO)
              const bloqueado = esPendiente || esAusente

              return (
                <div key={turno.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-1.5 h-12 rounded-full shrink-0 ${esPendiente ? 'bg-amber-500/60' : esAusente ? 'bg-white/15' : 'bg-violet-500/60'}`} />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${bloqueado ? 'text-white/40' : 'text-white'}`}>
                      {turno.canchaNombre}
                    </p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {DIAS_LABEL[turno.dia] ?? turno.dia} · {turno.inicio} a {turno.fin}
                    </p>
                    <p className="text-white/25 text-[10px] mt-0.5">
                      {localISO(proxFecha) === localISO(new Date())
                        ? `Hoy · ${turno.inicio} a ${turno.fin}`
                        : `Próximo: ${fmtFechaLegible(proxFecha)}`}
                    </p>
                    {esPendiente && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock size={10} className="text-amber-400 animate-pulse" />
                        <span className="text-amber-400 text-[10px] font-semibold">Ausencia pendiente de confirmación</span>
                      </div>
                    )}
                    {esAusente && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-white/30 text-[10px]">Ausencia confirmada por el admin</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${bloqueado ? 'text-white/20' : 'text-violet-400'}`}>
                      ${turno.precio?.toLocaleString('es-AR')}
                    </p>
                    <p className="text-white/25 text-[10px]">por turno</p>
                  </div>

                  <button
                    disabled={bloqueado}
                    onClick={() => setModalTurno(turno)}
                    className={[
                      'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shrink-0 border',
                      bloqueado
                        ? 'text-white/20 border-white/8 bg-white/3 cursor-not-allowed'
                        : 'text-red-400 border-red-400/25 bg-red-400/8 hover:bg-red-400/15',
                    ].join(' ')}
                  >
                    <AlertTriangle size={13} />
                    No puedo ir
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

export default PlayerTurnosFijosPage
