import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy, Plus, Users, X, ChevronRight, Calendar, Medal,
  CheckCircle, Clock, Archive, ToggleLeft, ToggleRight, Infinity,
  Lock, Pencil, Trash2, AlertTriangle,
} from 'lucide-react'
import { CATEGORIAS, GENEROS, FORMATOS } from '../features/admin/torneosMockData'
import useTorneosStore from '../store/torneosStore'
import useClubStore from '../store/clubStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

const totalCupo = (torneo) =>
  torneo.cupoLibre
    ? null
    : Object.values(torneo.cuposPorCategoria).reduce((a, b) => a + b, 0)

// Mapeo de tab key → estados que incluye
const TAB_ESTADOS = {
  en_curso:    ['in_progress'],
  proximos:    ['draft', 'open', 'closed'],
  finalizados: ['finished'],
}

const ESTADO_CONFIG = {
  draft:       { label: 'Borrador',            color: 'text-slate-500 bg-slate-100 border-slate-200' },
  open:        { label: 'Inscripción abierta', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  closed:      { label: 'Insc. cerrada',       color: 'text-amber-600 bg-amber-50 border-amber-200' },
  in_progress: { label: 'En curso',            color: 'text-sky-600 bg-sky-50 border-sky-200' },
  finished:    { label: 'Finalizado',          color: 'text-slate-400 bg-slate-50 border-slate-100' },
}

const GENERO_CONFIG = {
  Masculino: { color: 'text-sky-600 bg-sky-50 border-sky-200' },
  Femenino:  { color: 'text-pink-600 bg-pink-50 border-pink-200' },
  Mixto:     { color: 'text-violet-600 bg-violet-50 border-violet-200' },
}

const EMPTY_FORM = {
  nombre: '',
  categorias: [],
  genero: 'Masculino',
  cupoLibre: false,
  cuposPorCategoria: {},
  formato: FORMATOS[0],
  canchasAsignadas: [],
  fechaInicio: '',
  fechaFin: '',
  fechaLimiteInscripcion: '',
  diaInicioEliminatoria: '',
  horaInicioEliminatoria: '',
  descripcion: '',
}

// Transición de estado al hacer toggle de inscripción
const toggleEstado = (estado) => {
  if (estado === 'draft')   return 'open'
  if (estado === 'open')    return 'closed'
  if (estado === 'closed')  return 'open'
  return estado  // in_progress / finished no cambian con este toggle
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.draft
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

const TorneoCard = ({ torneo, onVerDetalle, onToggleEstado, onEditar, onEliminar }) => {
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const cupo = totalCupo(torneo)
  const cupoLleno = !torneo.cupoLibre && torneo.inscriptos.length >= cupo
  const pct = cupo ? Math.round((torneo.inscriptos.length / cupo) * 100) : 0
  const puedeToggle = ['draft', 'open', 'closed'].includes(torneo.estado)
  const puedeEditarEliminar = ['draft', 'open', 'closed'].includes(torneo.estado)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-slate-800 font-semibold text-base truncate">{torneo.nombre}</h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {torneo.categorias.join(', ')} · {torneo.formato}
          </p>
          {torneo.genero && (
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${(GENERO_CONFIG[torneo.genero] ?? GENERO_CONFIG.Masculino).color}`}>
              {torneo.genero}
            </span>
          )}
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
          <span className="text-slate-500 text-xs">Parejas inscriptas</span>
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

      {/* Confirm eliminar */}
      {confirmarEliminar && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex flex-col gap-2">
          {torneo.inscriptos.length > 0 && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs">
              <AlertTriangle size={12} />
              Hay {torneo.inscriptos.length} pareja{torneo.inscriptos.length !== 1 ? 's' : ''} inscripta{torneo.inscriptos.length !== 1 ? 's' : ''}. Se perderán todos los datos.
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className="text-red-700 text-xs font-medium flex-1">¿Confirmás la eliminación?</p>
            <button
              onClick={() => setConfirmarEliminar(false)}
              className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => onEliminar(torneo.id)}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg transition-all"
            >
              Sí, eliminar
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
        <button
          onClick={() => onVerDetalle(torneo)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all flex-1 justify-center"
        >
          <Users size={13} />
          Ver detalle ({torneo.inscriptos.length})
        </button>
        {puedeEditarEliminar && (
          <>
            <button
              onClick={() => onEditar(torneo)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-all"
              title="Editar torneo"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => setConfirmarEliminar(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
              title="Eliminar torneo"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
        {puedeToggle && (
          <button
            onClick={() => onToggleEstado(torneo.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              torneo.estado === 'open'
                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {torneo.estado === 'open'
              ? <><ToggleRight size={14} /> Insc. abierta</>
              : torneo.estado === 'closed'
                ? <><Lock size={14} /> Insc. cerrada</>
                : <><ToggleLeft size={14} /> Abrir insc.</>
            }
          </button>
        )}
      </div>
    </div>
  )
}

// ── Modal nuevo torneo ────────────────────────────────────────────────────────

const ModalTorneo = ({ onClose, onGuardar, torneoEditar = null }) => {
  const esEdicion = torneoEditar !== null
  const todasCanchas = useClubStore((s) => s.club.canchas)
  const canchasClub = useMemo(() => todasCanchas.filter((c) => c.activa), [todasCanchas])
  const [form, setForm] = useState(() => esEdicion ? {
    nombre: torneoEditar.nombre,
    categorias: torneoEditar.categorias,
    genero: torneoEditar.genero ?? 'Masculino',
    cupoLibre: torneoEditar.cupoLibre,
    cuposPorCategoria: torneoEditar.cuposPorCategoria ?? {},
    formato: torneoEditar.formato,
    canchasAsignadas: torneoEditar.canchasAsignadas ?? [],
    fechaInicio: torneoEditar.fechaInicio,
    fechaFin: torneoEditar.fechaFin,
    fechaLimiteInscripcion: torneoEditar.fechaLimiteInscripcion ?? '',
    diaInicioEliminatoria: torneoEditar.diaInicioEliminatoria ?? '',
    horaInicioEliminatoria: torneoEditar.horaInicioEliminatoria ?? '',
    descripcion: torneoEditar.descripcion ?? '',
  } : EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const toggleCategoria = (cat) => {
    setForm((prev) => {
      const yaEsta = prev.categorias.includes(cat)
      const categorias = yaEsta
        ? prev.categorias.filter(c => c !== cat)
        : [...prev.categorias, cat]
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
    if (!form.nombre.trim())         e.nombre      = 'Requerido'
    if (form.categorias.length === 0) e.categorias  = 'Seleccioná al menos una categoría'
    if (!form.fechaInicio)           e.fechaInicio  = 'Requerido'
    if (!form.fechaFin)              e.fechaFin     = 'Requerido'
    if (form.fechaFin && form.fechaInicio && form.fechaFin < form.fechaInicio)
      e.fechaFin = 'Debe ser posterior al inicio'
    if (form.fechaLimiteInscripcion && form.fechaInicio && form.fechaLimiteInscripcion >= form.fechaInicio)
      e.fechaLimiteInscripcion = 'Debe ser anterior al inicio del torneo'
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
          <h2 className="text-slate-800 font-bold text-lg">{esEdicion ? 'Editar torneo' : 'Nuevo torneo'}</h2>
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

          {/* Género */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-2">Género</label>
            <div className="flex gap-2">
              {GENEROS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('genero', g)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.genero === g
                      ? `${(GENERO_CONFIG[g]).color} font-semibold`
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Canchas asignadas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Canchas para el torneo</label>
              <span className="text-xs text-slate-400">Las seleccionadas quedan bloqueadas para reservas</span>
            </div>
            <div className="flex flex-col gap-2">
              {canchasClub.map((cancha) => {
                const asignada = form.canchasAsignadas.includes(cancha.id)
                return (
                  <button
                    key={cancha.id}
                    type="button"
                    onClick={() => set('canchasAsignadas', asignada
                      ? form.canchasAsignadas.filter((id) => id !== cancha.id)
                      : [...form.canchasAsignadas, cancha.id]
                    )}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                      asignada
                        ? 'border-brand-500 bg-brand-500/8 text-brand-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      asignada ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'
                    }`}>
                      {asignada && (
                        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      )}
                    </span>
                    {cancha.nombre}
                  </button>
                )
              })}
            </div>
            {form.canchasAsignadas.length === 0 && (
              <p className="text-slate-400 text-xs mt-1.5">Si no seleccionás ninguna, se bloquearán todas las canchas del club.</p>
            )}
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

          {/* Fecha límite de inscripción */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Fecha límite de inscripción <span className="text-slate-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={form.fechaLimiteInscripcion}
              onChange={(e) => set('fechaLimiteInscripcion', e.target.value)}
              className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${errors.fechaLimiteInscripcion ? 'border-red-400' : 'border-slate-200'}`}
            />
            {errors.fechaLimiteInscripcion
              ? <p className="text-red-500 text-xs mt-1">{errors.fechaLimiteInscripcion}</p>
              : <p className="text-slate-400 text-xs mt-1">Debe ser anterior al inicio del torneo para tener tiempo de armar las zonas.</p>
            }
          </div>

          {/* Inicio fase eliminatoria — solo para formato grupos */}
          {form.formato === 'Fase de grupos + Eliminación' && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-slate-600 block">
                Inicio de fase eliminatoria <span className="text-slate-400">(opcional)</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Día</p>
                  <select
                    value={form.diaInicioEliminatoria}
                    onChange={(e) => set('diaInicioEliminatoria', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  >
                    <option value="">Sin corte</option>
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miércoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Desde las</p>
                  <select
                    value={form.horaInicioEliminatoria}
                    onChange={(e) => set('horaInicioEliminatoria', e.target.value)}
                    disabled={!form.diaInicioEliminatoria}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all disabled:opacity-40"
                  >
                    <option value="">Todo el día</option>
                    <option value="14:00">14:00 hs</option>
                    <option value="15:00">15:00 hs</option>
                    <option value="16:00">16:00 hs</option>
                    <option value="17:00">17:00 hs</option>
                    <option value="18:00">18:00 hs</option>
                    <option value="19:00">19:00 hs</option>
                  </select>
                </div>
              </div>
              <p className="text-slate-400 text-xs">
                Los jugadores solo podrán elegir disponibilidad de grupos antes de este corte. El día elegido (desde la hora) y los días posteriores quedan reservados para eliminatoria.
              </p>
            </div>
          )}

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
            {esEdicion ? 'Guardar cambios' : 'Crear torneo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const TorneosPage = () => {
  const { torneos, addTorneo, setEstado, deleteTorneo, updateTorneo } = useTorneosStore()
  const navigate = useNavigate()
  const [tabActiva, setTabActiva] = useState('en_curso')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [torneoEditar, setTorneoEditar] = useState(null)

  const tabs = [
    { key: 'en_curso',    label: 'En curso',    icon: CheckCircle },
    { key: 'proximos',    label: 'Próximos',    icon: Clock },
    { key: 'finalizados', label: 'Finalizados', icon: Archive },
  ]

  const torneosTab = torneos.filter((t) => (TAB_ESTADOS[tabActiva] ?? []).includes(t.estado))

  const handleToggleEstado = (id) => {
    const torneo = torneos.find((t) => t.id === id)
    if (!torneo) return
    setEstado(id, toggleEstado(torneo.estado))
  }

  const handleVerDetalle = (torneo) => {
    navigate(`/dashboardAdmin/torneos/${torneo.id}`)
  }

  const handleNuevoTorneo = (form) => {
    addTorneo(form)
    setModalNuevo(false)
    setTabActiva('proximos')
  }

  const handleEditar = (torneo) => setTorneoEditar(torneo)

  const handleGuardarEdicion = (form) => {
    updateTorneo(torneoEditar.id, form)
    setTorneoEditar(null)
  }

  const handleEliminar = (id) => deleteTorneo(id)

  const stats = [
    { label: 'En curso',    value: torneos.filter(t => t.estado === 'in_progress').length, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Próximos',    value: torneos.filter(t => TAB_ESTADOS.proximos.includes(t.estado)).length, icon: Clock, color: 'text-sky-500' },
    { label: 'Finalizados', value: torneos.filter(t => t.estado === 'finished').length,    icon: Archive,     color: 'text-slate-400' },
    { label: 'Inscriptos',  value: torneos.reduce((acc, t) => acc + t.inscriptos.length, 0), icon: Users,    color: 'text-violet-500' },
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
            const count = torneos.filter(t => (TAB_ESTADOS[key] ?? []).includes(t.estado)).length
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
              {tabActiva !== 'finalizados' && (
                <button
                  onClick={() => setModalNuevo(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:text-brand-600 mt-1"
                >
                  <Plus size={14} /> Crear uno nuevo
                </button>
              )}
            </div>
          ) : tabActiva === 'finalizados' ? (
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
                        <p>{t.categorias.join(', ')}</p>
                        {t.genero && (
                          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${(GENERO_CONFIG[t.genero] ?? GENERO_CONFIG.Masculino).color}`}>
                            {t.genero}
                          </span>
                        )}
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
                          onClick={() => handleVerDetalle(t)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          Ver detalle
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
                  onVerDetalle={handleVerDetalle}
                  onToggleEstado={handleToggleEstado}
                  onEditar={handleEditar}
                  onEliminar={handleEliminar}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modalNuevo && (
        <ModalTorneo
          onClose={() => setModalNuevo(false)}
          onGuardar={handleNuevoTorneo}
        />
      )}

      {torneoEditar && (
        <ModalTorneo
          torneoEditar={torneoEditar}
          onClose={() => setTorneoEditar(null)}
          onGuardar={handleGuardarEdicion}
        />
      )}

    </div>
  )
}

export default TorneosPage
