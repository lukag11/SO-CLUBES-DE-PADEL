import { useEffect } from 'react'
import { Bell, CheckCircle, Repeat, CalendarDays, BellOff, UserCheck } from 'lucide-react'
import usePlayerNotificationsStore from '../store/playerNotificationsStore'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

const fmtTimestamp = (iso) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const TIPO_META = {
  reserva_confirmada: {
    icon: CalendarDays,
    color: 'text-[#afca0b]',
    bg: 'bg-[#afca0b]/10',
    border: 'border-[#afca0b]/20',
  },
  solicitud_enviada: {
    icon: Bell,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  turno_fijo_aprobado: {
    icon: Repeat,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
  ausencia_confirmada: {
    icon: UserCheck,
    color: 'text-sky-400',
    bg: 'bg-sky-400/10',
    border: 'border-sky-400/20',
  },
}

const PlayerNotificacionesPage = () => {
  const { notificaciones, marcarTodasLeidas } = usePlayerNotificationsStore()

  // Marcar todas como leídas al entrar
  useEffect(() => {
    marcarTodasLeidas()
  }, [marcarTodasLeidas])

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Notificaciones</h1>
          <p className="text-white/40 text-sm mt-1">
            {notificaciones.length === 0
              ? 'Sin notificaciones'
              : `${notificaciones.length} notificación${notificaciones.length !== 1 ? 'es' : ''}`}
          </p>
        </div>
        {noLeidas > 0 && (
          <span className="bg-red-500/15 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full border border-red-500/20">
            {noLeidas} sin leer
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/8 flex items-center gap-2">
          <Bell size={16} className="text-[#afca0b]" />
          <h3 className="text-white font-semibold">Todas las notificaciones</h3>
        </div>

        {notificaciones.length === 0 ? (
          <div className="px-6 py-16 flex flex-col items-center gap-3 text-white/25">
            <BellOff size={32} className="opacity-40" />
            <p className="text-sm">No tenés notificaciones todavía.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notificaciones.map((notif) => {
              const meta = TIPO_META[notif.tipo] ?? {
                icon: Bell,
                color: 'text-white/50',
                bg: 'bg-white/5',
                border: 'border-white/10',
              }
              const Icon = meta.icon

              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-6 py-4 transition-colors ${
                    notif.leida ? '' : 'bg-white/2'
                  }`}
                >
                  {/* Icono tipo */}
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} border ${meta.border} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon size={16} className={meta.color} />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold ${notif.leida ? 'text-white/60' : 'text-white'}`}>
                        {notif.titulo}
                      </p>
                      {!notif.leida && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{notif.cuerpo}</p>
                    <p className="text-white/20 text-[10px] mt-1.5">{fmtTimestamp(notif.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer info */}
      {notificaciones.length > 0 && (
        <p className="text-white/20 text-xs text-center flex items-center justify-center gap-1.5">
          <CheckCircle size={12} />
          Todas las notificaciones marcadas como leídas al abrir esta página
        </p>
      )}
    </div>
  )
}

export default PlayerNotificacionesPage
