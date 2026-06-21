import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, Clock, XCircle, Info, X, CheckCircle } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import useClubStore from '../store/clubStore'
import useReservasStore from '../store/reservasStore'
import { useToast } from '../components/ui/ToastProvider'
import { api } from '../lib/api'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGO = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const fmtFechaHeader = (fechaStr, hoyStr) => {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const diaSemana = DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
  return fechaStr === hoyStr
    ? `Hoy · ${diaSemana} ${d} de ${MESES_LARGO[m - 1]}`
    : `${diaSemana} ${d} de ${MESES_LARGO[m - 1]}`
}

// ─── Fila de reserva ──────────────────────────────────────────────────────────
// showDate=true: muestra el date box (usado en historial donde no hay header de fecha)

const FilaReserva = ({ r, onCancelar, showDate = false }) => {
  const esPendiente = r.estado === 'pendiente'
  const esPasada = r.esPasada
  const mesIdx = parseInt(r.fecha.slice(5, 7)) - 1
  const dia = r.fecha.slice(8)

  const dateBoxCls = esPasada
    ? 'bg-white/3 border border-white/5'
    : esPendiente
    ? 'bg-amber-500/10 border border-amber-500/20'
    : 'bg-club/10 border border-club/20'
  const dateTextCls = esPasada ? 'text-white/20' : esPendiente ? 'text-amber-400' : 'text-club'

  return (
    <div className={`px-4 py-3.5 flex items-center gap-3 transition-colors ${
      esPasada ? 'opacity-40' : esPendiente ? 'bg-amber-500/3 hover:bg-amber-500/6' : 'hover:bg-white/2'
    }`}>
      {showDate && (
        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${dateBoxCls}`}>
          <span className={`font-black text-base leading-none ${dateTextCls}`}>{dia}</span>
          <span className={`text-[9px] uppercase ${dateTextCls} opacity-60`}>{MESES[mesIdx]}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`font-semibold text-sm truncate ${esPasada ? 'text-white/40' : 'text-white'}`}>
            {r.canchaNombre}
          </p>
          {esPendiente && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
              Pendiente
            </span>
          )}
          {!esPendiente && !esPasada && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0 flex items-center gap-1">
              <CheckCircle size={9} /> Confirmada
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-white/40 text-xs flex items-center gap-1">
            <Clock size={10} /> {r.hora}{r.horaFin ? ` a ${r.horaFin}` : ''}
          </span>
          {r.precio > 0 && (
            <span className={`text-xs font-medium ${esPasada ? 'text-white/20' : esPendiente ? 'text-amber-400/70' : 'text-club/70'}`}>
              ${r.precio.toLocaleString('es-AR')}
            </span>
          )}
          {r.canchaInfo && (
            <span className="text-white/20 text-[10px] hidden sm:inline">{r.canchaInfo}</span>
          )}
        </div>
      </div>
      {esPasada ? (
        <span className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/25 text-xs font-medium">
          <CheckCircle size={12} /> Finalizado
        </span>
      ) : (
        <button
          onClick={() => onCancelar(r)}
          className="shrink-0 flex items-center gap-1 text-xs font-medium text-red-400/60 hover:text-red-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/8"
        >
          <XCircle size={13} /> Cancelar
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlayerMisReservasPage() {
  const token = usePlayerStore((s) => s.token)
  const club = useClubStore((s) => s.club)
  const { cancelarReserva } = useReservasStore()
  const toast = useToast()

  const [reservas, setReservas] = useState([])
  const [canchas, setCanchas] = useState([])
  const [loading, setLoading] = useState(true)
  const [reservaACancelar, setReservaACancelar] = useState(null)
  const [cancelando, setCancelando] = useState(false)
  const [filtro, setFiltro] = useState('proximas') // 'proximas' | 'todas'

  const fetchReservas = () => {
    if (!token) return
    api.get('/reservas/me', { Authorization: `Bearer ${token}` })
      .then((data) => setReservas(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const clubId = club?.id
    if (!clubId) return
    api.get(`/canchas?clubId=${clubId}`)
      .then((data) => setCanchas(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [club?.id])

  useEffect(() => {
    fetchReservas()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const reservasMapped = useMemo(() => {
    const ahora = new Date()
    return reservas
      .filter((r) => !r.esTurnoFijo && r.estado !== 'cancelada')
      .map((r) => {
        const canchaDB = canchas.find((c) => c.id === r.canchaId)
        // Comparar fecha + horaFin con la hora actual exacta
        const [y, m, d] = r.fecha.split('-').map(Number)
        const [hh, mm] = (r.horaFin || r.horaInicio || '23:59').split(':').map(Number)
        const finDt = new Date(y, m - 1, d, hh, mm)
        // "00:00" es medianoche del día siguiente: sin esto, un turno 22:30–00:00 se marca "pasado" todo el día.
        if (r.horaFin === '00:00') finDt.setDate(finDt.getDate() + 1)
        return {
          id: r.id,
          canchaNombre: r.cancha?.nombre ?? canchaDB?.nombre ?? 'Cancha',
          canchaInfo: r.cancha ? `${r.cancha.tipo ?? 'Padel'} · ${r.cancha.indoor ? 'Indoor' : 'Outdoor'}` : '',
          fecha: r.fecha,
          hora: r.horaInicio,
          horaFin: r.horaFin,
          precio: r.precio ?? 0,
          estado: r.estado,
          esPasada: finDt < ahora,
        }
      })
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
  }, [reservas, canchas])

  const hoyStr = fmtDate(new Date())
  const proximas = useMemo(
    () => reservasMapped.filter((r) => !r.esPasada),
    [reservasMapped]
  )
  const pasadas = useMemo(
    () => reservasMapped.filter((r) => r.esPasada).reverse(),
    [reservasMapped]
  )
  const proximasPorFecha = useMemo(() => {
    const grupos = {}
    proximas.forEach((r) => {
      if (!grupos[r.fecha]) grupos[r.fecha] = []
      grupos[r.fecha].push(r)
    })
    return Object.entries(grupos).sort(([a], [b]) => a.localeCompare(b))
  }, [proximas])

  // Política de cancelación
  const cancelacionInfo = useMemo(() => {
    if (!reservaACancelar) return { horasMinimas: 0, horasRestantes: Infinity, fueraDePlazo: false }
    const horasMinimas = club?.horasCancelacion ?? 0
    const [y, m, d] = reservaACancelar.fecha.split('-').map(Number)
    const [h, min] = reservaACancelar.hora.split(':').map(Number)
    const fechaTurno = new Date(y, m - 1, d, h, min)
    const horasRestantes = (fechaTurno - new Date()) / (1000 * 60 * 60)
    const fueraDePlazo = horasMinimas > 0 && horasRestantes < horasMinimas && horasRestantes >= 0
    return { horasMinimas, horasRestantes, fueraDePlazo }
  }, [reservaACancelar, club?.horasCancelacion])

  const { horasMinimas, horasRestantes, fueraDePlazo } = cancelacionInfo

  const handleCancelar = async () => {
    if (cancelando || !reservaACancelar) return
    setCancelando(true)
    try {
      const res = await api.delete(`/reservas/${reservaACancelar.id}`, { Authorization: `Bearer ${token}` })
      cancelarReserva(reservaACancelar.id)
      setReservas((prev) => prev.filter((r) => r.id !== reservaACancelar.id))
      setReservaACancelar(null)
      toast.success(res?.cargoAplicado
        ? 'Reserva cancelada · se aplicó un cargo por cancelar fuera de plazo'
        : 'Reserva cancelada')
    } catch (err) {
      console.error('Error al cancelar reserva:', err)
      toast.error(err?.message || 'No se pudo cancelar la reserva')
    } finally {
      setCancelando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-xl font-bold">Mis reservas</h1>
          <p className="text-white/30 text-sm mt-0.5">Reservas eventuales de cancha</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-2xl p-1">
          {[
            { key: 'proximas', label: `Próximas (${proximas.length})` },
            { key: 'todas',    label: `Todas (${reservasMapped.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                filtro === key
                  ? 'bg-club text-[#0d1117]'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <svg className="animate-spin h-6 w-6 text-white/20" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : filtro === 'proximas' && proximas.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-white/20">
            <CalendarDays size={32} className="opacity-40" />
            <p className="text-sm">No tenés reservas próximas</p>
          </div>
        ) : filtro === 'todas' && reservasMapped.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-white/20">
            <CalendarDays size={32} className="opacity-40" />
            <p className="text-sm">No tenés reservas registradas</p>
          </div>
        ) : filtro === 'proximas' ? (
          /* ── Vista Próximas: agrupada por fecha ───────────────────────── */
          <div>
            {proximasPorFecha.map(([fecha, reservasDia]) => (
              <div key={fecha}>
                <div className="px-4 py-2.5 bg-white/3 border-b border-white/5 flex items-center gap-2.5">
                  {fecha === hoyStr && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-club/20 text-club border border-club/30">HOY</span>
                  )}
                  <span className="text-white/60 text-[11px] font-bold capitalize">{fmtFechaHeader(fecha, hoyStr)}</span>
                  {reservasDia.length > 1 && (
                    <span className="text-white/20 text-[10px]">{reservasDia.length} reservas</span>
                  )}
                </div>
                <div className="divide-y divide-white/5">
                  {reservasDia.map((r) => <FilaReserva key={r.id} r={r} onCancelar={setReservaACancelar} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Vista Todas: sección Próximas + sección Historial ────────── */
          <div>
            {proximas.length > 0 && (
              <div>
                <div className="px-4 py-2.5 bg-club/5 border-b border-club/10 flex items-center gap-2">
                  <span className="text-club/70 text-[10px] font-black uppercase tracking-widest">Próximas</span>
                  <span className="text-club/30 text-[10px]">{proximas.length}</span>
                </div>
                {proximasPorFecha.map(([fecha, reservasDia]) => (
                  <div key={fecha}>
                    <div className="px-4 py-2 bg-white/2 border-b border-white/4 flex items-center gap-2">
                      {fecha === hoyStr && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-club/20 text-club border border-club/30">HOY</span>
                      )}
                      <span className="text-white/40 text-[10px] font-semibold capitalize">{fmtFechaHeader(fecha, hoyStr)}</span>
                      {reservasDia.length > 1 && (
                        <span className="text-white/15 text-[10px]">{reservasDia.length} reservas</span>
                      )}
                    </div>
                    <div className="divide-y divide-white/5">
                      {reservasDia.map((r) => <FilaReserva key={r.id} r={r} onCancelar={setReservaACancelar} />)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pasadas.length > 0 && (
              <div>
                <div className="px-4 py-2.5 bg-white/2 border-b border-white/5 border-t border-t-white/8 flex items-center gap-2">
                  <span className="text-white/30 text-[10px] font-black uppercase tracking-widest">Historial</span>
                  <span className="text-white/15 text-[10px]">{pasadas.length}</span>
                </div>
                <div className="divide-y divide-white/5">
                  {pasadas.map((r) => <FilaReserva key={r.id} r={r} onCancelar={setReservaACancelar} showDate />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resumen historial */}
      {filtro === 'proximas' && pasadas.length > 0 && (
        <p className="text-center text-white/20 text-xs">
          {pasadas.length} reserva{pasadas.length !== 1 ? 's' : ''} en el historial —{' '}
          <button onClick={() => setFiltro('todas')} className="text-club/60 hover:text-club transition-colors">
            ver todas
          </button>
        </p>
      )}

      {/* Modal cancelación */}
      {reservaACancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setReservaACancelar(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${fueraDePlazo ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <XCircle size={16} className={fueraDePlazo ? 'text-amber-400' : 'text-red-400'} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Cancelar reserva</p>
                  <p className="text-white/30 text-xs mt-0.5">{reservaACancelar.canchaNombre} · {reservaACancelar.hora} a {reservaACancelar.horaFin}</p>
                </div>
              </div>
              <button onClick={() => setReservaACancelar(null)} className="text-white/20 hover:text-white/60 transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {fueraDePlazo ? (
                <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/25">
                  <Info size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-300 font-semibold text-xs">Cancelación fuera de plazo</p>
                    <p className="text-white/40 text-xs mt-1 leading-relaxed">
                      El club requiere cancelar con al menos <span className="text-amber-300 font-bold">{horasMinimas}h de anticipación</span>.
                      Se registrará un cargo de <span className="text-amber-300 font-bold">${reservaACancelar.precio?.toLocaleString('es-AR')}</span> en tu cuenta.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-white/50 text-xs leading-relaxed">
                  ¿Estás seguro que deseás cancelar esta reserva? Esta acción no se puede deshacer.
                  {horasMinimas > 0 && (
                    <span className="block mt-1 text-club/60">
                      Cancelación gratuita — quedan {Math.floor(horasRestantes)}h de anticipación (mínimo {horasMinimas}h).
                    </span>
                  )}
                </p>
              )}

              <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/3 border border-white/8">
                <div className="w-10 h-10 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                  <CalendarDays size={18} className="text-white/50" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{reservaACancelar.canchaNombre}</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    {MESES[parseInt(reservaACancelar.fecha.slice(5, 7)) - 1]} {reservaACancelar.fecha.slice(8)} · {reservaACancelar.hora} a {reservaACancelar.horaFin}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCancelar}
                disabled={cancelando}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
                  fueraDePlazo
                    ? 'bg-amber-500 text-[#0d1117] hover:bg-amber-400 shadow-amber-500/20'
                    : 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/20'
                }`}
              >
                {cancelando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle size={15} />
                    {fueraDePlazo
                      ? `Cancelar con cargo ($${reservaACancelar.precio?.toLocaleString('es-AR')})`
                      : 'Sí, cancelar reserva'}
                  </>
                )}
              </button>

              <button
                onClick={() => setReservaACancelar(null)}
                className="w-full py-2.5 rounded-2xl text-white/30 hover:text-white/60 text-sm font-medium transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
