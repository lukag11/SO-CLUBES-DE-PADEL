import { Repeat, AlertTriangle, CalendarDays, X, Clock, Ban, CheckCircle } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import useTurnosFijosStore from '../store/turnosFijosStore'
import useClubStore from '../store/clubStore'
import { useState, useEffect, useMemo } from 'react'
import { useToast } from '../components/ui/ToastProvider'
import { api } from '../lib/api'

const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

const DIAS_INDEX = {
  domingo: 0, lunes: 1, martes: 2, miercoles: 3,
  jueves: 4, viernes: 5, sabado: 6,
}

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const localISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// Si hoy es el día del turno y la hora no pasó → devuelve hoy.
// Si no → devuelve la próxima ocurrencia (máx 7 días).
const getFechaDisponible = (diaKey, horaInicio) => {
  const ahora = new Date()
  const target = DIAS_INDEX[diaKey]

  if (ahora.getDay() === target) {
    const [h, m] = horaInicio.split(':').map(Number)
    const inicioMs = h * 60 + m
    const ahoraMs = ahora.getHours() * 60 + ahora.getMinutes()
    if (ahoraMs < inicioMs) {
      const hoy = new Date(ahora)
      hoy.setHours(0, 0, 0, 0)
      return hoy
    }
    // Ya arrancó o terminó hoy → igual devolvemos hoy para mostrar estado "Finalizado"
    const hoy = new Date(ahora)
    hoy.setHours(0, 0, 0, 0)
    return hoy
  }

  // Próxima ocurrencia (nunca hoy)
  const base = new Date(ahora)
  base.setHours(0, 0, 0, 0)
  const diff = (target - base.getDay() + 7) % 7
  base.setDate(base.getDate() + (diff === 0 ? 7 : diff))
  return base
}

// true si el turno de hoy ya terminó
const turnoYaTerminoHoy = (diaKey, horaFin) => {
  const ahora = new Date()
  if (ahora.getDay() !== DIAS_INDEX[diaKey]) return false
  const [h, m] = (horaFin || '00:00').split(':').map(Number)
  // "00:00" = medianoche del día siguiente (1440), no el minuto 0 del día. Sin esto, un turno
  // que termina a medianoche (ej: 22:30–00:00) figura como "Finalizado" todo el día sin haberse jugado.
  const finMs = horaFin === '00:00' ? 1440 : h * 60 + m
  const ahoraMs = ahora.getHours() * 60 + ahora.getMinutes()
  return ahoraMs >= finMs
}

const fmtFechaLegible = (d) =>
  `${DIAS_LABEL[['domingo','lunes','martes','miercoles','jueves','viernes','sabado'][d.getDay()]]} ${d.getDate()} ${MESES[d.getMonth()]}`

// ─── Modal ausencia ───────────────────────────────────────────────────────────

const ModalAusencia = ({ turno, fecha, horasMinimas, onConfirmar, onCerrar, enviando = false }) => {
  const esHoy = localISO(fecha) === localISO(new Date())

  const fueraDePlazo = useMemo(() => {
    if (!horasMinimas) return false
    const [y, m, d] = localISO(fecha).split('-').map(Number)
    const [h, min] = turno.inicio.split(':').map(Number)
    const fechaTurno = new Date(y, m - 1, d, h, min)
    const horasRestantes = (fechaTurno - new Date()) / (1000 * 60 * 60)
    return horasRestantes >= 0 && horasRestantes < horasMinimas
  }, [turno.inicio, fecha, horasMinimas])

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
              <p className="text-white font-bold text-sm">¿Confirmar ausencia?</p>
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

          {/* Aviso de cargo si está fuera de plazo */}
          {fueraDePlazo && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/25">
              <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300 text-xs leading-relaxed">
                Avisás con menos de <span className="font-bold">{horasMinimas}h</span> de anticipación.
                Se registrará un cargo de{' '}
                <span className="font-bold text-amber-200">${turno.precio?.toLocaleString('es-AR')}</span> en tu cuenta.
              </p>
            </div>
          )}

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
            onClick={() => !enviando && onConfirmar(localISO(fecha))}
            disabled={enviando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all
              bg-red-500 text-white hover:bg-red-400 active:scale-[0.98] shadow-lg shadow-red-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Enviando...
              </>
            ) : (
              <>
                <AlertTriangle size={15} />
                {fueraDePlazo
                  ? `Confirmar ausencia (cargo $${turno.precio?.toLocaleString('es-AR')})`
                  : 'Confirmar ausencia'}
              </>
            )}
          </button>

          <button onClick={onCerrar} className="text-white/25 hover:text-white/50 text-xs text-center transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal cancelar turno fijo (baja definitiva jugador) ─────────────────────

const ModalCancelarTurno = ({ turno, errorDeuda, procesando, proxFecha, onConfirmar, onCerrar }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !procesando && onCerrar()}>
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div
      className="relative w-full max-w-sm bg-[#0d1117] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <Ban size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Eliminar turno fijo</p>
            <p className="text-white/30 text-xs mt-0.5">Se elimina para todas las semanas futuras</p>
          </div>
        </div>
        <button onClick={() => !procesando && onCerrar()} className="text-white/20 hover:text-white/60 transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex flex-col gap-4">
        {/* Datos del turno */}
        <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/3 border border-white/8">
          <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
            <Repeat size={18} className="text-violet-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{turno.canchaNombre}</p>
            <p className="text-white/40 text-xs mt-0.5">{DIAS_LABEL[turno.dia] ?? turno.dia} · {turno.inicio} a {turno.fin}</p>
            <p className="text-white/25 text-[10px] mt-0.5">
              Deja de cobrarse desde: <span className="text-red-400 font-semibold">{fmtFechaLegible(proxFecha)}</span>
            </p>
          </div>
        </div>

        {/* Error de deuda */}
        {errorDeuda ? (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/25">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs leading-relaxed">{errorDeuda}</p>
          </div>
        ) : (
          <p className="text-white/35 text-xs leading-relaxed px-1">
            Esta acción es permanente. El slot quedará disponible para otros jugadores. Las semanas ya cobradas no se modifican.
          </p>
        )}

        {!errorDeuda && (
          <button
            onClick={onConfirmar}
            disabled={procesando}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all
              bg-red-500 text-white hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-red-500/20"
          >
            <Ban size={15} />
            {procesando ? 'Eliminando…' : 'Confirmar eliminación'}
          </button>
        )}

        <button onClick={() => !procesando && onCerrar()} className="text-white/25 hover:text-white/50 text-xs text-center transition-colors">
          {errorDeuda ? 'Cerrar' : 'No eliminar'}
        </button>
      </div>
    </div>
  </div>
)

// ─── Page ─────────────────────────────────────────────────────────────────────

const PlayerTurnosFijosPage = () => {
  const player = usePlayerStore((s) => s.player)
  const token = usePlayerStore((s) => s.token)
  const toast = useToast()
  const { turnosFijos, setTurnosFijos, registrarAusenciaPendiente, updateTurnoFijo } = useTurnosFijosStore()
  const horasMinimas = useClubStore((s) => s.club?.horasCancelacion ?? 0)

  const [modalTurno, setModalTurno] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(null) // { turno, errorDeuda }
  const [cancelando, setCancelando] = useState(false)
  const [retirandoId, setRetirandoId] = useState(null)

  // Recarga desde el backend al montar y cada 30s (para ver aprobaciones/rechazos del admin en tiempo real)
  useEffect(() => {
    if (!token) return
    const fetchTurnos = () =>
      api.get('/turnos-fijos/me', { Authorization: `Bearer ${token}` })
        .then((data) => { if (Array.isArray(data)) setTurnosFijos(data) })
        .catch((err) => console.error('[TurnosFijos] Error al cargar:', err.message))
    fetchTurnos()
    const interval = setInterval(fetchTurnos, 30_000)
    return () => clearInterval(interval)
  }, [token])

  const activos = turnosFijos.filter((t) => t.activo)
  const pendientes = turnosFijos.filter((t) => t.estado === 'pendiente')

  const turnosPorDia = useMemo(() => {
    const grupos = {}
    DIAS_ORDEN.forEach((dia) => {
      const del_dia = activos.filter((t) => t.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio))
      if (del_dia.length > 0) grupos[dia] = del_dia
    })
    return grupos
  }, [activos])

  const handleCancelarTurnoFijo = async () => {
    if (!modalCancelar?.turno) return
    setCancelando(true)
    try {
      await api.delete(`/turnos-fijos/${modalCancelar.turno.id}`, { Authorization: `Bearer ${token}` })
      updateTurnoFijo(modalCancelar.turno.id, { activo: false, estado: 'inactivo' })
      setModalCancelar(null)
      toast.success('Turno fijo cancelado')
    } catch (err) {
      const msg = err?.error || err?.message || 'No se pudo cancelar el turno fijo'
      setModalCancelar((prev) => ({ ...prev, errorDeuda: msg }))
    } finally {
      setCancelando(false)
    }
  }

  const handleRetirarSolicitud = async (turno) => {
    if (retirandoId) return
    setRetirandoId(turno.id)
    try {
      await api.delete(`/turnos-fijos/${turno.id}`, { Authorization: `Bearer ${token}` })
      updateTurnoFijo(turno.id, { activo: false, estado: 'inactivo' })
      toast.success('Solicitud de turno fijo retirada')
    } catch { /* fallback silencioso */ }
    finally { setRetirandoId(null) }
  }

  const handleConfirmarAusencia = async (fecha) => {
    setEnviando(true)
    try {
      if (token) {
        const updated = await api.post(
          `/turnos-fijos/${modalTurno.id}/ausencia`,
          { fecha },
          { Authorization: `Bearer ${token}` }
        )
        updateTurnoFijo(modalTurno.id, {
          diasAusentes: updated.diasAusentes,
          diasAusentesJugador: updated.diasAusentesJugador,
          ausenciasPendientes: updated.ausenciasPendientes,
        })
        const cargoAplicado = !!updated?.cargoAplicado
        const monto = updated?.monto ?? 0
        setModalTurno(null)
        toast.success(cargoAplicado
          ? `Ausencia registrada · se aplicó un cargo de $${Number(monto).toLocaleString('es-AR')}`
          : 'Ausencia registrada · el turno quedó liberado ese día')
      } else {
        registrarAusenciaPendiente(modalTurno.id, fecha)
        setModalTurno(null)
        toast.success('Ausencia registrada · el turno quedó liberado ese día')
      }
    } catch (e) {
      // El backend rechazó (ej. ya registrada, fuera de plazo): mostrar el error real, no fingir éxito.
      toast.error(e?.message || 'No se pudo registrar la ausencia')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {modalTurno && (
        <ModalAusencia
          turno={modalTurno}
          fecha={getFechaDisponible(modalTurno.dia, modalTurno.inicio)}
          horasMinimas={horasMinimas}
          onConfirmar={handleConfirmarAusencia}
          onCerrar={() => !enviando && setModalTurno(null)}
          enviando={enviando}
        />
      )}

      {modalCancelar && (
        <ModalCancelarTurno
          turno={modalCancelar.turno}
          errorDeuda={modalCancelar.errorDeuda}
          procesando={cancelando}
          proxFecha={getFechaDisponible(modalCancelar.turno.dia, modalCancelar.turno.inicio)}
          onConfirmar={handleCancelarTurnoFijo}
          onCerrar={() => !cancelando && setModalCancelar(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold">Mis turnos fijos</h1>
        <p className="text-white/40 text-sm mt-1">
          {activos.length} activo{activos.length !== 1 ? 's' : ''}
          {pendientes.length > 0 && ` · ${pendientes.length} pendiente${pendientes.length !== 1 ? 's' : ''} de aprobación`}
        </p>
      </div>

      {/* Pendientes de aprobación */}
      {pendientes.length > 0 && (
        <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-500/15 flex items-center gap-2">
            <Clock size={15} className="text-amber-400" />
            <h3 className="text-amber-300 font-semibold text-sm">Pendientes de aprobación</h3>
          </div>
          <div className="divide-y divide-white/5">
            {pendientes.map((t) => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-white text-sm font-medium">
                    {DIAS_LABEL[t.dia] ?? t.dia} · {t.inicio}–{t.fin}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{t.canchaNombre}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    Pendiente de aprobación
                  </span>
                  <button
                    onClick={() => handleRetirarSolicitud(t)}
                    disabled={retirandoId === t.id}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg text-red-400/70 border border-red-400/20 hover:bg-red-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Retirar solicitud"
                  >
                    {retirandoId === t.id ? (
                      <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : (
                      <X size={10} />
                    )}
                    Retirar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2">
          <Repeat size={16} className="text-club" />
          <h3 className="text-white font-semibold">Turnos reservados</h3>
        </div>

        {activos.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-white/25">
            <CalendarDays size={32} className="opacity-40" />
            <p className="text-sm">No tenés turnos fijos asignados.</p>
            <p className="text-xs text-white/20">Solicitá uno desde "Reservar cancha" activando la opción de turno fijo.</p>
          </div>
        ) : (
          <div>
            {Object.entries(turnosPorDia).map(([dia, turnosDia]) => (
              <div key={dia}>
                {/* Separador de día */}
                <div className="px-6 py-2.5 bg-white/3 border-b border-white/5 flex items-center gap-2.5">
                  <span className="text-white/60 text-[11px] font-black uppercase tracking-widest">{DIAS_LABEL[dia]}</span>
                  <span className="text-white/20 text-[10px]">{turnosDia.length} turno{turnosDia.length !== 1 ? 's' : ''}</span>
                </div>
                {/* Filas del día */}
                <div className="divide-y divide-white/5">
                  {turnosDia.map((turno) => {
                    const ausenciasPend = turno.ausenciasPendientes || []
                    const ausentes = turno.diasAusentes || []
                    const ausentesJugador = turno.diasAusentesJugador || []

                    const proxFecha = getFechaDisponible(turno.dia, turno.inicio)
                    const proxISO = localISO(proxFecha)
                    const esPendiente = ausenciasPend.includes(proxISO)
                    const esAusente = ausentes.includes(proxISO)
                    const esAusenteJugador = ausentesJugador.includes(proxISO)
                    const bloqueado = esPendiente || esAusente
                    const yaTermino = turnoYaTerminoHoy(turno.dia, turno.fin)

                    return (
                      <div key={turno.id} className="px-6 py-4 flex items-center gap-4">
                        <div className={`w-1.5 h-12 rounded-full shrink-0 ${esPendiente ? 'bg-amber-500/60' : esAusente ? 'bg-white/15' : 'bg-violet-500/60'}`} />

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${bloqueado ? 'text-white/40' : 'text-white'}`}>
                            {turno.canchaNombre}
                          </p>
                          <p className="text-white/40 text-xs mt-0.5">
                            {turno.inicio} a {turno.fin}
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
                              <span className="text-white/30 text-[10px]">
                                {esAusenteJugador ? 'Tu ausencia fue confirmada' : 'El club liberó tu turno este día'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`font-bold text-sm ${bloqueado ? 'text-white/20' : 'text-violet-400'}`}>
                            ${turno.precio?.toLocaleString('es-AR')}
                          </p>
                          <p className="text-white/25 text-[10px]">por turno</p>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0">
                          {yaTermino ? (
                            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border bg-white/3 border-white/8 text-white/20 cursor-default">
                              <CheckCircle size={12} />
                              Finalizado
                            </span>
                          ) : (
                            <button
                              disabled={bloqueado}
                              onClick={() => setModalTurno(turno)}
                              className={[
                                'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border',
                                bloqueado
                                  ? 'text-white/20 border-white/8 bg-white/3 cursor-not-allowed'
                                  : 'text-red-400 border-red-400/25 bg-red-400/8 hover:bg-red-400/15',
                              ].join(' ')}
                            >
                              <AlertTriangle size={12} />
                              No puedo ir
                            </button>
                          )}
                          <button
                            onClick={() => setModalCancelar({ turno, errorDeuda: null })}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all border text-white/30 border-white/10 bg-white/3 hover:text-red-400 hover:border-red-400/25 hover:bg-red-400/8"
                          >
                            <Ban size={12} />
                            Eliminar turno
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default PlayerTurnosFijosPage
