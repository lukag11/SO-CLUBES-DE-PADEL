import { useState, useEffect } from 'react'
import { X, Gift, Check } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'

// "Regalitos": habilitar features extra a un club puntual, fuera de su plan.
const PwModalRegalitos = ({ club, onClose, onDone }) => {
  const token = usePlatformStore((s) => s.token)
  const auth = { Authorization: `Bearer ${token}` }
  const [cat, setCat] = useState(null) // { features, matriz }
  const [extra, setExtra] = useState(new Set(club.featuresExtra || []))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/platform/planes', auth)
      .then(setCat).catch(() => setCat(null)).finally(() => setLoading(false))
  }, []) // eslint-disable-line

  const planFeatures = cat?.matriz?.[club.plan] || []
  const toggle = (id) => setExtra((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const guardar = async () => {
    if (saving) return
    setSaving(true); setError('')
    try {
      const updated = await api.patch(`/platform/clubs/${club.id}`, { featuresExtra: [...extra] }, auth)
      onDone(updated)
      onClose()
    } catch (e) { setError(e.message || 'No se pudo guardar') } finally { setSaving(false) }
  }

  // Solo features no-core (las core ya están en todos los planes)
  const opciones = (cat?.features || []).filter((f) => !f.core)

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pw-root w-full max-w-md rounded-3xl border border-white/10 bg-[#141c18] p-7 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#afca0b]/15 border border-[#afca0b]/30">
            <Gift size={20} className="text-[#d4ff3f]" />
          </div>
          <button type="button" onClick={onClose} className="text-[#9ba89f] hover:text-[#f4f5ef]"><X size={20} /></button>
        </div>
        <h3 className="pw-display text-lg font-semibold text-[#f4f5ef] mb-1">Features extra</h3>
        <p className="text-sm text-[#9ba89f] mb-5">Club <b className="text-[#f4f5ef]">{club.nombre}</b> · plan {club.plan}. Habilitá módulos sueltos fuera de su plan.</p>

        {loading ? (
          <p className="text-sm text-[#9ba89f] py-6 text-center">Cargando…</p>
        ) : (
          <div className="flex flex-col gap-2 mb-5">
            {opciones.map((f) => {
              const enPlan = planFeatures.includes(f.id)
              const on = enPlan || extra.has(f.id)
              return (
                <button
                  key={f.id}
                  onClick={() => !enPlan && toggle(f.id)}
                  disabled={enPlan}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                    enPlan ? 'border-white/8 bg-white/[0.02] opacity-60 cursor-not-allowed'
                    : on ? 'border-[#afca0b]/40 bg-[#afca0b]/10 cursor-pointer'
                    : 'border-white/10 bg-white/[0.02] hover:border-white/25 cursor-pointer'
                  }`}
                >
                  <span className="text-sm text-[#f4f5ef]">{f.label}</span>
                  {enPlan ? (
                    <span className="pw-mono text-[10px] uppercase text-[#9ba89f]">en el plan</span>
                  ) : (
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? 'bg-[#afca0b]/20 border-[#afca0b]/40 text-[#d4ff3f]' : 'border-white/15 text-transparent'}`}>
                      <Check size={13} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

        <button onClick={guardar} disabled={saving || loading} className="pw-btn-lime w-full rounded-full px-5 py-3 font-semibold text-sm disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

export default PwModalRegalitos
