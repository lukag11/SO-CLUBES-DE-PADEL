import { useState, useEffect, useCallback } from 'react'
import { UserCog, Plus, X, Trash2, KeyRound, Pencil, ShieldCheck, Check, CheckCircle } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { api } from '../lib/api'
import { useToast } from '../components/ui/ToastProvider'
import useFieldHint from '../hooks/useFieldHint'

const field = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-400 transition-colors'
const labelCls = 'block text-xs font-medium text-slate-500 mb-1.5'

// Validaciones en tiempo real (ver skill form-validation.md)
const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())
const passwordChecks = (v) => ({ length: v.length >= 8, upper: /[A-Z]/.test(v), number: /[0-9]/.test(v) })

const validators = {
  nombre: (v) => {
    const t = String(v).trim()
    if (!t) return 'El nombre es requerido'
    if (t.length < 2) return 'Mínimo 2 caracteres'
    if (/\d/.test(v)) return 'El nombre no puede contener números'
    return ''
  },
  email: (v) => {
    if (!String(v).trim()) return 'El email es requerido'
    if (!emailValido(v)) return 'Ingresá un email válido'
    return ''
  },
  password: (v) => {
    if (!v) return 'La contraseña es requerida'
    if (v.length < 8) return 'Mínimo 8 caracteres'
    return ''
  },
}

// ── Modal crear / editar empleado ──────────────────────────────────────────────
const ModalEmpleado = ({ empleado, permisosCatalogo, token, onClose, onSaved }) => {
  const toast = useToast()
  const esEdicion = !!empleado
  const [form, setForm] = useState({
    nombre: empleado?.nombre || '',
    email: empleado?.email || '',
    password: '',
  })
  const [permisos, setPermisos] = useState(new Set(empleado?.permisos || []))
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [nombreHint, showNombreHint] = useFieldHint()
  const auth = { Authorization: `Bearer ${token}` }

  const checks = passwordChecks(form.password)
  const strength = Number(checks.length) + Number(checks.upper) + Number(checks.number)

  // Valida un campo en vivo y actualiza su error
  const validarCampo = (name, value) => setErrors((er) => ({ ...er, [name]: validators[name]?.(value, { ...form, [name]: value }) || '' }))

  // Nombre: bloquea números en el acto + hint ámbar + valida en vivo
  const onNombre = (e) => {
    const raw = e.target.value
    const filtrado = raw.replace(/[0-9]/g, '')
    if (raw !== filtrado) showNombreHint('El nombre no puede contener números')
    setForm((f) => ({ ...f, nombre: filtrado }))
    validarCampo('nombre', filtrado)
  }
  const onEmail = (e) => { const v = e.target.value; setForm((f) => ({ ...f, email: v })); validarCampo('email', v) }
  const onPassword = (e) => { const v = e.target.value; setForm((f) => ({ ...f, password: v })); validarCampo('password', v) }
  const togglePermiso = (id) => setPermisos((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const validarTodo = () => {
    const e = { nombre: validators.nombre(form.nombre) }
    if (!esEdicion) { e.email = validators.email(form.email); e.password = validators.password(form.password) }
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v))
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (saving) return
    const errs = validarTodo()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setError(''); setSaving(true)
    try {
      if (esEdicion) {
        const upd = await api.patch(`/empleados/${empleado.id}`, { nombre: form.nombre, permisos: [...permisos] }, auth)
        onSaved(upd); toast.success('Empleado actualizado')
      } else {
        const nuevo = await api.post('/empleados', { ...form, permisos: [...permisos] }, auth)
        onSaved(nuevo); toast.success(`Empleado "${nuevo.nombre}" creado`)
      }
      onClose()
    } catch (err) { setError(err.message || 'No se pudo guardar') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">{esEdicion ? 'Editar empleado' : 'Nuevo empleado'}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>

        <div className="mb-3">
          <label className={labelCls}>Nombre</label>
          <input className={`${field} ${errors.nombre ? 'border-red-400' : ''}`} value={form.nombre} onChange={onNombre} onBlur={() => validarCampo('nombre', form.nombre)} placeholder="Nombre del empleado" />
          {nombreHint && <p className="text-amber-500 text-xs mt-1 animate-pulse">{nombreHint}</p>}
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
        </div>
        <div className="mb-3">
          <label className={labelCls}>Email {esEdicion && <span className="text-slate-300">(no se puede cambiar)</span>}</label>
          <input type="email" className={`${field} ${esEdicion ? 'opacity-50 cursor-not-allowed' : ''} ${errors.email ? 'border-red-400' : ''}`} value={form.email} onChange={onEmail} onBlur={() => !esEdicion && validarCampo('email', form.email)} disabled={esEdicion} placeholder="empleado@email.com" />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>
        {!esEdicion && (
          <div className="mb-4">
            <label className={labelCls}>Contraseña</label>
            <input type="text" className={`${field} ${errors.password ? 'border-red-400' : ''}`} value={form.password} onChange={onPassword} placeholder="mínimo 8 caracteres" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1.5 mb-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < strength ? (strength === 1 ? 'bg-red-400' : strength === 2 ? 'bg-amber-400' : 'bg-brand-500') : 'bg-slate-200'}`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {[{ ok: checks.length, t: '8+ caracteres' }, { ok: checks.upper, t: 'Una mayúscula' }, { ok: checks.number, t: 'Un número' }].map(({ ok, t }) => (
                    <span key={t} className={`flex items-center gap-1 text-[11px] ${ok ? 'text-brand-600' : 'text-slate-400'}`}><CheckCircle size={10} /> {t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand-500" /> Qué puede manejar</p>
          <div className="flex flex-col gap-1.5">
            {permisosCatalogo.map((p) => {
              const on = permisos.has(p.id)
              return (
                <button key={p.id} type="button" onClick={() => togglePermiso(p.id)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-colors ${on ? 'border-brand-300 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <span className={`text-sm ${on ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{p.label}</span>
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${on ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 text-transparent'}`}><Check size={13} /></span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">El diseño del club, esta sección y los planes son solo tuyos — no se delegan.</p>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <button type="submit" disabled={saving} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-xl py-3 transition-colors disabled:opacity-50">
          {saving ? 'Guardando…' : esEdicion ? 'Guardar cambios' : 'Crear empleado'}
        </button>
      </form>
    </div>
  )
}

// ── Mini-modal resetear contraseña ─────────────────────────────────────────────
const ModalReset = ({ empleado, token, onClose }) => {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError(''); setSaving(true)
    try {
      await api.post(`/empleados/${empleado.id}/reset-password`, { password }, { Authorization: `Bearer ${token}` })
      toast.success('Contraseña actualizada'); onClose()
    } catch (err) { setError(err.message || 'No se pudo resetear') } finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h3 className="text-base font-bold text-slate-800 mb-1">Resetear contraseña</h3>
        <p className="text-sm text-slate-500 mb-4">Nueva clave para <b className="text-slate-700">{empleado.nombre}</b>. Pasásela al empleado.</p>
        <input type="text" className={field} value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus placeholder="nueva contraseña" />
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50">Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50">Resetear</button>
        </div>
      </form>
    </div>
  )
}

const EquipoAdminPage = () => {
  const token = useAuthStore((s) => s.token)
  const auth = { Authorization: `Bearer ${token}` }
  const toast = useToast()
  const [empleados, setEmpleados] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)       // null | 'nuevo' | empleado(editar)
  const [resetEmp, setResetEmp] = useState(null)
  const [borrar, setBorrar] = useState(null)

  const labelDe = (id) => catalogo.find((c) => c.id === id)?.label || id

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [emps, cat] = await Promise.all([api.get('/empleados', auth), api.get('/empleados/permisos', auth)])
      setEmpleados(emps); setCatalogo(cat)
    } catch { /* noop */ } finally { setLoading(false) }
  }, [token]) // eslint-disable-line

  useEffect(() => { fetchData() }, [fetchData])

  const onSaved = (emp) => setEmpleados((list) => {
    const existe = list.some((e) => e.id === emp.id)
    return existe ? list.map((e) => (e.id === emp.id ? emp : e)) : [...list, emp]
  })

  const eliminar = async () => {
    try {
      await api.delete(`/empleados/${borrar.id}`, auth)
      setEmpleados((l) => l.filter((e) => e.id !== borrar.id))
      toast.success('Empleado eliminado')
    } catch (e) { toast.error(e.message) } finally { setBorrar(null) }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-1.5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><UserCog size={24} className="text-brand-500" /> Equipo</h1>
          <p className="text-slate-400 text-sm mt-0.5">Creá usuarios para tus empleados y elegí qué puede manejar cada uno.</p>
        </div>
        <button onClick={() => setModal('nuevo')} className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors shrink-0">
          <Plus size={16} /> Crear empleado
        </button>
      </div>

      <div className="bg-brand-50 border border-brand-200/60 rounded-xl px-4 py-3 my-4 text-sm text-slate-600">
        Los empleados entran por el mismo login con su email y contraseña. Solo ven los módulos que les habilites — <b>nunca</b> tu diseño, esta sección ni tus planes.
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-sm">Cargando equipo…</div>
      ) : empleados.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <UserCog size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Todavía no tenés empleados. Tocá “Crear empleado” para sumar al primero.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {empleados.map((e) => (
            <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{e.nombre}</p>
                <p className="text-slate-400 text-xs">{e.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(e.permisos || []).length === 0
                    ? <span className="text-[11px] text-slate-400 italic">Sin módulos asignados</span>
                    : e.permisos.map((p) => <span key={p} className="text-[11px] font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md">{labelDe(p)}</span>)}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setModal(e)} title="Editar permisos" className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-medium transition-colors"><Pencil size={13} /> Editar</button>
                <button onClick={() => setResetEmp(e)} title="Resetear contraseña" className="flex items-center justify-center border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 p-2 rounded-lg transition-colors"><KeyRound size={14} /></button>
                <button onClick={() => setBorrar(e)} title="Eliminar" className="flex items-center justify-center border border-red-200 text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ModalEmpleado
          empleado={modal === 'nuevo' ? null : modal}
          permisosCatalogo={catalogo}
          token={token}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
      {resetEmp && <ModalReset empleado={resetEmp} token={token} onClose={() => setResetEmp(null)} />}
      {borrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setBorrar(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <Trash2 size={28} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">Eliminar empleado</h3>
            <p className="text-sm text-slate-500 mb-5">Vas a eliminar a <b className="text-slate-700">{borrar.nombre}</b>. No va a poder entrar más.</p>
            <div className="flex gap-3">
              <button onClick={() => setBorrar(null)} className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={eliminar} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EquipoAdminPage
