import { useState, useEffect } from 'react'
import { Megaphone, Repeat, Users, CalendarDays, Clock, ChevronDown, X, Check, Crown, Loader2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

const ESTADO_CHIP = {
  abierta:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  confirmada: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelada:  'bg-red-50 text-red-600 border-red-100',
  jugada:     'bg-slate-100 text-slate-500 border-slate-200',
}

export default function ConvocatoriasAdminPage() {
  const token = useAuthStore((s) => s.token)
  const [lista, setLista] = useState(null)
  const [abierta, setAbierta] = useState(null) // id expandido
  const [detalle, setDetalle] = useState(null)
  const [cargandoDet, setCargandoDet] = useState(false)
  const [accionando, setAccionando] = useState(false)

  const cargar = () => {
    api.get('/convocatorias', { Authorization: `Bearer ${token}` })
      .then((r) => setLista(Array.isArray(r) ? r : []))
      .catch(() => setLista([]))
  }
  useEffect(() => { if (token) cargar() }, [token])

  const toggle = (id) => {
    if (abierta === id) { setAbierta(null); setDetalle(null); return }
    setAbierta(id); setDetalle(null); setCargandoDet(true)
    api.get(`/convocatorias/${id}`, { Authorization: `Bearer ${token}` })
      .then((r) => setDetalle(r))
      .catch(() => setDetalle(null))
      .finally(() => setCargandoDet(false))
  }

  const cancelar = (id) => {
    if (accionando) return
    if (!confirm('¿Cancelar la convocatoria? Se liberan las canchas reservadas del evento.')) return
    setAccionando(true)
    api.patch(`/convocatorias/${id}/estado`, { estado: 'cancelada' }, { Authorization: `Bearer ${token}` })
      .then(() => { cargar(); setAbierta(null); setDetalle(null) })
      .catch(() => alert('No se pudo cancelar'))
      .finally(() => setAccionando(false))
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Megaphone size={22} className="text-brand-600" /> Americano y Super 8</h1>
        <p className="text-slate-400 text-sm mt-1">Eventos organizados en el club. Las canchas quedan reservadas a nombre del organizador.</p>
      </div>

      <div className="rounded-xl bg-brand-50/60 border border-brand-200 px-4 py-3 text-sm text-slate-600">
        💡 Para crear una convocatoria, pedísela a <span className="font-semibold text-brand-700">WIarky</span>: <span className="italic">"Convocá un Super 8 a nombre de Juan Pérez el martes a las 21, 8 cupos, 2 canchas, 6ta"</span>.
      </div>

      {lista === null ? (
        <p className="text-slate-400 text-sm">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <Megaphone size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-slate-500 text-sm">Todavía no hay convocatorias. Pedile una a WIarky.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {lista.map((c) => {
            const esAme = c.modalidad !== 'super8'
            const exp = abierta === c.id
            return (
              <div key={c.id} className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
                <button onClick={() => toggle(c.id)} className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50/60 transition-colors">
                  <span className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
                    {esAme ? <Repeat size={18} className="text-brand-600" /> : <Users size={18} className="text-brand-600" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{esAme ? 'Americano' : 'Super 8'}{c.categorias?.length ? ` · ${c.categorias.join('/')}` : ''}</p>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 capitalize">
                      <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmtFecha(c.fecha)}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {c.horaInicio}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-700 tabular-nums">{c.voy}/{c.cupoMax}</p>
                    {c.espera > 0 && <p className="text-[10px] text-amber-500">+{c.espera} espera</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 capitalize ${ESTADO_CHIP[c.estado] || ESTADO_CHIP.jugada}`}>{c.estado}</span>
                  <ChevronDown size={16} className={`text-slate-300 shrink-0 transition-transform ${exp ? 'rotate-180' : ''}`} />
                </button>

                {exp && (
                  <div className="px-4 pb-4 border-t border-slate-50">
                    {cargandoDet ? (
                      <p className="text-xs text-slate-400 py-3 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Cargando anotados…</p>
                    ) : detalle ? (
                      <>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 mb-2">Anotados ({detalle.voy}{detalle.espera ? ` · ${detalle.espera} en espera` : ''})</p>
                        {detalle.cupos?.filter((x) => x.estado !== 'baja').length ? (
                          <div className="flex flex-col divide-y divide-slate-50">
                            {detalle.cupos.filter((x) => x.estado !== 'baja').map((cu, i) => (
                              <div key={cu.id} className="flex items-center gap-2 py-1.5">
                                <span className="w-5 text-center text-xs font-bold text-slate-300 tabular-nums">{i + 1}</span>
                                <span className="flex-1 text-sm text-slate-700 truncate">
                                  {cu.jugador ? `${cu.jugador.nombre} ${cu.jugador.apellido}` : (cu.nombre || 'Jugador')}
                                  {cu.posicion && <span className="text-[11px] text-slate-400 ml-1.5">· {cu.posicion}</span>}
                                </span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cu.estado === 'voy' ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-600'}`}>
                                  {cu.estado === 'voy' ? 'Anotado' : 'Espera'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 py-1">Nadie se anotó todavía.</p>
                        )}

                        {c.estado === 'abierta' && (
                          <button onClick={() => cancelar(c.id)} disabled={accionando}
                            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 transition-colors disabled:opacity-50">
                            <X size={14} /> Cancelar convocatoria (libera las canchas)
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 py-3">No se pudo cargar el detalle.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
