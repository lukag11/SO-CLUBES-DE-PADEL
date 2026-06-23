import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api'
import useFieldHint from '../../hooks/useFieldHint'

// ─── Modal de búsqueda avanzada (lista completa + filtros) ────────────────────
const ModalBusquedaJugadores = ({ onSelect, onClose, adminToken }) => {
  const [todos, setTodos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroApellido, setFiltroApellido] = useState('')
  const [filtroCuenta, setFiltroCuenta] = useState('todos') // 'todos' | 'con' | 'sin'
  const inputRef = useRef(null)

  useEffect(() => {
    const authH = adminToken ? { Authorization: `Bearer ${adminToken}` } : {}
    api.get('/jugadores', authH)
      .then((res) => setTodos(Array.isArray(res) ? res : []))
      .catch(() => setTodos([]))
      .finally(() => { setCargando(false); setTimeout(() => inputRef.current?.focus(), 50) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const filtrados = todos.filter((j) => {
    const matchNombre = j.nombre?.toLowerCase().includes(filtroNombre.toLowerCase().trim())
    const matchApellido = j.apellido?.toLowerCase().includes(filtroApellido.toLowerCase().trim())
    const matchCuenta = filtroCuenta === 'todos' ? true : filtroCuenta === 'con' ? j.cuentaActiva : !j.cuentaActiva
    return matchNombre && matchApellido && matchCuenta
  })

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '82vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Buscar jugador</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
        </div>

        <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input ref={inputRef} type="text" placeholder="Nombre..." value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300" />
            <input type="text" placeholder="Apellido..." value={filtroApellido} onChange={(e) => setFiltroApellido(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300" />
          </div>
          <div className="flex gap-1.5">
            {[['todos', 'Todos'], ['con', 'Con cuenta'], ['sin', 'Sin cuenta']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setFiltroCuenta(val)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-all ${filtroCuenta === val ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-slate-400 self-center">{filtrados.length} jugador{filtrados.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {cargando && (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Cargando jugadores...</span>
            </div>
          )}
          {!cargando && filtrados.length === 0 && <p className="text-center text-slate-400 text-xs py-10">Sin coincidencias</p>}
          {!cargando && filtrados.map((j) => (
            <button key={j.id} type="button" onClick={() => { onSelect(j); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors text-left border-b border-slate-50 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</p>
                {j.dni && <p className="text-xs text-slate-400">DNI {j.dni}</p>}
              </div>
              {!j.cuentaActiva && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0 ml-2">Sin cuenta</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Buscador de jugador con alta rápida (mismo flujo que crear turno) ─────────
// Props: value (jugador seleccionado | null), onChange(jugador|null), adminToken
export default function BuscadorJugador({ value, onChange, adminToken }) {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [modalBusqueda, setModalBusqueda] = useState(false)

  const [altaRapida, setAltaRapida] = useState(false)
  const [altaForm, setAltaForm] = useState({ nombre: '', apellido: '', dni: '' })
  const [altaErrors, setAltaErrors] = useState({ nombre: '', apellido: '', dni: '' })
  const [altaGuardando, setAltaGuardando] = useState(false)
  const [hintNombre, showHintNombre] = useFieldHint()
  const [hintApellido, showHintApellido] = useFieldHint()
  const [hintQuery, showHintQuery] = useFieldHint()

  const setAltaField = (k, v) => {
    setAltaForm((p) => ({ ...p, [k]: v }))
    setAltaErrors((p) => ({ ...p, [k]: '' }))
  }

  const handleAltaRapida = async () => {
    const errs = { nombre: '', apellido: '', dni: '' }
    if (!altaForm.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    else if (/\d/.test(altaForm.nombre)) errs.nombre = 'El nombre no puede contener números'
    if (!altaForm.apellido.trim()) errs.apellido = 'El apellido es obligatorio'
    else if (/\d/.test(altaForm.apellido)) errs.apellido = 'El apellido no puede contener números'
    if (!altaForm.dni.trim()) errs.dni = 'El DNI es obligatorio'
    else if (!/^\d{7,8}$/.test(altaForm.dni.trim())) errs.dni = 'El DNI debe tener 7 u 8 dígitos'
    if (errs.nombre || errs.apellido || errs.dni) { setAltaErrors(errs); return }
    setAltaGuardando(true)
    try {
      const nuevo = await api.post('/jugadores', altaForm, { Authorization: `Bearer ${adminToken}` })
      onChange(nuevo)
      setQuery(''); setResultados([]); setAltaRapida(false)
      setAltaForm({ nombre: '', apellido: '', dni: '' })
      setAltaErrors({ nombre: '', apellido: '', dni: '' })
    } catch (err) {
      setAltaErrors((p) => ({ ...p, dni: err.message || 'No se pudo dar de alta' }))
    } finally {
      setAltaGuardando(false)
    }
  }

  useEffect(() => {
    if (value) return
    if (query.trim().length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const data = await api.get(`/jugadores/buscar?q=${encodeURIComponent(query.trim())}`, { Authorization: `Bearer ${adminToken}` })
        setResultados(Array.isArray(data) ? data : [])
      } catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [query, value, adminToken])

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border border-emerald-300 bg-emerald-50 rounded-xl">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-800 truncate">{value.nombre} {value.apellido}</p>
          {value.dni && <p className="text-xs text-emerald-600">DNI {value.dni}</p>}
        </div>
        <button type="button" onClick={() => { onChange(null); setQuery(''); setResultados([]) }} className="text-emerald-400 hover:text-emerald-600 shrink-0"><X size={15} /></button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input
          type="text"
          placeholder="Buscar por nombre o DNI..."
          value={query}
          onChange={(e) => {
            const raw = e.target.value
            if (/^\d+$/.test(raw) && raw.length > 8) { showHintQuery('El DNI tiene máximo 8 dígitos'); return }
            setQuery(raw); setResultados([])
          }}
          className="flex-1 border rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-300 border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
        />
        <button type="button" onClick={() => setModalBusqueda(true)} title="Búsqueda avanzada"
          className="shrink-0 px-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
          <Search size={15} />
        </button>
      </div>
      {hintQuery && <p className="text-amber-500 text-xs mt-1 animate-pulse">{hintQuery}</p>}
      {buscando && <div className="absolute right-12 top-3 w-3.5 h-3.5 border-2 border-slate-300 border-t-emerald-400 rounded-full animate-spin" />}

      {resultados.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {resultados.map((j) => (
            <button key={j.id} type="button" onClick={() => { onChange(j); setQuery(''); setResultados([]) }}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50 transition-colors text-left">
              <div className="min-w-0 flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</span>
                {!j.cuentaActiva && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200 shrink-0">Sin cuenta</span>}
              </div>
              {j.dni && <span className="text-xs text-slate-400 shrink-0 ml-2">DNI {j.dni}</span>}
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !buscando && resultados.length === 0 && !altaRapida && (
        <div className="mt-1.5 flex items-center justify-between px-1">
          <p className="text-xs text-slate-400">No encontrado en el sistema</p>
          <button type="button"
            onClick={() => {
              const q = query.trim()
              const esDni = /^\d{1,8}$/.test(q)
              setAltaRapida(true)
              setAltaForm({ nombre: esDni ? '' : q, apellido: '', dni: esDni ? q : '' })
              setAltaErrors({ nombre: '', apellido: '', dni: '' })
            }}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
            + Dar de alta rápida
          </button>
        </div>
      )}

      {altaRapida && (
        <div className="mt-2 p-3 border border-emerald-200 bg-emerald-50 rounded-xl flex flex-col gap-2">
          <p className="text-xs font-semibold text-emerald-700">Alta rápida de jugador</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input placeholder="Nombre *" value={altaForm.nombre}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[0-9]/g, '')
                  if (e.target.value !== filtered) showHintNombre('El nombre no puede contener números')
                  setAltaField('nombre', filtered)
                }}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.nombre ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`} />
              {hintNombre && <p className="text-[10px] text-amber-500 mt-0.5 animate-pulse">{hintNombre}</p>}
              {altaErrors.nombre && !hintNombre && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.nombre}</p>}
            </div>
            <div>
              <input placeholder="Apellido *" value={altaForm.apellido}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[0-9]/g, '')
                  if (e.target.value !== filtered) showHintApellido('El apellido no puede contener números')
                  setAltaField('apellido', filtered)
                }}
                className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.apellido ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`} />
              {hintApellido && <p className="text-[10px] text-amber-500 mt-0.5 animate-pulse">{hintApellido}</p>}
              {altaErrors.apellido && !hintApellido && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.apellido}</p>}
            </div>
          </div>
          <div>
            <input placeholder="DNI (7 u 8 dígitos) *" value={altaForm.dni} maxLength={8} inputMode="numeric"
              onChange={(e) => setAltaField('dni', e.target.value.replace(/\D/g, ''))}
              className={`w-full border rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none transition-all ${altaErrors.dni ? 'border-red-400 focus:border-red-400 bg-red-50' : 'border-slate-200 focus:border-emerald-400'}`} />
            {altaErrors.dni && <p className="text-[10px] text-red-500 mt-0.5">{altaErrors.dni}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAltaRapida(false); setAltaErrors({ nombre: '', apellido: '', dni: '' }) }} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
            <button type="button" onClick={handleAltaRapida} disabled={altaGuardando}
              className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all disabled:opacity-50">
              {altaGuardando ? 'Guardando...' : 'Crear y seleccionar'}
            </button>
          </div>
        </div>
      )}

      {modalBusqueda && (
        <ModalBusquedaJugadores adminToken={adminToken} onClose={() => setModalBusqueda(false)} onSelect={(j) => { onChange(j); setQuery(''); setResultados([]) }} />
      )}
    </div>
  )
}
