import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { api } from '../../lib/api'

// Modal de búsqueda de jugadores (lista completa + filtros Nombre/Apellido/Con-Sin cuenta).
// Autónomo: recibe onSelect(jugador), onClose y adminToken. Se usa al cargar una reserva manual
// y al agregar personas al cobro del turno (CheckoutTurno).
const ModalBusquedaJugadores = ({ onSelect, onClose, adminToken }) => {
  const [todos, setTodos]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroNombre, setFiltroNombre]     = useState('')
  const [filtroApellido, setFiltroApellido] = useState('')
  const [filtroCuenta, setFiltroCuenta]     = useState('todos') // 'todos' | 'con' | 'sin'
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
    const matchNombre   = j.nombre?.toLowerCase().includes(filtroNombre.toLowerCase().trim())
    const matchApellido = j.apellido?.toLowerCase().includes(filtroApellido.toLowerCase().trim())
    const matchCuenta   = filtroCuenta === 'todos'
      ? true
      : filtroCuenta === 'con' ? j.cuentaActiva : !j.cuentaActiva
    return matchNombre && matchApellido && matchCuenta
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '82vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Buscar jugador</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Nombre..."
              value={filtroNombre}
              onChange={(e) => setFiltroNombre(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300"
            />
            <input
              type="text"
              placeholder="Apellido..."
              value={filtroApellido}
              onChange={(e) => setFiltroApellido(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all placeholder:text-slate-300"
            />
          </div>
          <div className="flex gap-1.5">
            {[['todos','Todos'],['con','Con cuenta'],['sin','Sin cuenta']].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFiltroCuenta(val)}
                className={`text-[10px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  filtroCuenta === val
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-slate-400 self-center">{filtrados.length} jugador{filtrados.length !== 1 ? 'es' : ''}</span>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1">
          {cargando && (
            <div className="flex items-center justify-center py-10 gap-2">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Cargando jugadores...</span>
            </div>
          )}
          {!cargando && filtrados.length === 0 && (
            <p className="text-center text-slate-400 text-xs py-10">Sin coincidencias</p>
          )}
          {!cargando && filtrados.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => { onSelect(j); onClose() }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-50 active:bg-emerald-100 transition-colors text-left border-b border-slate-50 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{j.nombre} {j.apellido}</p>
                {j.dni && <p className="text-xs text-slate-400">DNI {j.dni}</p>}
              </div>
              {!j.cuentaActiva && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0 ml-2">Sin cuenta</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ModalBusquedaJugadores
