import { useState, useEffect } from 'react'
import { Save, Lock, Check } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'

const PLAN_LABEL = { basico: 'Básico', pro: 'Pro', premium: 'Premium' }

const PwPlanesEditor = ({ notify }) => {
  const token = usePlatformStore((s) => s.token)
  const auth = { Authorization: `Bearer ${token}` }
  const [data, setData] = useState(null) // { features, planes, matriz }
  const [matriz, setMatrizState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/platform/planes', auth)
      .then((d) => { setData(d); setMatrizState(d.matriz) })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const has = (plan, fid) => matriz?.[plan]?.includes(fid)
  const toggle = (plan, fid) => {
    setMatrizState((m) => {
      const set = new Set(m[plan])
      set.has(fid) ? set.delete(fid) : set.add(fid)
      return { ...m, [plan]: [...set] }
    })
  }

  const guardar = async () => {
    if (saving) return
    setSaving(true)
    try {
      await api.patch('/platform/planes', { matriz }, auth)
      notify?.('Planes actualizados')
    } catch (e) { notify?.(e.message, 'error') } finally { setSaving(false) }
  }

  if (loading) return <div className="p-10 text-center text-[#9ba89f] text-sm">Cargando planes…</div>
  if (!data) return <div className="p-10 text-center text-[#9ba89f] text-sm">No se pudieron cargar los planes.</div>

  return (
    <div>
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h2 className="pw-display text-xl font-semibold text-[#f4f5ef]">Planes y features</h2>
          <p className="text-sm text-[#9ba89f] mt-1">Definí qué módulo entra en cada plan. Aplica a todos los clubes de ese plan.</p>
        </div>
        <button onClick={guardar} disabled={saving} className="pw-btn-lime flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
          <Save size={16} /> {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
        {/* Encabezado */}
        <div className="grid grid-cols-[1fr_repeat(3,90px)] sm:grid-cols-[1fr_repeat(3,120px)] items-center px-4 py-3 border-b border-white/8 bg-white/[0.02]">
          <span className="pw-mono text-[10px] uppercase tracking-wider text-[#9ba89f]">Módulo</span>
          {data.planes.map((p) => (
            <span key={p} className="pw-display text-sm font-semibold text-[#f4f5ef] text-center">{PLAN_LABEL[p] || p}</span>
          ))}
        </div>

        {/* Filas */}
        {data.features.map((f) => (
          <div key={f.id} className="grid grid-cols-[1fr_repeat(3,90px)] sm:grid-cols-[1fr_repeat(3,120px)] items-center px-4 py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-[#f4f5ef] truncate">{f.label}</span>
              {f.core && <span className="pw-mono text-[9px] uppercase text-[#9ba89f] border border-white/10 rounded px-1">core</span>}
            </div>
            {data.planes.map((p) => {
              const on = f.core || has(p, f.id)
              return (
                <div key={p} className="flex justify-center">
                  <button
                    onClick={() => !f.core && toggle(p, f.id)}
                    disabled={f.core}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                      on
                        ? 'bg-[#afca0b]/20 border-[#afca0b]/40 text-[#d4ff3f]'
                        : 'bg-white/[0.03] border-white/10 text-transparent hover:border-white/25'
                    } ${f.core ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    title={f.core ? 'Siempre incluido' : ''}
                  >
                    {f.core ? <Lock size={11} /> : on ? <Check size={14} /> : null}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#9ba89f]/60 mt-3">Las features <b>core</b> están siempre activas en todos los planes. Durante la prueba, los clubes ven el plan Premium completo.</p>
    </div>
  )
}

export default PwPlanesEditor
