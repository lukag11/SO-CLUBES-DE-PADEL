import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Star, Upload, ImageOff, Sparkles } from 'lucide-react'
import { api, uploadImage, fileToDataUrl } from '../lib/api'
import useAuthStore from '../store/authStore'
import { useToast } from '../components/ui/ToastProvider'

const blobToBase64 = (blob) =>
  new Promise((res) => {
    const r = new FileReader()
    r.onload = (e) => res(e.target.result)
    r.readAsDataURL(blob)
  })

const LogoPicker = ({ value, onChange, token }) => {
  const toast = useToast()
  const refBg  = useRef(null) // con eliminación de fondo
  const refRaw = useRef(null) // tal cual
  const [processing, setProcessing] = useState(false)
  const [bgRemoved, setBgRemoved]   = useState(false)

  const handleFile = async (e, removeBg) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setBgRemoved(false)
    setProcessing(true)

    try {
      let dataUrl
      if (removeBg) {
        const previewUrl = URL.createObjectURL(file)
        try {
          const { removeBackground } = await import('@imgly/background-removal')
          const blob = await removeBackground(previewUrl)
          dataUrl = await blobToBase64(blob)
          setBgRemoved(true)
        } catch {
          dataUrl = await fileToDataUrl(file)
        } finally {
          URL.revokeObjectURL(previewUrl)
        }
      } else {
        dataUrl = await fileToDataUrl(file)
      }
      // Sube a Storage → guarda la URL pública (no base64 en la DB)
      const url = await uploadImage(dataUrl, { profile: 'logo', folder: 'sponsors', token })
      onChange(url)
    } catch (err) {
      console.error('Error al subir logo:', err)
      toast.error('No se pudo subir el logo. Probá de nuevo.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Preview */}
      <div className="w-16 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden relative"
        style={{ background: 'repeating-conic-gradient(#e2e8f0 0% 25%, white 0% 50%) 0 0 / 10px 10px' }}
      >
        {processing ? (
          <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-1">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : value ? (
          <img src={value} alt="" className="max-h-10 max-w-[56px] object-contain" />
        ) : (
          <ImageOff size={16} className="text-slate-300" />
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <div className="relative group">
            <button
              type="button"
              disabled={processing}
              onClick={() => refBg.current.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 border border-brand-200 bg-brand-50 hover:bg-brand-100 disabled:opacity-50 px-3 py-2 rounded-xl transition-all"
            >
              <Sparkles size={12} />
              {processing ? 'Procesando…' : 'Quitar fondo'}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                IA elimina el fondo automáticamente
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            </div>
          </div>
          <div className="relative group">
            <button
              type="button"
              disabled={processing}
              onClick={() => refRaw.current.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 px-3 py-2 rounded-xl transition-all"
            >
              <Upload size={12} />
              Tal cual
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-slate-800 text-white text-[10px] rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                Sube la imagen sin modificar
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            </div>
          </div>
        </div>

        {bgRemoved && !processing && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
            <Sparkles size={10} /> Fondo eliminado automáticamente
          </span>
        )}

        {value && !processing && (
          <button
            type="button"
            onClick={() => { onChange(''); setBgRemoved(false) }}
            className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors text-left"
          >
            Quitar
          </button>
        )}
      </div>

      <input ref={refBg}  type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, true)}  />
      <input ref={refRaw} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, false)} />
    </div>
  )
}

const AdminSponsorsPage = () => {
  const token = useAuthStore((s) => s.token)
  const auth  = { Authorization: `Bearer ${token}` }

  const [sponsors, setSponsors]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [form, setForm]             = useState({ nombre: '', logoUrl: '' })
  const [deletingId, setDeletingId] = useState(null)

  const fetchSponsors = async () => {
    try {
      const data = await api.get('/sponsors', auth)
      setSponsors(Array.isArray(data) ? data : [])
    } catch {
      setError('No se pudieron cargar los sponsors.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSponsors() }, [])

  const handleAdd = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    setError(null)
    try {
      const created = await api.post('/sponsors', {
        nombre:  form.nombre.trim(),
        logoUrl: form.logoUrl || '',
      }, auth)
      setSponsors((prev) => [...prev, created])
      setForm({ nombre: '', logoUrl: '' })
    } catch {
      setError('Error al agregar sponsor.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await api.delete(`/sponsors/${id}`, auth)
      setSponsors((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Error al eliminar sponsor.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
          <Star size={18} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sponsors</h1>
          <p className="text-xs text-slate-400 mt-0.5">Biblioteca de sponsors del club. Seleccionarlos desde cada torneo.</p>
        </div>
      </div>

      {/* Formulario agregar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6 shadow-sm">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Agregar sponsor</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nombre del sponsor</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Ej: Claro, Personal, YPF…"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-2">Logo</label>
            <LogoPicker value={form.logoUrl} onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))} token={token} />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={handleAdd}
            disabled={saving || !form.nombre.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-all self-start"
          >
            <Plus size={15} />
            {saving ? 'Guardando…' : 'Agregar sponsor'}
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Biblioteca ({sponsors.length})
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : sponsors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <ImageOff size={32} className="text-slate-200" />
            <p className="text-slate-400 text-sm">No hay sponsors todavía.</p>
            <p className="text-slate-300 text-xs">Agregá el primero usando el formulario de arriba.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sponsors.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-14 h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {s.logoUrl ? (
                    <img src={s.logoUrl} alt={s.nombre} className="max-h-8 max-w-[52px] object-contain" />
                  ) : (
                    <ImageOff size={14} className="text-slate-300" />
                  )}
                </div>
                <p className="flex-1 text-sm font-medium text-slate-700 truncate">{s.nombre}</p>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminSponsorsPage
