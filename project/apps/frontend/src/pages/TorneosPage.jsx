import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy, Plus, Users, X, ChevronRight, Calendar, Medal,
  CheckCircle, Clock, Archive, ToggleLeft, ToggleRight, Infinity,
  Lock, Pencil, Trash2, AlertTriangle,
} from 'lucide-react'
import { GENEROS, FORMATOS } from '../features/admin/torneosMockData'
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

// ── Selector de categorías ────────────────────────────────────────────────────

const BASES_CATEGORIAS = [
  { num: 1, label: '1° Categoría' },
  { num: 2, label: '2° Categoría' },
  { num: 3, label: '3° Categoría' },
  { num: 4, label: '4° Categoría' },
  { num: 5, label: '5° Categoría' },
  { num: 6, label: '6° Categoría' },
  { num: 7, label: '7° Categoría' },
  { num: 8, label: '8° Categoría' },
]

const CHECK = ({ size = 2 }) => (
  <svg viewBox="0 0 10 8" className={`w-${size} h-${size}`}>
    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
)

// Normaliza una categoría para comparación: elimina palabras comunes,
// símbolos y espacios → solo número + letras/números del sufijo.
// "4° Categoría B +35" → "4b35"   "4°catb+35" → "4b35"   "Elite" → "elite"
const normalizeCategoria = (str) =>
  str.toLowerCase()
    .replace(/categor[ií]as?/g, '')
    .replace(/\bcat\.?\b/g, '')
    .replace(/[^a-z0-9]/g, '')

const CategoriasSelector = ({ value, onToggle, historicas = [], onSave, onDelete, onRename }) => {
  const [varInputs, setVarInputs]   = useState({})   // { num: string }
  const [varErrors, setVarErrors]   = useState({})   // { num: string } — mensajes de error
  const [expanded, setExpanded]     = useState({})   // { num: bool }
  const [editando, setEditando]     = useState(null)
  const [editVal, setEditVal]       = useState('')
  const [customInput, setCustomInput] = useState('')
  const [customError, setCustomError] = useState('')

  // Variantes guardadas + históricas, agrupadas por base
  const varPorBase = useMemo(() => {
    const map = {}
    historicas.forEach((cat) => {
      const base = BASES_CATEGORIAS.find((b) => cat.startsWith(b.label + ' '))
      if (base) {
        if (!map[base.num]) map[base.num] = []
        if (!map[base.num].includes(cat)) map[base.num].push(cat)
      }
    })
    return map
  }, [historicas])

  const otrasHistoricas = useMemo(() =>
    historicas.filter((cat) =>
      !BASES_CATEGORIAS.some((b) => cat === b.label || cat.startsWith(b.label + ' '))
    ),
    [historicas]
  )

  const addVariant = (base) => {
    const suffix = (varInputs[base.num] ?? '').trim()
    if (!suffix) return
    const nueva = `${base.label} ${suffix}`
    const normNueva = normalizeCategoria(nueva)
    const duplicada = historicas.find((c) => normalizeCategoria(c) === normNueva)
    if (duplicada) {
      setVarErrors((p) => ({ ...p, [base.num]: `Ya existe como "${duplicada}"` }))
      return
    }
    setVarErrors((p) => ({ ...p, [base.num]: '' }))
    onToggle(nueva)
    onSave(nueva)
    setVarInputs((p) => ({ ...p, [base.num]: '' }))
  }

  const addCustom = () => {
    const val = customInput.trim()
    if (!val) return
    const normVal = normalizeCategoria(val)
    const duplicada = historicas.find((c) => normalizeCategoria(c) === normVal)
    if (duplicada) {
      setCustomError(`Ya existe como "${duplicada}"`)
      return
    }
    setCustomError('')
    onToggle(val)
    onSave(val)
    setCustomInput('')
  }

  const confirmarEdicion = (oldCat) => {
    const nueva = editVal.trim()
    if (!nueva || nueva === oldCat) { setEditando(null); return }
    const normNueva = normalizeCategoria(nueva)
    const duplicada = historicas.find((c) => c !== oldCat && normalizeCategoria(c) === normNueva)
    if (duplicada) { setEditando(null); return } // silencioso — no reemplaza
    onRename(oldCat, nueva)
    if (value.includes(oldCat)) { onToggle(oldCat); onToggle(nueva) }
    setEditando(null)
  }

  const VariantRow = ({ v, onCheck }) => {
    const sel  = value.includes(v)
    const isEd = editando === v
    return (
      <div className="flex items-center gap-1.5 pl-6">
        {isEd ? (
          <>
            <input
              autoFocus
              type="text"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmarEdicion(v); if (e.key === 'Escape') setEditando(null) }}
              className="flex-1 min-w-0 text-xs bg-white border border-brand-400 rounded-lg px-2 py-0.5 outline-none"
            />
            <button type="button" onClick={() => confirmarEdicion(v)} className="text-[10px] text-brand-500 font-semibold hover:text-brand-700">✓</button>
            <button type="button" onClick={() => setEditando(null)} className="text-[10px] text-slate-400 hover:text-slate-600">✕</button>
          </>
        ) : (
          <>
            <button type="button" onClick={onCheck} className="flex items-center gap-1.5 flex-1 text-left">
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${sel ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'}`}>
                {sel && <CHECK />}
              </span>
              <span className={`text-xs ${sel ? 'text-brand-600 font-semibold' : 'text-slate-600'}`}>{v}</span>
              <span className="text-amber-400 text-[10px]">★</span>
            </button>
            <button type="button" title="Editar"
              onClick={() => { setEditando(v); setEditVal(v) }}
              className="text-[10px] text-slate-300 hover:text-brand-400 transition-colors px-0.5"
            ><Pencil size={11} /></button>
            <button type="button" title="Eliminar"
              onClick={() => { onDelete(v); if (sel) onToggle(v) }}
              className="text-[10px] text-slate-300 hover:text-red-400 transition-colors px-0.5"
            ><Trash2 size={11} /></button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* Bases 1ra–8va */}
      {BASES_CATEGORIAS.map((base) => {
        const baseSelec = value.includes(base.label)
        const varDisp   = varPorBase[base.num] ?? []
        const anyActive = baseSelec || value.some((v) => v.startsWith(base.label + ' '))
        const showSub   = varDisp.length > 0 || !!expanded[base.num]

        return (
          <div key={base.num} className={`rounded-xl border transition-all ${anyActive ? 'border-brand-200 bg-brand-50/30' : 'border-slate-200 bg-slate-50/60'}`}>
            {/* Fila base */}
            <div className="flex items-center">
              <button type="button" onClick={() => onToggle(base.label)} className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${baseSelec ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'}`}>
                  {baseSelec && <CHECK />}
                </span>
                <span className={`text-sm font-medium flex-1 ${anyActive ? 'text-brand-700' : 'text-slate-700'}`}>{base.label}</span>
              </button>
              <button type="button" title={showSub ? 'Cerrar variantes' : 'Agregar variante'}
                onClick={() => setExpanded((p) => ({ ...p, [base.num]: !p[base.num] }))}
                className={`mr-2 text-xs w-5 h-5 flex items-center justify-center rounded-md border transition-all ${
                  showSub ? 'text-brand-500 border-brand-200 bg-brand-50' : 'text-slate-400 border-slate-200 hover:text-brand-500 hover:border-brand-200'
                }`}
              >{showSub ? '−' : '+'}</button>
            </div>

            {/* Sub-sección variantes */}
            {showSub && (
              <div className="border-t border-slate-100 px-3 pt-2 pb-2.5 flex flex-col gap-1.5">
                {varDisp.map((v) => <VariantRow key={v} v={v} onCheck={() => onToggle(v)} />)}
                {/* Input nueva variante */}
                <div className="flex flex-col gap-1 pl-6 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 shrink-0">{base.label}</span>
                    <input type="text" value={varInputs[base.num] ?? ''}
                      onChange={(e) => {
                        setVarInputs((p) => ({ ...p, [base.num]: e.target.value }))
                        setVarErrors((p) => ({ ...p, [base.num]: '' }))
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter') addVariant(base) }}
                      placeholder="B +35, A..."
                      className={`flex-1 min-w-0 text-xs bg-white border rounded-lg px-2 py-1 outline-none focus:border-brand-400 placeholder-slate-300 ${varErrors[base.num] ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    <button type="button" onClick={() => addVariant(base)}
                      className="shrink-0 text-xs text-brand-500 hover:text-white hover:bg-brand-500 font-semibold px-2 py-1 rounded-lg border border-brand-200 hover:border-brand-500 transition-all"
                    >+</button>
                  </div>
                  {varErrors[base.num] && (
                    <p className="text-red-500 text-[10px]">{varErrors[base.num]}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Otras (no-standard) */}
      <div className="rounded-xl border border-dashed border-slate-200 px-3 py-2.5 flex flex-col gap-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Otras</p>
        {otrasHistoricas.map((cat) => <VariantRow key={cat} v={cat} onCheck={() => onToggle(cat)} />)}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <input type="text" value={customInput}
              onChange={(e) => { setCustomInput(e.target.value); setCustomError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
              placeholder="Ej: Intermedia, +40 Open..."
              className={`flex-1 text-xs bg-white border rounded-lg px-2 py-1 outline-none focus:border-brand-400 placeholder-slate-300 ${customError ? 'border-red-400' : 'border-slate-200'}`}
            />
            <button type="button" onClick={addCustom}
              className="shrink-0 text-xs text-slate-500 hover:text-white hover:bg-slate-500 font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:border-slate-500 transition-all"
            >+</button>
          </div>
          {customError && <p className="text-red-500 text-[10px]">{customError}</p>}
        </div>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  nombre: '',
  categorias: [],
  genero: 'Masculino',
  cupoLibre: false,
  cuposPorCategoria: {},
  cupoEspera: 5,
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

const ACENTO = {
  draft:       'bg-slate-300',
  open:        'bg-emerald-500',
  closed:      'bg-amber-400',
  in_progress: 'bg-sky-500',
  finished:    'bg-slate-200',
}

const HOVER_BG = {
  draft:       'hover:bg-slate-50',
  open:        'hover:bg-emerald-50/60',
  closed:      'hover:bg-amber-50/60',
  in_progress: 'hover:bg-sky-50/60',
  finished:    'hover:bg-slate-50',
}

const Badge = ({ estado }) => {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.draft
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

const TorneoCard = ({ torneo, onVerDetalle, onToggleEstado, onEditar, onEliminar }) => {
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const cupo     = totalCupo(torneo)
  const cupoLleno = !torneo.cupoLibre && torneo.inscriptos.length >= cupo
  const pct      = cupo ? Math.round((torneo.inscriptos.length / cupo) * 100) : 0
  const puedeToggle          = ['draft', 'open', 'closed'].includes(torneo.estado)
  const puedeEditarEliminar  = ['draft', 'open', 'closed'].includes(torneo.estado)

  return (
    <div onClick={() => onVerDetalle(torneo)} className={`group relative bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${HOVER_BG[torneo.estado] ?? HOVER_BG.draft}`}>

      {/* Acento lateral de color por estado */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${ACENTO[torneo.estado] ?? ACENTO.draft} transition-all duration-200`} />

      <div className="pl-5 pr-4 pt-4 pb-3 flex flex-col gap-3 flex-1">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-slate-800 font-semibold text-sm leading-snug truncate">{torneo.nombre}</h3>
            {torneo.descripcion && (
              <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{torneo.descripcion}</p>
            )}
          </div>
          <Badge estado={torneo.estado} />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <Calendar size={10} className="shrink-0" />
            <span>{fmtFecha(torneo.fechaInicio)} → {fmtFecha(torneo.fechaFin)}</span>
          </div>
          <span className="text-slate-200 text-xs">·</span>
          <span className="text-xs text-slate-400">{torneo.formato}</span>
          {torneo.genero && (
            <>
              <span className="text-slate-200 text-xs">·</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${(GENERO_CONFIG[torneo.genero] ?? GENERO_CONFIG.Masculino).color}`}>
                {torneo.genero}
              </span>
            </>
          )}
        </div>

        {/* Categorías chips */}
        <div className="flex flex-wrap gap-1">
          {torneo.categorias.slice(0, 3).map((cat) => (
            <span key={cat} className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {cat}
            </span>
          ))}
          {torneo.categorias.length > 3 && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              +{torneo.categorias.length - 3} más
            </span>
          )}
        </div>

        {/* Cupo */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Inscriptos</span>
            {torneo.cupoLibre ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-sky-500">
                <Infinity size={11} /> Sin límite
              </span>
            ) : (
              <span className={`text-xs font-semibold tabular-nums ${cupoLleno ? 'text-red-500' : 'text-slate-600'}`}>
                {torneo.inscriptos.length}
                <span className="text-slate-400 font-normal"> / {cupo}</span>
                <span className="text-slate-300 font-normal ml-1">({pct}%)</span>
              </span>
            )}
          </div>
          {!torneo.cupoLibre && (
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cupoLleno ? 'bg-red-400' : 'bg-brand-500'}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          )}
        </div>

      </div>

      {/* Confirm eliminar */}
      {confirmarEliminar && (
        <div className="mx-4 mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 flex flex-col gap-2">
          {torneo.inscriptos.length > 0 && (
            <div className="flex items-center gap-1.5 text-red-500 text-xs">
              <AlertTriangle size={11} />
              {torneo.inscriptos.length} pareja{torneo.inscriptos.length !== 1 ? 's' : ''} inscripta{torneo.inscriptos.length !== 1 ? 's' : ''}. Se perderán los datos.
            </div>
          )}
          <div className="flex items-center gap-2">
            <p className="text-red-700 text-xs font-medium flex-1">¿Confirmás?</p>
            <button onClick={() => setConfirmarEliminar(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-all">
              No
            </button>
            <button onClick={() => onEliminar(torneo.id)} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-all">
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Users size={11} />
          {torneo.inscriptos.length} inscripto{torneo.inscriptos.length !== 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {puedeEditarEliminar && (
            <>
              <button onClick={() => onEditar(torneo)} title="Editar"
                className="text-slate-300 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
                <Pencil size={13} />
              </button>
              <button onClick={() => setConfirmarEliminar(true)} title="Eliminar"
                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all">
                <Trash2 size={13} />
              </button>
            </>
          )}

          {puedeToggle && (
            <button
              onClick={() => onToggleEstado(torneo.id)}
              title={torneo.estado === 'open' ? 'Cerrar inscripción' : 'Abrir inscripción'}
              className={`p-1.5 rounded-lg transition-all ${
                torneo.estado === 'open'
                  ? 'text-emerald-500 hover:bg-emerald-50'
                  : torneo.estado === 'closed'
                    ? 'text-amber-400 hover:bg-amber-50'
                    : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              {torneo.estado === 'open'
                ? <ToggleRight size={15} />
                : torneo.estado === 'closed'
                  ? <Lock size={13} />
                  : <ToggleLeft size={15} />
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal nuevo torneo ────────────────────────────────────────────────────────

const ModalTorneo = ({ onClose, onGuardar, torneoEditar = null }) => {
  const esEdicion = torneoEditar !== null
  const todasCanchas = useClubStore((s) => s.club.canchas)
  const canchasClub = useMemo(() => todasCanchas.filter((c) => c.activa), [todasCanchas])
  const { torneos, categoriasGuardadas, saveCategoria, deleteCategoria, renameCategoria } = useTorneosStore()
  // Unión de variantes guardadas + usadas en torneos anteriores, sin duplicados
  const historicas = useMemo(() =>
    [...new Set([...categoriasGuardadas, ...torneos.flatMap((t) => t.categorias)])],
    [torneos, categoriasGuardadas]
  )
  const [form, setForm] = useState(() => esEdicion ? {
    nombre: torneoEditar.nombre,
    categorias: torneoEditar.categorias,
    genero: torneoEditar.genero ?? 'Masculino',
    cupoLibre: torneoEditar.cupoLibre,
    cuposPorCategoria: torneoEditar.cuposPorCategoria ?? {},
    cupoEspera: torneoEditar.cupoEspera ?? 5,
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
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-slate-800 font-bold text-base md:text-lg">{esEdicion ? 'Editar torneo' : 'Nuevo torneo'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4 md:gap-5">

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
            <label className="text-xs font-medium text-slate-600 block mb-2">Categorías</label>
            <CategoriasSelector
              value={form.categorias}
              onToggle={toggleCategoria}
              historicas={historicas}
              onSave={saveCategoria}
              onDelete={deleteCategoria}
              onRename={renameCategoria}
            />
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
              <label className="text-xs font-medium text-slate-600 block mb-2">Cupo de inscripción</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => set('cupoLibre', false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                    !form.cupoLibre
                      ? 'border-brand-500 bg-brand-500/8 text-brand-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <ToggleLeft size={14} /> Cupo máximo
                </button>
                <button
                  type="button"
                  onClick={() => set('cupoLibre', true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.cupoLibre
                      ? 'border-sky-400 bg-sky-50 text-sky-700'
                      : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Infinity size={14} /> Cupo libre
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
                  {/* Lista de espera */}
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mt-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-700">Lista de espera</p>
                      <p className="text-xs text-amber-500 mt-0.5">Lugares extra si se baja alguna pareja</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={form.cupoEspera}
                        onChange={(e) => set('cupoEspera', Math.max(0, Number(e.target.value)))}
                        className="w-20 text-center bg-white border border-amber-200 rounded-lg px-2 py-1 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                      />
                      <span className="text-xs text-amber-600 whitespace-nowrap">parejas</span>
                    </div>
                  </div>
                </div>
              )}

              {form.cupoLibre && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {form.categorias.map((cat) => (
                      <span key={cat} className="text-xs font-medium text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                    Sin límite de inscriptos. Podés cerrar la inscripción manualmente cuando lo necesites.
                  </p>
                </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="px-4 py-3.5 md:px-6 md:py-4 border-t border-slate-100 flex gap-3 justify-end">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-slate-800 text-xl md:text-2xl font-bold">Torneos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gestión y organización de torneos del club</p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-brand-500/20 w-fit"
        >
          <Plus size={16} />
          Nuevo torneo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 md:px-5 md:py-4 flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
              <Icon size={18} className={color} />
            </div>
            <div className="min-w-0">
              <p className="text-slate-800 text-xl md:text-2xl font-bold leading-none truncate">{value}</p>
              <p className="text-slate-400 text-xs mt-1 truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => {
            const count = torneos.filter(t => (TAB_ESTADOS[key] ?? []).includes(t.estado)).length
            return (
              <button
                key={key}
                onClick={() => setTabActiva(key)}
                className={`flex items-center gap-2 px-3 md:px-6 py-3.5 md:py-4 text-sm font-medium transition-all border-b-2 -mb-px shrink-0 whitespace-nowrap ${
                  tabActiva === key
                    ? 'border-brand-500 text-brand-600 bg-brand-500/3'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold ${
                  tabActiva === key ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div className="p-4 md:p-5">
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
              <table className="w-full min-w-[560px] text-sm">
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
