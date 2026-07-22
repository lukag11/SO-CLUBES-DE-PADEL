import { useState, useEffect, useCallback } from 'react'
import { Plus, LogOut, Users, LayoutGrid, Ban, CheckCircle2, Building2, X, KeyRound, Gift } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'
import { PwLogo } from '../components/PwNav'
import PwModalCrearClub from './PwModalCrearClub'
import PwConfirm from './PwConfirm'
import PwModalResetAdmin from './PwModalResetAdmin'
import PwModalRegalitos from './PwModalRegalitos'
import PwPlanesEditor from './PwPlanesEditor'
import PwSuscripciones from './PwSuscripciones'

const PLAN_BADGE = {
  basico: 'text-slate-300 bg-white/5 border-white/10',
  pro: 'text-[#d4ff3f] bg-[#afca0b]/15 border-[#afca0b]/30',
  premium: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/25',
}
const ESTADO_BADGE = {
  prueba: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  activo: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  suspendido: 'text-rose-300 bg-rose-500/10 border-rose-500/25',
}
const PLANES = ['basico', 'pro', 'premium']

const PwAdminDashboard = () => {
  const { user, token, logout } = usePlatformStore()
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('clubes') // 'clubes' | 'planes'
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(null)   // { ...props de PwConfirm }
  const [resetClub, setResetClub] = useState(null) // club al que se le resetea la clave
  const [regalitosClub, setRegalitosClub] = useState(null) // club al que se le editan features extra
  const [toast, setToast] = useState(null) // { msg, type:'ok'|'error', id }

  const auth = { Authorization: `Bearer ${token}` }

  const notify = (msg, type = 'ok') => setToast({ msg, type, id: Date.now() })
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2800)
    return () => clearTimeout(t)
  }, [toast])

  const fetchClubs = useCallback(async () => {
    setLoading(true)
    try {
      setClubs(await api.get('/platform/clubs', auth))
    } catch { setClubs([]) } finally { setLoading(false) }
  }, [token]) // eslint-disable-line

  useEffect(() => { fetchClubs() }, [fetchClubs])

  const patchClub = async (id, body, successMsg) => {
    try {
      const updated = await api.patch(`/platform/clubs/${id}`, body, auth)
      setClubs((cs) => cs.map((c) => (c.id === id ? { ...c, ...updated } : c)))
      if (successMsg) notify(successMsg)
    } catch (e) { notify(e.message, 'error') }
  }

  const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—'
  const activos = clubs.filter((c) => c.estado === 'activo').length

  return (
    <div className="pw-root min-h-screen">
      {/* Top bar */}
      <header className="border-b border-white/8 bg-[#0a0f0d]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PwLogo className="text-lg text-[#f4f5ef]" />
            <span className="pw-mono text-[10px] uppercase tracking-wider text-[#9ba89f] border-l border-white/10 pl-2.5">Plataforma</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9ba89f] hidden sm:block">{user?.email}</span>
            <button onClick={logout} className="flex items-center gap-1.5 text-sm text-[#9ba89f] hover:text-[#f4f5ef] transition-colors">
              <LogOut size={15} /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        {/* Selector de vista */}
        <div className="flex items-center gap-1 bg-white/[0.03] border border-white/8 rounded-xl p-1 w-fit mb-7">
          {[{ id: 'clubes', label: 'Clubes' }, { id: 'cobros', label: 'Cobros' }, { id: 'planes', label: 'Planes' }].map(({ id, label }) => (
            <button
              key={id} onClick={() => setView(id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === id ? 'bg-[#afca0b] text-[#0a0f0d]' : 'text-[#9ba89f] hover:text-[#f4f5ef]'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'planes' ? (
          <PwPlanesEditor notify={notify} />
        ) : view === 'cobros' ? (
          <PwSuscripciones notify={notify} />
        ) : (
        <>
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-7">
          {[
            { k: 'Clubes', v: clubs.length, icon: Building2 },
            { k: 'Activos', v: activos, icon: CheckCircle2 },
            { k: 'En prueba', v: clubs.filter((c) => c.estado === 'prueba').length, icon: Users },
          ].map(({ k, v, icon: Icon }) => (
            <div key={k} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <Icon size={18} className="text-[#afca0b] mb-2" />
              <p className="pw-display text-2xl font-bold text-[#f4f5ef] leading-none">{v}</p>
              <p className="text-xs text-[#9ba89f] mt-1">{k}</p>
            </div>
          ))}
        </div>

        {/* Header lista */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="pw-display text-xl font-semibold text-[#f4f5ef]">Clubes</h1>
          <button onClick={() => setModal(true)} className="pw-btn-lime flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold">
            <Plus size={16} /> Crear club
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="p-10 flex items-center justify-center gap-3 text-[#9ba89f]">
            <div className="w-4 h-4 rounded-full border-2 border-[#afca0b]/40 border-t-[#afca0b] animate-spin" /> Cargando…
          </div>
        ) : clubs.length === 0 ? (
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-10 text-center text-[#9ba89f] text-sm">
            Todavía no hay clubes. Tocá “Crear club” para empezar.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clubs.map((c) => (
              <div key={c.id} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Identidad */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="pw-display font-semibold text-[#f4f5ef] truncate">{c.nombre}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${PLAN_BADGE[c.plan] || PLAN_BADGE.basico}`}>{c.plan}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${ESTADO_BADGE[c.estado] || ESTADO_BADGE.prueba}`}>{c.estado}</span>
                  </div>
                  <p className="pw-mono text-[11px] text-[#9ba89f]">/{c.slug} · creado {fmtFecha(c.createdAt)}{c.estado === 'prueba' && c.trialHasta ? ` · prueba hasta ${fmtFecha(c.trialHasta)}` : ''}</p>
                </div>

                {/* Conteos */}
                <div className="flex items-center gap-4 text-xs text-[#9ba89f] shrink-0">
                  <span className="flex items-center gap-1.5"><Users size={14} /> {c._count?.jugadores ?? 0}</span>
                  <span className="flex items-center gap-1.5"><LayoutGrid size={14} /> {c._count?.canchas ?? 0}</span>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={c.plan} onChange={(e) => patchClub(c.id, { plan: e.target.value }, `Plan actualizado a ${e.target.value}`)}
                    className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2 text-xs text-[#f4f5ef] outline-none focus:border-[#afca0b]/50"
                  >
                    {PLANES.map((p) => <option key={p} value={p} className="bg-[#141c18]">{p}</option>)}
                  </select>
                  <button
                    onClick={() => setRegalitosClub(c)}
                    title="Features extra (regalitos)"
                    className="flex items-center justify-center rounded-lg border border-white/12 text-[#9ba89f] hover:text-[#d4ff3f] hover:border-[#afca0b]/40 px-2.5 py-2 transition-colors"
                  >
                    <Gift size={14} />
                  </button>
                  <button
                    onClick={() => setResetClub(c)}
                    title="Resetear contraseña del admin"
                    className="flex items-center justify-center rounded-lg border border-white/12 text-[#9ba89f] hover:text-[#f4f5ef] hover:border-white/25 px-2.5 py-2 transition-colors"
                  >
                    <KeyRound size={14} />
                  </button>
                  {c.estado === 'suspendido' ? (
                    <button onClick={() => patchClub(c.id, { estado: 'activo' }, 'Club reactivado')} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 px-3 py-2 text-xs font-medium transition-colors">
                      <CheckCircle2 size={14} /> Reactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirm({
                        title: 'Suspender club',
                        msg: `Vas a cortar el acceso de "${c.nombre}". Sus usuarios no van a poder entrar hasta que lo reactives.`,
                        confirmLabel: 'Suspender',
                        danger: true,
                        onConfirm: () => patchClub(c.id, { estado: 'suspendido' }, 'Club suspendido'),
                      })}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 px-3 py-2 text-xs font-medium transition-colors"
                    >
                      <Ban size={14} /> Suspender
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        )}
      </main>

      {modal && (
        <PwModalCrearClub
          onClose={() => setModal(false)}
          onCreated={(nombre) => { fetchClubs(); notify(`Club "${nombre}" creado`) }}
        />
      )}

      {confirm && <PwConfirm {...confirm} onClose={() => setConfirm(null)} />}

      {resetClub && (
        <PwModalResetAdmin
          club={resetClub}
          onClose={() => setResetClub(null)}
          onDone={(email) => notify(`Contraseña reseteada (${email})`)}
        />
      )}

      {regalitosClub && (
        <PwModalRegalitos
          club={regalitosClub}
          onClose={() => setRegalitosClub(null)}
          onDone={(updated) => { setClubs((cs) => cs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))); notify('Features actualizadas') }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          key={toast.id}
          className="pw-fade-up fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-full border px-5 py-3 shadow-2xl backdrop-blur-xl"
          style={{
            background: toast.type === 'error' ? 'rgba(40,15,18,0.9)' : 'rgba(20,28,24,0.9)',
            borderColor: toast.type === 'error' ? 'rgba(244,63,94,0.4)' : 'rgba(175,202,11,0.4)',
          }}
        >
          {toast.type === 'error'
            ? <X size={16} className="text-rose-400" />
            : <CheckCircle2 size={16} className="text-[#d4ff3f]" />}
          <span className="text-sm text-[#f4f5ef]">{toast.msg}</span>
        </div>
      )}
    </div>
  )
}

export default PwAdminDashboard
