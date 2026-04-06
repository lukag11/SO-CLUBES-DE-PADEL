import { useState } from 'react'
import {
  Trophy, Plus, Users, X, ChevronRight, Calendar, Medal,
  CheckCircle, Clock, Archive, Trash2, ToggleLeft, ToggleRight, Infinity,
} from 'lucide-react'
import {
  TORNEOS_INICIALES, CATEGORIAS, FORMATOS,
} from '../features/admin/torneosMockData'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

const totalCupo = (torneo) =>
  torneo.cupoLibre
    ? null
    : Object.values(torneo.cuposPorCategoria).reduce((a, b) => a + b, 0)

const ESTADO_CONFIG = {
  activo:     { label: 'En curso',   color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  proximo:    { label: 'Próximo',    color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  finalizado: { label: 'Finalizado', color: 'text-white/30 bg-white/5 border-white/10' },
}

const EMPTY_FORM = {
  nombre: '',
  categorias: [],
  cupoLibre: false,
  cuposPorCategoria: {},
  formato: FORMATOS[0],
  fechaInicio: '',
  fechaFin: '',
  descripcion: '',
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado]
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

const TorneoCard = ({ torneo, onVerInscritos, onToggleInscripcion }) => {
  const cupo = totalCupo(torneo)
  const cupoLleno = !torneo.cupoLibre && torneo.inscriptos.length >= cupo
  const pct = cupo ? Math.round((torneo.inscriptos.length / cupo) * 100) : 0

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-800 font-semibold text-base truncate">{torneo.nombre}</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {torneo.categorias.join(', ')} · {torneo.formato}
          </p>
        </div>
        <Badge estado={torneo.estado} />
      </div>

      {/* Fechas */}
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <Calendar size={13} className="shrink-0" />
        <span>{fmtFecha(torneo.fechaInicio)} → {fmtFecha(torneo.fechaFin)}</span>
      </div>

      {/* Descripción */}
      {torneo.descripcion && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{torneo.descripcion}</p>
      )}

      {/* Cupo */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-slate-500 text-xs">Inscriptos</span>
          {torneo.cupoLibre ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-sky-500">
              <Infinity size={12} /> Libre
            </span>
          ) : (
            <span className={`text-xs font-semibold ${cupoLleno ? 'text-red-500' : 'text-slate-700'}`}>
              {torneo.inscriptos.length} / {cupo}
            </span>
          )}
        </div>
        {!torneo.cupoLibre && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${cupoLleno ? 'bg-red-400' : 'bg-brand-500'}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        )}
        {/* Desglose por categoría si hay más de una */}
        {!torneo.cupoLibre && torneo.categorias.length > 1 && (
          <div className="mt-2 flex flex-col gap-1">
            {torneo.categorias.map((cat) => {
              const max = torneo.cuposPorCategoria[cat] || 0
              const inscCat = torneo.inscriptos.filter(i => i.categoria === cat).length
              return (
                <div key={cat} className="flex justify-between text-xs text-slate-400">
                  <span>{cat}</span>
                  <span>{inscCat}/{max}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onVerInscritos(torneo)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all flex-1 justify-center"
        >
          <Users size={13} />
          Ver inscritos ({torneo.inscriptos.length})
        </button>
        {torneo.estado !== 'finalizado' && (
          <button
            onClick={() => onToggleInscripcion(torneo.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              torneo.inscripcionAbierta
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {torneo.inscripcionAbierta
              ? <><ToggleRight size={14} /> Inscripción abierta</>
              : <><ToggleLeft size={14} /> Inscripción cerrada</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

const PanelInscritos = ({ torneo, onClose, onBajaInscripto }) => {
  if (!torneo) return null
  const cupo = totalCupo(torneo)

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-slate-800 font-bold text-lg leading-tight">{torneo.nombre}</h2>
            <p className="text-slate-400 text-sm mt-0.5">
              {torneo.inscriptos.length} inscripto{torneo.inscriptos.length !== 1 ? 's' : ''}
              {cupo ? ` de ${cupo}` : ' · cupo libre'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {torneo.inscriptos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Users size={36} strokeWidth={1.2} />
              <p className="text-sm">Todavía no hay inscriptos</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {torneo.inscriptos.map((ins) => (
                <div key={ins.id} className="px-6 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-slate-500 text-sm font-semibold">
                      {ins.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm font-medium truncate">{ins.nombre}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      DNI {ins.dni} · {ins.categoria} · Inscripto {fmtFecha(ins.fecha)}
                    </p>
                  </div>
                  {torneo.estado !== 'finalizado' && (
                    <button
                      onClick={() => onBajaInscripto(torneo.id, ins.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all shrink-0"
                      title="Dar de baja"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Podio (si finalizado) */}
        {torneo.estado === 'finalizado' && (torneo.ganador || torneo.subcampeon) && (
          <div className="border-t border-slate-100 divide-y divide-slate-100">
            {torneo.ganador && (
              <div className="px-6 py-3.5 bg-amber-50 flex items-center gap-2">
                <Trophy size={15} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs text-amber-600 font-medium">Campeones</p>
                  <p className="text-slate-800 text-sm font-semibold">{torneo.ganador}</p>
                </div>
              </div>
            )}
            {torneo.subcampeon && (
              <div className="px-6 py-3.5 bg-slate-50 flex items-center gap-2">
                <Medal size={15} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs text-slate-500 font-medium">Subcampeones</p>
                  <p className="text-slate-700 text-sm font-semibold">{torneo.subcampeon}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal nuevo torneo ────────────────────────────────────────────────────────

const ModalNuevoTorneo = ({ onClose, onGuardar }) => {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const toggleCategoria = (cat) => {
    setForm((prev) => {
      const yaEsta = prev.categorias.includes(cat)
      const categorias = yaEsta
        ? prev.categorias.filter(c => c !== cat)
        : [...prev.categorias, cat]
      // Si se destilda una categoría, limpiar su cupo
      const cuposPorCategoria = { ...prev.cuposPorCategoria }
      if (yaEsta) delete cuposPorCategoria[cat]
      return { ...prev, categorias, cuposPorCategoria }
    })
  }

  const setCupoCategoria = (cat, valor) => {
    setForm((prev) => ({
      ...prev,
      cuposPorCategoria: { ...prev.cuposPorCategoria, [cat]: Number(valor) },
    }))
  }

  const validate = () => {
    const e = {}
    if (!form.nombre.trim())        e.nombre      = 'Requerido'
    if (form.categorias.length === 0) e.categorias = 'Seleccioná al menos una categoría'
    if (!form.fechaInicio)          e.fechaInicio  = 'Requerido'
    if (!form.fechaFin)             e.fechaFin     = 'Requerido'
    if (form.fechaFin && form.fechaInicio && form.fechaFin < form.fechaInicio)
      e.fechaFin = 'Debe ser posterior al inicio'
    if (!form.cupoLibre) {
      form.categorias.forEach((cat) => {
        if (!form.cuposPorCategoria[cat] || form.cuposPorCategoria[cat] < 2)
          e[`cupo_${cat}`] = 'Mínimo 2'
      })
    }
    return e
  }

  const handleGuardar = () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onGuardar(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-slate-800 font-bold text-lg">Nuevo torneo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Nombre del torneo</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Ej: Copa Verano 2026"
              className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${errors.nombre ? 'border-red-400' : 'border-slate-200'}`}
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
          </div>

          {/* Categorías */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Categorías</label>
              <span className="text-xs text-slate-400">Podés seleccionar más de una</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((cat) => {
                const seleccionada = form.categorias.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategoria(cat)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      seleccionada
                        ? 'border-brand-500 bg-brand-500/8 text-brand-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      seleccionada ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'
                    }`}>
                      {seleccionada && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      )}
                    </span>
                    {cat}
                  </button>
                )
              })}
            </div>
            {errors.categorias && <p className="text-red-500 text-xs mt-1.5">{errors.categorias}</p>}
          </div>

          {/* Cupo */}
          {form.categorias.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-slate-600">Cupo de inscripción</label>
                <button
                  type="button"
                  onClick={() => set('cupoLibre', !form.cupoLibre)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                    form.cupoLibre
                      ? 'text-sky-600 bg-sky-50 border-sky-200'
                      : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {form.cupoLibre ? <><Infinity size={13} /> Cupo libre</> : <><ToggleLeft size={13} /> Cupo máximo</>}
                </button>
              </div>

              {!form.cupoLibre && (
                <div className="flex flex-col gap-2">
                  {form.categorias.map((cat) => (
                    <div key={cat} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      <span className="text-sm text-slate-700 flex-1">{cat}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={2}
                          max={64}
                          value={form.cuposPorCategoria[cat] || ''}
                          onChange={(e) => setCupoCategoria(cat, e.target.value)}
                          placeholder="0"
                          className={`w-20 text-center bg-white border rounded-lg px-2 py-1 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${
                            errors[`cupo_${cat}`] ? 'border-red-400' : 'border-slate-200'
                          }`}
                        />
                        <span className="text-xs text-slate-400 whitespace-nowrap">parejas</span>
                      </div>
                    </div>
                  ))}
                  {form.categorias.some(cat => errors[`cupo_${cat}`]) && (
                    <p className="text-red-500 text-xs">Todos los cupos deben ser mínimo 2</p>
                  )}
                </div>
              )}

              {form.cupoLibre && (
                <p className="text-xs text-slate-400 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                  Sin límite de inscriptos. Podés cerrar la inscripción manualmente cuando lo necesites.
                </p>
              )}
            </div>
          )}

          {/* Formato */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Formato</label>
            <select
              value={form.formato}
              onChange={(e) => set('formato', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
            >
              {FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => set('fechaInicio', e.target.value)}
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${errors.fechaInicio ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.fechaInicio && <p className="text-red-500 text-xs mt-1">{errors.fechaInicio}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Fecha de fin</label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(e) => set('fechaFin', e.target.value)}
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${errors.fechaFin ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.fechaFin && <p className="text-red-500 text-xs mt-1">{errors.fechaFin}</p>}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Descripción <span className="text-slate-400">(opcional)</span>
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              rows={3}
              placeholder="Info adicional del torneo..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all"
          >
            Crear torneo
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const TorneosPage = () => {
  const [torneos, setTorneos] = useState(TORNEOS_INICIALES)
  const [tabActiva, setTabActiva] = useState('activo')
  const [panelTorneo, setPanelTorneo] = useState(null)
  const [modalNuevo, setModalNuevo] = useState(false)

  const tabs = [
    { key: 'activo',     label: 'En curso',    icon: CheckCircle },
    { key: 'proximo',    label: 'Próximos',    icon: Clock },
    { key: 'finalizado', label: 'Finalizados', icon: Archive },
  ]

  const torneosTab = torneos.filter((t) => t.estado === tabActiva)

  const handleToggleInscripcion = (id) => {
    setTorneos((prev) =>
      prev.map((t) => t.id === id ? { ...t, inscripcionAbierta: !t.inscripcionAbierta } : t)
    )
    setPanelTorneo((prev) =>
      prev?.id === id ? { ...prev, inscripcionAbierta: !prev.inscripcionAbierta } : prev
    )
  }

  const handleBajaInscripto = (torneoId, inscriptoId) => {
    setTorneos((prev) =>
      prev.map((t) =>
        t.id === torneoId
          ? { ...t, inscriptos: t.inscriptos.filter((i) => i.id !== inscriptoId) }
          : t
      )
    )
    setPanelTorneo((prev) =>
      prev?.id === torneoId
        ? { ...prev, inscriptos: prev.inscriptos.filter((i) => i.id !== inscriptoId) }
        : prev
    )
  }

  const handleNuevoTorneo = (form) => {
    const nuevo = {
      id: Date.now(),
      nombre: form.nombre,
      categorias: form.categorias,
      cupoLibre: form.cupoLibre,
      cuposPorCategoria: form.cupoLibre ? {} : form.cuposPorCategoria,
      formato: form.formato,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      descripcion: form.descripcion,
      estado: 'proximo',
      inscripcionAbierta: false,
      inscriptos: [],
      ganador: null,
      subcampeon: null,
    }
    setTorneos((prev) => [nuevo, ...prev])
    setModalNuevo(false)
    setTabActiva('proximo')
  }

  const stats = [
    { label: 'En curso',    value: torneos.filter(t => t.estado === 'activo').length,     icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Próximos',    value: torneos.filter(t => t.estado === 'proximo').length,    icon: Clock,       color: 'text-sky-500' },
    { label: 'Finalizados', value: torneos.filter(t => t.estado === 'finalizado').length, icon: Archive,     color: 'text-slate-400' },
    { label: 'Inscriptos',  value: torneos.reduce((acc, t) => acc + t.inscriptos.length, 0), icon: Users,   color: 'text-violet-500' },
  ]

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-800 text-2xl font-bold">Torneos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gestión y organización de torneos del club</p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20"
        >
          <Plus size={16} />
          Nuevo torneo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-slate-800 text-2xl font-bold leading-none">{value}</p>
              <p className="text-slate-400 text-xs mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-100">
          {tabs.map(({ key, label, icon: Icon }) => {
            const count = torneos.filter(t => t.estado === key).length
            return (
              <button
                key={key}
                onClick={() => setTabActiva(key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-px ${
                  tabActiva === key
                    ? 'border-brand-500 text-brand-600 bg-brand-500/3'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                  tabActiva === key ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="p-5">
          {torneosTab.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Trophy size={40} strokeWidth={1.2} />
              <p className="text-sm">No hay torneos en esta categoría</p>
              {tabActiva !== 'finalizado' && (
                <button
                  onClick={() => setModalNuevo(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 mt-1"
                >
                  <Plus size={14} /> Crear uno nuevo
                </button>
              )}
            </div>
          ) : tabActiva === 'finalizado' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 pb-3 pr-4">Torneo</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-3 pr-4">Categoría</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-3 pr-4">Período</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-3 pr-4">Campeones</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-3 pr-4">Subcampeones</th>
                    <th className="text-left text-xs font-semibold text-slate-500 pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {torneosTab.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-slate-800">{t.nombre}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.formato}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600 text-xs">
                        {t.categorias.join(', ')}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500 text-xs whitespace-nowrap">
                        {fmtFecha(t.fechaInicio)} → {fmtFecha(t.fechaFin)}
                      </td>
                      <td className="py-3.5 pr-4">
                        {t.ganador ? (
                          <div className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                            <Trophy size={13} />
                            {t.ganador}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        {t.subcampeon ? (
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                            <Medal size={13} />
                            {t.subcampeon}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5">
                        <button
                          onClick={() => setPanelTorneo(t)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          <Users size={13} />
                          {t.inscriptos.length}
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {torneosTab.map((t) => (
                <TorneoCard
                  key={t.id}
                  torneo={t}
                  onVerInscritos={setPanelTorneo}
                  onToggleInscripcion={handleToggleInscripcion}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <PanelInscritos
        torneo={panelTorneo}
        onClose={() => setPanelTorneo(null)}
        onBajaInscripto={handleBajaInscripto}
      />

      {modalNuevo && (
        <ModalNuevoTorneo
          onClose={() => setModalNuevo(false)}
          onGuardar={handleNuevoTorneo}
        />
      )}

    </div>
  )
}

export default TorneosPage
