import { useState } from 'react'
import { X } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'

const PLANES = [
  { id: 'basico', label: 'Básico' },
  { id: 'pro', label: 'Pro' },
  { id: 'premium', label: 'Premium' },
]

const field = 'w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-2.5 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50 transition-colors'
const labelCls = 'block text-xs text-[#9ba89f] mb-1.5'

const PwModalCrearClub = ({ onClose, onCreated }) => {
  const token = usePlatformStore((s) => s.token)
  const [form, setForm] = useState({ clubNombre: '', slug: '', plan: 'basico', adminNombre: '', adminEmail: '', adminPassword: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await api.post('/platform/clubs', form, { Authorization: `Bearer ${token}` })
      onCreated(form.clubNombre)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo crear el club')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="pw-root w-full max-w-md rounded-3xl border border-white/10 bg-[#141c18] p-7 max-h-[90vh] overflow-y-auto no-scrollbar"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="pw-display text-xl font-semibold text-[#f4f5ef]">Nuevo club</h2>
          <button type="button" onClick={onClose} className="text-[#9ba89f] hover:text-[#f4f5ef]"><X size={20} /></button>
        </div>

        <p className="pw-mono text-[10px] uppercase tracking-wider text-[#9ba89f] mb-3">Datos del club</p>
        <div className="mb-4">
          <label className={labelCls}>Nombre del club *</label>
          <input className={field} value={form.clubNombre} onChange={set('clubNombre')} required placeholder="Club Pádel Central" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className={labelCls}>Slug (opcional)</label>
            <input className={field} value={form.slug} onChange={set('slug')} placeholder="se genera solo" />
          </div>
          <div>
            <label className={labelCls}>Plan</label>
            <select className={field} value={form.plan} onChange={set('plan')}>
              {PLANES.map((p) => <option key={p.id} value={p.id} className="bg-[#141c18]">{p.label}</option>)}
            </select>
          </div>
        </div>

        <p className="pw-mono text-[10px] uppercase tracking-wider text-[#9ba89f] mb-3">Primer administrador</p>
        <div className="mb-3">
          <label className={labelCls}>Nombre</label>
          <input className={field} value={form.adminNombre} onChange={set('adminNombre')} placeholder="Nombre del dueño del club" />
        </div>
        <div className="mb-3">
          <label className={labelCls}>Email *</label>
          <input type="email" className={field} value={form.adminEmail} onChange={set('adminEmail')} required placeholder="admin@club.com" />
        </div>
        <div className="mb-5">
          <label className={labelCls}>Contraseña *</label>
          <input type="text" className={field} value={form.adminPassword} onChange={set('adminPassword')} required placeholder="contraseña inicial" />
        </div>

        {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

        <button type="submit" disabled={submitting} className="pw-btn-lime w-full rounded-full px-5 py-3 font-semibold text-sm disabled:opacity-50">
          {submitting ? 'Creando…' : 'Crear club'}
        </button>
        <p className="text-[11px] text-[#9ba89f]/60 text-center mt-3">Arranca en prueba (14 días). Pasale el email y la contraseña al dueño del club.</p>
      </form>
    </div>
  )
}

export default PwModalCrearClub
