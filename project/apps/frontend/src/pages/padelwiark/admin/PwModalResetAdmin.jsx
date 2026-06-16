import { useState } from 'react'
import { X, KeyRound } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'

// Resetea la contraseña del admin de un club (tarea de soporte).
const PwModalResetAdmin = ({ club, onClose, onDone }) => {
  const token = usePlatformStore((s) => s.token)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      const { email } = await api.post(`/platform/clubs/${club.id}/reset-admin`, { password }, { Authorization: `Bearer ${token}` })
      onDone(email)
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo resetear')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="pw-root w-full max-w-sm rounded-3xl border border-white/10 bg-[#141c18] p-7">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#afca0b]/15 border border-[#afca0b]/30">
            <KeyRound size={20} className="text-[#d4ff3f]" />
          </div>
          <button type="button" onClick={onClose} className="text-[#9ba89f] hover:text-[#f4f5ef]"><X size={20} /></button>
        </div>
        <h3 className="pw-display text-lg font-semibold text-[#f4f5ef] mb-1">Resetear contraseña del admin</h3>
        <p className="text-sm text-[#9ba89f] mb-5">Club <b className="text-[#f4f5ef]">{club.nombre}</b>. Definí una contraseña nueva y pasásela al dueño.</p>

        <label className="block text-xs text-[#9ba89f] mb-1.5">Nueva contraseña</label>
        <input
          type="text" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus
          className="w-full mb-5 rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50 transition-colors"
          placeholder="contraseña nueva"
        />

        {error && <p className="text-sm text-rose-400 mb-4">{error}</p>}

        <button type="submit" disabled={submitting} className="pw-btn-lime w-full rounded-full px-5 py-3 font-semibold text-sm disabled:opacity-50">
          {submitting ? 'Guardando…' : 'Resetear contraseña'}
        </button>
      </form>
    </div>
  )
}

export default PwModalResetAdmin
