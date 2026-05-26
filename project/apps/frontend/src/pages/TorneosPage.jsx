import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Trophy, Plus, Users, X, ChevronRight, Calendar, Medal,
  CheckCircle, Clock, Archive, ToggleLeft, ToggleRight, Infinity,
  Lock, Pencil, Trash2, AlertTriangle, Bell, UserCheck, Camera, Download,
} from 'lucide-react'
import FlyerTorneo from '../components/FlyerTorneo'
import Toast from '../components/ui/Toast'
import { FLYER_TEMPLATES } from '../lib/flyerTemplates'
import { GENEROS, FORMATOS } from '../features/admin/torneosMockData'
import InfoBlock from '../components/InfoBlock'
import useTorneosStore from '../store/torneosStore'
import useClubStore from '../store/clubStore'
import useAuthStore from '../store/authStore'
import useNotificacionesStore from '../store/notificacionesStore'
import { api } from '../lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtFecha = (iso) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })

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
  Ambos:     { color: 'text-teal-600 bg-teal-50 border-teal-200' },
}

const GENERO_CAT_OPTS = [
  { key: 'M',     label: 'Masc.',   color: 'border-sky-400 bg-sky-50 text-sky-700' },
  { key: 'F',     label: 'Fem.',    color: 'border-pink-400 bg-pink-50 text-pink-700' },
  { key: 'Mixto', label: 'Mixto',   color: 'border-violet-400 bg-violet-50 text-violet-700' },
]

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

const VariantRow = ({ v, onCheck, selected, editando, editVal, onSetEditando, onSetEditVal, onConfirmarEdicion, onDelete }) => {
  const sel  = selected
  const isEd = editando === v
  return (
    <div className="flex items-center gap-1.5 pl-6">
      {isEd ? (
        <>
          <input
            autoFocus
            type="text"
            value={editVal}
            onChange={(e) => onSetEditVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirmarEdicion(v); if (e.key === 'Escape') onSetEditando(null) }}
            className="flex-1 min-w-0 text-xs bg-white border border-brand-400 rounded-lg px-2 py-0.5 outline-none"
          />
          <button type="button" onClick={() => onConfirmarEdicion(v)} className="text-[10px] text-brand-500 font-semibold hover:text-brand-700">✓</button>
          <button type="button" onClick={() => onSetEditando(null)} className="text-[10px] text-slate-400 hover:text-slate-600">✕</button>
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
            onClick={() => { onSetEditando(v); onSetEditVal(v) }}
            className="text-[10px] text-slate-300 hover:text-brand-400 transition-colors px-0.5"
          ><Pencil size={11} /></button>
          <button type="button" title="Eliminar"
            onClick={() => onDelete(v)}
            className="text-[10px] text-slate-300 hover:text-red-400 transition-colors px-0.5"
          ><Trash2 size={11} /></button>
        </>
      )}
    </div>
  )
}

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
                {varDisp.map((v) => (
                  <VariantRow
                    key={v} v={v}
                    selected={value.includes(v)}
                    editando={editando} editVal={editVal}
                    onCheck={() => onToggle(v)}
                    onSetEditando={setEditando} onSetEditVal={setEditVal}
                    onConfirmarEdicion={confirmarEdicion}
                    onDelete={(cat) => { onDelete(cat); if (value.includes(cat)) onToggle(cat) }}
                  />
                ))}
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
        {otrasHistoricas.map((cat) => (
          <VariantRow
            key={cat} v={cat}
            selected={value.includes(cat)}
            editando={editando} editVal={editVal}
            onCheck={() => onToggle(cat)}
            onSetEditando={setEditando} onSetEditVal={setEditVal}
            onConfirmarEdicion={confirmarEdicion}
            onDelete={(c) => { onDelete(c); if (value.includes(c)) onToggle(c) }}
          />
        ))}
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
  cupoEsperaPorCategoria: {},
  generoPorCategoria: {},
  formato: FORMATOS[0],
  canchasAsignadas: [],
  fechaInicio: '',
  fechaFin: '',
  fechaLimiteInscripcion: '',
  diaInicioEliminatoria: '',
  horaInicioEliminatoria: '',
  descripcion: '',
  // flyer
  premioPrimero: '',
  premioSegundo: '',
  premioSemifinal: '',
  premioExtra: '',
  whatsapp: '',
  servicios: [],
  imagenFondo: '',
}

const SERVICIOS_OPCIONES = [
  { id: 'indoor',     label: 'Canchas indoor' },
  { id: 'bar',        label: 'Bar y comidas' },
  { id: 'parking',    label: 'Estacionamiento' },
  { id: 'cupos',      label: 'Cupos limitados' },
  { id: 'vestuarios', label: 'Vestuarios' },
  { id: 'wifi',       label: 'WiFi' },
]

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

const MAX_CATS = 3

const catGenLabel = (torneo, cat, short = true) => {
  if (torneo.genero !== 'Ambos') return null
  const gen = ((torneo.generoPorCategoria ?? {})[cat]) ?? 'M'
  if (short) return gen === 'M' ? 'Masc.' : gen === 'F' ? 'Fem.' : 'Mixto'
  return gen === 'M' ? 'Masculino' : gen === 'F' ? 'Femenino' : 'Mixto'
}

const NEUTRAL_COLOR = { chip: 'text-slate-500 bg-slate-100', bar: 'bg-brand-500', label: 'text-slate-600' }

const catColor = (torneo, cat) => {
  if (torneo.genero !== 'Ambos') return NEUTRAL_COLOR
  const gen = ((torneo.generoPorCategoria ?? {})[cat]) ?? 'M'
  if (gen === 'F')     return { chip: 'text-pink-600 bg-pink-50 border border-pink-200',       bar: 'bg-pink-400',   label: 'text-pink-500' }
  if (gen === 'Mixto') return { chip: 'text-violet-600 bg-violet-50 border border-violet-200', bar: 'bg-violet-400', label: 'text-violet-500' }
  return                      { chip: 'text-sky-600 bg-sky-50 border border-sky-200',          bar: 'bg-sky-400',    label: 'text-sky-500' }
}

const TorneoCard = ({ torneo, onVerDetalle, onToggleEstado, onEditar, onEliminar, onFlyer }) => {
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const [catsExpanded, setCatsExpanded] = useState(false)
  const confirmados  = torneo.inscriptos.filter((i) => i.estado !== 'espera')
  const enEspera     = torneo.inscriptos.filter((i) => i.estado === 'espera')
  const puedeToggle          = ['draft', 'open', 'closed'].includes(torneo.estado)
  const puedeEditarEliminar  = ['draft', 'open', 'closed'].includes(torneo.estado)
  const catsToShow   = catsExpanded ? torneo.categorias : torneo.categorias.slice(0, MAX_CATS)
  const hasMoreCats  = torneo.categorias.length > MAX_CATS

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

        {/* Cierre de inscripciones */}
        {torneo.fechaLimiteInscripcion && torneo.estado === 'open' && (() => {
          const dias = Math.ceil((new Date(torneo.fechaLimiteInscripcion + 'T23:59:59') - new Date()) / 86400000)
          if (dias <= 0) return null
          const critico = dias <= 2
          const urgente = dias <= 5
          return (
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
              critico ? 'bg-red-50 border-red-200' :
              urgente ? 'bg-amber-50 border-amber-200' :
                        'bg-yellow-50 border-yellow-200'
            }`}>
              <span className="relative flex items-center justify-center shrink-0">
                {critico && (
                  <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75 animate-ping" />
                )}
                <span className={`relative w-2 h-2 rounded-full ${
                  critico ? 'bg-red-500' : urgente ? 'bg-amber-400 animate-pulse' : 'bg-yellow-400 animate-pulse'
                }`} />
              </span>
              <span className={`text-[10px] font-semibold leading-tight ${
                critico ? 'text-red-600' : urgente ? 'text-amber-600' : 'text-yellow-700'
              }`}>
                Cierre de inscripciones · {fmtFecha(torneo.fechaLimiteInscripcion)}
                {critico
                  ? <span className="ml-1 font-bold">— {dias} día{dias !== 1 ? 's' : ''}</span>
                  : urgente
                    ? <span className="ml-1">— {dias} días</span>
                    : null
                }
              </span>
            </div>
          )
        })()}

        {/* Categorías chips */}
        <div className="flex flex-wrap gap-1">
          {catsToShow.map((cat) => {
            const gl = catGenLabel(torneo, cat)
            const cc = catColor(torneo, cat)
            return (
              <span key={cat} className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${cc.chip}`}>
                {cat}{gl ? ` · ${gl}` : ''}
              </span>
            )
          })}
          {hasMoreCats && !catsExpanded && (
            <button
              onClick={(e) => { e.stopPropagation(); setCatsExpanded(true) }}
              className="text-[10px] font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded-md hover:bg-brand-100 transition-colors"
            >
              +{torneo.categorias.length - MAX_CATS} más
            </button>
          )}
        </div>

        {/* Inscriptos por categoría */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Inscriptos</span>
          {catsToShow.map((cat) => {
            const conf      = torneo.inscriptos.filter((i) => i.categoria === cat && i.estado !== 'espera').length
            const espCat    = torneo.inscriptos.filter((i) => i.categoria === cat && i.estado === 'espera').length
            const cupoCat   = torneo.cupoLibre ? null : (torneo.cuposPorCategoria?.[cat] ?? 0)
            const esperaCat = (torneo.cupoEsperaPorCategoria ?? {})[cat] ?? 0
            const pctCat    = cupoCat ? Math.round((conf / cupoCat) * 100) : 0
            const lleno     = cupoCat !== null && conf >= cupoCat
            const gl        = catGenLabel(torneo, cat)
            const cc        = catColor(torneo, cat)
            return (
              <div key={cat} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-medium truncate min-w-0 ${cc.label}`}>
                    {cat}{gl ? ` · ${gl}` : ''}
                  </span>
                  {cupoCat !== null ? (
                    <span className={`text-[11px] font-semibold tabular-nums shrink-0 ${lleno ? 'text-red-500' : 'text-slate-600'}`}>
                      {conf}<span className="text-slate-400 font-normal">/{cupoCat}</span>
                    </span>
                  ) : (
                    <span className={`text-[11px] font-semibold shrink-0 flex items-center gap-0.5 ${cc.label}`}>
                      <Infinity size={10} /> {conf}
                    </span>
                  )}
                </div>
                {cupoCat !== null && (
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${lleno ? 'bg-red-400' : cc.bar}`}
                      style={{ width: `${Math.min(pctCat, 100)}%` }} />
                  </div>
                )}
                {espCat > 0 && esperaCat > 0 && (
                  <p className="text-[10px] text-amber-500">{espCat}/{esperaCat} en espera</p>
                )}
              </div>
            )
          })}
          {hasMoreCats && (
            <button
              onClick={(e) => { e.stopPropagation(); setCatsExpanded((v) => !v) }}
              className="text-[11px] text-brand-500 hover:text-brand-700 font-medium text-left"
            >
              {catsExpanded ? 'Ver menos ↑' : `+${torneo.categorias.length - MAX_CATS} categorías más ↓`}
            </button>
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
            <button onClick={(e) => { e.stopPropagation(); onEliminar(torneo.id) }} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg transition-all">
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Users size={11} />
          {confirmados.length} inscripto{confirmados.length !== 1 ? 's' : ''}
          {enEspera.length > 0 && (
            <span className="text-amber-500 ml-1">· {enEspera.length} en espera</span>
          )}
        </span>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onFlyer(torneo)}
            title="Generar flyer"
            className="text-slate-300 hover:text-violet-500 hover:bg-violet-50 p-1.5 rounded-lg transition-all"
          >
            <Camera size={13} />
          </button>
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
    cupoEsperaPorCategoria: Object.fromEntries(
      (torneoEditar.categorias ?? []).map((cat) => [
        cat,
        (torneoEditar.cupoEsperaPorCategoria ?? {})[cat] ?? 0,
      ])
    ),
    generoPorCategoria: torneoEditar.generoPorCategoria ?? {},
    formato: torneoEditar.formato,
    canchasAsignadas: torneoEditar.canchasAsignadas ?? [],
    fechaInicio: torneoEditar.fechaInicio,
    fechaFin: torneoEditar.fechaFin,
    fechaLimiteInscripcion: torneoEditar.fechaLimiteInscripcion ?? '',
    diaInicioEliminatoria: torneoEditar.diaInicioEliminatoria ?? '',
    horaInicioEliminatoria: torneoEditar.horaInicioEliminatoria ?? '',
    descripcion: torneoEditar.descripcion ?? '',
    premioPrimero: torneoEditar.premioPrimero ?? '',
    premioSegundo: torneoEditar.premioSegundo ?? '',
    premioSemifinal: torneoEditar.premioSemifinal ?? '',
    premioExtra: torneoEditar.premioExtra ?? '',
    whatsapp: torneoEditar.whatsapp ?? '',
    servicios: torneoEditar.servicios ?? [],
    imagenFondo: torneoEditar.imagenFondo ?? '',
  } : EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState('datos')
  const formScrollRef = useRef(null)
  const [bloqueoEspecifico, setBloqueoEspecifico] = useState(
    () => (torneoEditar?.canchasAsignadas ?? []).length > 0
  )

  const toggleBloqueo = () => {
    if (bloqueoEspecifico) set('canchasAsignadas', [])
    setBloqueoEspecifico((p) => !p)
  }

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const toggleCategoria = (cat) => {
    setForm((prev) => {
      const yaEsta = prev.categorias.includes(cat)
      const categorias = yaEsta
        ? prev.categorias.filter(c => c !== cat)
        : [...prev.categorias, cat]
      const cuposPorCategoria = { ...prev.cuposPorCategoria }
      const cupoEsperaPorCategoria = { ...prev.cupoEsperaPorCategoria }
      if (yaEsta) {
        delete cuposPorCategoria[cat]
        delete cupoEsperaPorCategoria[cat]
      } else {
        if (!(cat in cupoEsperaPorCategoria)) cupoEsperaPorCategoria[cat] = 0
      }
      return { ...prev, categorias, cuposPorCategoria, cupoEsperaPorCategoria }
    })
  }

  const setGeneroCategoria = (cat, valor) => {
    setForm((prev) => ({
      ...prev,
      generoPorCategoria: { ...prev.generoPorCategoria, [cat]: valor },
    }))
  }

  const setCupoEsperaCategoria = (cat, valor) => {
    setForm((prev) => ({
      ...prev,
      cupoEsperaPorCategoria: {
        ...prev.cupoEsperaPorCategoria,
        [cat]: valor === '' ? '' : Math.max(0, Number(valor)),
      },
    }))
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
    if (Object.keys(e).length) {
      setErrors(e)
      setTimeout(() => {
        if (!formScrollRef.current) return
        const firstKey = Object.keys(e)[0]
        const el = formScrollRef.current.querySelector(`[data-field="${firstKey}"]`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 30)
      return
    }
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

        {/* Tab bar */}
        <div className="flex border-b border-slate-100 px-4 md:px-6 shrink-0">
          {[{ key: 'datos', label: 'Datos del torneo' }, { key: 'flyer', label: 'Flyer' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                activeTab === key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Form — Datos */}
        {activeTab === 'datos' && (
        <div ref={formScrollRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4 md:gap-5">

          {/* Nombre */}
          <div data-field="nombre">
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
          <div data-field="categorias">
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
            <InfoBlock label="¿Cómo funcionan las categorías?">
              <p>Cada categoría representa un nivel de juego. Las parejas se inscriben en la categoría que corresponde a su nivel, y cada una tiene su propio cuadro de partidos separado.</p>
              <p><span className="font-semibold text-slate-700">Numeración:</span>{' '}1° categoría es el nivel más alto. A mayor número, menor nivel. Podés agregar variantes como "4° Categoría B" o "4° Categoría +35" para segmentar más.</p>
              <p><span className="font-semibold text-slate-700">Múltiples categorías:</span>{' '}un mismo torneo puede tener varias. Cada una tendrá su propio cupo, zonas y cuadro de llaves independientes.</p>
            </InfoBlock>
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

          {/* Canchas — toggle bloqueo específico */}
          <div>
            <button
              type="button"
              onClick={toggleBloqueo}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-2.5 text-left">
                <Lock size={14} className={bloqueoEspecifico ? 'text-brand-500' : 'text-slate-400'} />
                <div>
                  <p className="text-sm font-medium text-slate-700">Bloquear canchas específicas</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {bloqueoEspecifico
                      ? form.canchasAsignadas.length > 0
                        ? `${form.canchasAsignadas.length} cancha${form.canchasAsignadas.length !== 1 ? 's' : ''} seleccionada${form.canchasAsignadas.length !== 1 ? 's' : ''}`
                        : 'Seleccioná las canchas a bloquear'
                      : 'Todas las canchas quedan bloqueadas'}
                  </p>
                </div>
              </div>
              {/* Toggle pill */}
              <div className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${bloqueoEspecifico ? 'bg-brand-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${bloqueoEspecifico ? 'left-5' : 'left-1'}`} />
              </div>
            </button>

            <InfoBlock label="¿Cómo funciona el bloqueo?">
              <p><span className="font-semibold text-slate-700">Toggle apagado:</span>{' '}todas las canchas del club quedan bloqueadas para reservas mientras dura el torneo. Ningún jugador puede reservar.</p>
              <p><span className="font-semibold text-slate-700">Toggle encendido:</span>{' '}solo las canchas que seleccionás quedan bloqueadas. Las demás siguen disponibles para reservas normales.</p>
              <p className="text-slate-400 border-t border-sky-100 pt-1.5"><span className="font-medium text-slate-500">Ejemplo:</span> el torneo usa Cancha 1 y Cancha 2 → activás el toggle, seleccionás esas dos, y Cancha 3 queda libre para que otros jugadores reserven.</p>
            </InfoBlock>

            {bloqueoEspecifico && (
              <div className="mt-2 flex flex-col gap-2">
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
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        )}
                      </span>
                      {cancha.nombre}
                    </button>
                  )
                })}
                {form.canchasAsignadas.length === 0 && (
                  <p className="text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Seleccioná al menos una cancha, o desactivá el toggle para bloquear todas.
                  </p>
                )}
              </div>
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
                    <div key={cat} data-field={`cupo_${cat}`} className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-3">
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
                      {form.genero === 'Ambos' && (
                        <div className="flex gap-1.5 pt-0.5">
                          {GENERO_CAT_OPTS.map((opt) => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setGeneroCategoria(cat, opt.key)}
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border transition-all ${
                                (form.generoPorCategoria[cat] ?? 'M') === opt.key
                                  ? opt.color
                                  : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {form.categorias.some(cat => errors[`cupo_${cat}`]) && (
                    <p className="text-red-500 text-xs">Todos los cupos deben ser mínimo 2</p>
                  )}
                  {/* Lista de espera — inputs por categoría */}
                  <div className="flex flex-col gap-1.5 mt-1">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide px-0.5">Lista de espera</p>
                    {form.categorias.map((cat) => (
                      <div key={cat} className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <span className="text-sm text-amber-700 flex-1">{cat}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={form.cupoEsperaPorCategoria[cat] ?? 0}
                            onChange={(e) => setCupoEsperaCategoria(cat, e.target.value)}
                            className="w-16 text-center bg-white border border-amber-200 rounded-lg px-2 py-1 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all"
                          />
                          <span className="text-xs text-amber-600 whitespace-nowrap">parejas</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <InfoBlock label="¿Cómo funciona la lista de espera?">
                    <p>Cuando el cupo de una categoría se completa, las parejas siguientes quedan en lista de espera en lugar de ser rechazadas.</p>
                    <p><span className="font-semibold text-slate-700">Promoción automática:</span>{' '}si una pareja confirmada se baja, la primera en espera pasa automáticamente a confirmada y recibe una notificación.</p>
                    <p><span className="font-semibold text-slate-700">Por categoría:</span>{' '}cada categoría tiene su propio cupo de espera. Podés poner 0 si no querés lista de espera para esa categoría.</p>
                  </InfoBlock>
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
            <InfoBlock label="¿Qué formato elegir?">
              <p><span className="font-semibold text-slate-700">Round Robin:</span>{' '}todas las parejas juegan contra todas, sin fase eliminatoria. Gana quien acumula más puntos al final. Formato ideal cuando el objetivo es que todos jueguen la mayor cantidad de partidos posible.</p>
              <p><span className="font-semibold text-slate-700">Eliminación directa:</span>{' '}las parejas juegan entre sí desde el inicio. El que pierde queda eliminado. Ideal para torneos cortos o con pocas parejas.</p>
              <p><span className="font-semibold text-slate-700">Fase de grupos + Eliminación:</span>{' '}primero se forman zonas donde todas las parejas juegan entre sí. Los mejores de cada zona clasifican a la fase eliminatoria. Más partidos garantizados por pareja.</p>
            </InfoBlock>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-field="fechaInicio">
              <label className="text-xs font-medium text-slate-600 block mb-1">Fecha de inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => set('fechaInicio', e.target.value)}
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all ${errors.fechaInicio ? 'border-red-400' : 'border-slate-200'}`}
              />
              {errors.fechaInicio && <p className="text-red-500 text-xs mt-1">{errors.fechaInicio}</p>}
            </div>
            <div data-field="fechaFin">
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
            {errors.fechaLimiteInscripcion && (
              <p className="text-red-500 text-xs mt-1">{errors.fechaLimiteInscripcion}</p>
            )}
            <InfoBlock label="¿Para qué sirve esta fecha?">
              <p>Es la fecha hasta la cual los jugadores pueden inscribirse al torneo. Pasada esa fecha, la inscripción se cierra automáticamente.</p>
              <p><span className="font-semibold text-slate-700">¿Por qué ponerla antes del inicio?</span>{' '}Necesitás tiempo para armar las zonas y el fixture una vez que sabés quiénes están anotados.</p>
              <p className="text-slate-400 border-t border-sky-100 pt-1.5"><span className="font-medium text-slate-500">Ejemplo:</span> torneo empieza el 15/06 → poné límite el 10/06, así tenés 5 días para organizar las zonas y comunicar los horarios.</p>
            </InfoBlock>
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

        )}

        {/* Form — Flyer */}
        {activeTab === 'flyer' && (
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 flex flex-col gap-4 md:gap-5">

            {/* Foto de fondo */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Foto de fondo <span className="text-slate-400">(opcional)</span>
              </label>
              <input
                type="url"
                value={form.imagenFondo}
                onChange={(e) => set('imagenFondo', e.target.value)}
                placeholder="https://... (URL de imagen: cancha, jugador...)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
              {form.imagenFondo && (
                <div className="mt-2 w-full h-20 rounded-lg overflow-hidden border border-slate-200">
                  <img src={form.imagenFondo} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">Se aplica como fondo oscurecido. Recomendado: foto de cancha o jugador.</p>
            </div>

            {/* Premios */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Premios <span className="text-slate-400">(opcional)</span></label>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'premioPrimero',   label: '1° Puesto',  placeholder: 'Ej: $50.000' },
                  { key: 'premioSegundo',   label: '2° Puesto',  placeholder: 'Ej: $30.000' },
                  { key: 'premioSemifinal', label: 'Semifinal',  placeholder: 'Ej: $15.000' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <span className="text-sm text-slate-600 w-24 shrink-0">{label}</span>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-300"
                    />
                  </div>
                ))}
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <label className="text-xs text-slate-400 block mb-1">Texto adicional</label>
                  <input
                    type="text"
                    value={form.premioExtra}
                    onChange={(e) => set('premioExtra', e.target.value)}
                    placeholder="Ej: Medallas para todos los participantes"
                    className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">WhatsApp de inscripciones <span className="text-slate-400">(opcional)</span></label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="Ej: +54 9 11 1234-5678"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
              />
            </div>

            {/* Servicios */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">Servicios disponibles <span className="text-slate-400">(opcional)</span></label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICIOS_OPCIONES.map(({ id, label }) => {
                  const activo = form.servicios.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => set('servicios', activo
                        ? form.servicios.filter((s) => s !== id)
                        : [...form.servicios, id]
                      )}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                        activo
                          ? 'border-brand-500 bg-brand-500/8 text-brand-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        activo ? 'bg-brand-500 border-brand-500' : 'border-slate-300 bg-white'
                      }`}>
                        {activo && (
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5">
                            <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        )}
                      </span>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              Guardá el torneo y luego usá el botón <span className="font-medium text-slate-500">Generar flyer</span> en la card para ver la vista previa y descargar el PNG.
            </p>

          </div>
        )}

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

// ── Modal flyer ──────────────────────────────────────────────────────────────

const ModalFlyer = ({ torneo, club, onClose, onDescargado }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('navy')
  const [accentColor, setAccentColor] = useState(FLYER_TEMPLATES[0].defaultAccent)
  const [busy, setBusy] = useState(false)
  const [busyMsg, setBusyMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSelectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id)
    setAccentColor(tpl.defaultAccent)
  }

  const handleDescargar = async () => {
    setBusy(true)
    setErrorMsg('')
    setBusyMsg('Cargando fuentes…')
    try {
      const { generateFlyer } = await import('../lib/generateFlyer')
      setBusyMsg('Generando PNG…')
      const pngDataUrl = await generateFlyer({ torneo, club, template: selectedTemplate, accentColor })
      const a = document.createElement('a')
      a.href     = pngDataUrl
      a.download = `flyer-${torneo.nombre.replace(/\s+/g, '-')}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      onDescargado?.()
    } catch (err) {
      console.error('generateFlyer error:', err)
      setErrorMsg(`Error: ${err.message}`)
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-slate-800 font-bold text-base">Vista previa del flyer</h2>
            <p className="text-slate-400 text-xs mt-0.5">Exporta PNG 1080 × 1080 px · Generado con Satori</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Preview CSS — inmediato, solo para mostrar */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-5 bg-slate-100">
          <div style={{ width: 351, height: 351, overflow: 'hidden', borderRadius: 12, flexShrink: 0, boxShadow: '0 20px 50px -10px rgba(0,0,0,0.45)' }}>
            <div style={{ transform: 'scale(0.65)', transformOrigin: 'top left', width: 540, height: 540 }}>
              <FlyerTorneo torneo={torneo} club={club} template={selectedTemplate} accentColor={accentColor} />
            </div>
          </div>
        </div>

        {/* Selector de templates */}
        <div className="px-4 pt-3 pb-2 border-t border-slate-100 shrink-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Diseño</p>
          <div className="flex gap-2">
            {FLYER_TEMPLATES.map((tpl) => {
              const active = selectedTemplate === tpl.id
              return (
                <button
                  key={tpl.id}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`flex-1 rounded-xl overflow-hidden border-2 transition-all ${active ? 'border-brand-500 ring-2 ring-brand-200' : 'border-transparent hover:border-slate-300'}`}
                >
                  {/* Mini preview color */}
                  <div style={{ height: 36, background: tpl.preview.bg, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${tpl.preview.bar[0]}, ${tpl.preview.bar[1]})` }} />
                  </div>
                  <div className="bg-slate-50 py-1">
                    <p className={`text-xs font-semibold text-center ${active ? 'text-brand-600' : 'text-slate-600'}`}>{tpl.name}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Color accent picker */}
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Color acento</p>
            <label className="relative cursor-pointer flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg border-2 border-white shadow-md ring-1 ring-slate-200"
                style={{ background: accentColor }}
              />
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="absolute opacity-0 w-0 h-0"
              />
              <span className="text-xs text-slate-400 font-mono">{accentColor}</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3.5 border-t border-slate-100 flex items-center gap-3 justify-end shrink-0">
          {busy && <span className="text-xs text-slate-400 mr-auto">{busyMsg}</span>}
          {errorMsg && <span className="text-xs text-red-500 mr-auto">{errorMsg}</span>}
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            Cerrar
          </button>
          <button
            onClick={handleDescargar}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-all disabled:opacity-60"
          >
            <Download size={15} />
            {busy ? '…' : 'Descargar PNG'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Mapper backend → store ────────────────────────────────────────────────────

const PERSONALIZACION_DEFAULTS = {
  colorAcento: null, estiloCardFixture: 'oscura', colorCardFixture: null,
  estiloCardGrupos: 'oscura', colorCardGrupos: null, colorCard: null,
  estiloCard: 'oscura', fontScale: 'normal', imagenFondoDraw: null,
  imagenFondoBracket: null, imagenFondoFixture: null, imagenFondoGrupos: null,
  imagenHeaderGrupos: null, colorTextoCardGrupos: null, sponsors: [],
  sponsorScale: 'normal', bannerLateral1Fixture: null, bannerLateral2Fixture: null,
  bannerLateral1Grupos: null, bannerLateral2Grupos: null, drawMostrarClub: true,
  drawTitulo: 'Main Draw', drawMostrarNombre: true, drawMostrarFechas: true,
  drawMostrarCategorias: true, drawColorTitulo: null, bracketColores: {}, bracketColorCards: {},
}

const mapBackendTorneo = (t) => ({
  ...PERSONALIZACION_DEFAULTS,
  ...(t.personalizacion ?? {}),
  id: t.id,
  nombre: t.nombre,
  categorias: t.categorias ?? [],
  formato: t.formato,
  genero: t.genero,
  estado: t.estado,
  cupoLibre: t.cupoLibre,
  cuposPorCategoria: t.cuposPorCategoria ?? {},
  cupoEsperaPorCategoria: t.cupoEsperaPorCategoria ?? {},
  generoPorCategoria: t.generoPorCategoria ?? {},
  canchasAsignadas: t.canchasAsignadas ?? [],
  fechaInicio: t.fechaInicio,
  fechaFin: t.fechaFin,
  fechaLimiteInscripcion: t.fechaLimiteInscripcion,
  diaInicioEliminatoria: t.diaInicioEliminatoria,
  horaInicioEliminatoria: t.horaInicioEliminatoria,
  descripcion: t.descripcion ?? '',
  premioPrimero:  t.personalizacion?.premioPrimero  ?? '',
  premioSegundo:  t.personalizacion?.premioSegundo  ?? '',
  premioSemifinal: t.personalizacion?.premioSemifinal ?? '',
  premioExtra:    t.personalizacion?.premioExtra    ?? '',
  whatsapp:       t.personalizacion?.whatsapp       ?? '',
  servicios:      t.personalizacion?.servicios      ?? [],
  imagenFondo:    t.personalizacion?.imagenFondo    ?? '',
  inscriptos: (t.parejas ?? []).map((p) => ({
    id: p.id,
    jugador1: p.jugador1,
    jugador2: p.jugador2,
    jugador1Dni: p.jugador1Dni,
    jugador2Dni: p.jugador2Dni,
    jugador1Id: p.jugador1Id ?? null,
    jugador2Id: p.jugador2Id ?? null,
    sinCompanero: p.sinCompanero ?? false,
    estado: p.estado ?? 'inscripto',
    categoria: p.categoria,
    fecha: p.fecha,
    disponibilidad: p.disponibilidad ?? [],
    prefiereMismoDia: p.prefiereMismoDia ?? false,
  })),
  grupos: t.grupos ?? null,
  brackets: t.brackets ?? {},
  ganador: t.ganador,
  subcampeon: t.subcampeon,
})

// ── Franja de inscripción vigente ─────────────────────────────────────────────


const TorneoAlertRow = ({ torneo, onVerDetalle }) => {
  const diasRestantes = (() => {
    if (!torneo.fechaLimiteInscripcion) return null
    const diff = Math.ceil(
      (new Date(torneo.fechaLimiteInscripcion + 'T23:59:59') - new Date()) / 86400000
    )
    return diff
  })()

  const confirmados = (torneo.inscriptos ?? []).filter((i) => i.estado !== 'espera')
  const enEspera   = (torneo.inscriptos ?? []).filter((i) => i.estado === 'espera')

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-3">
      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />

      <span className="font-semibold text-slate-700 text-sm truncate max-w-[200px]">
        {torneo.nombre}
      </span>

      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
        Inscripción abierta
      </span>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-sm text-slate-500">
          <span className="font-medium text-slate-700">{confirmados.length}</span> inscriptos
        </span>
        {enEspera.length > 0 && (
          <span className="text-xs text-amber-600 font-medium">{enEspera.length} en espera</span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {diasRestantes != null && (
          <span className={`flex items-center gap-1 text-xs font-medium ${diasRestantes <= 3 ? 'text-red-500' : 'text-amber-600'}`}>
            <AlertTriangle size={12} />
            {diasRestantes <= 0 ? 'Vence hoy' : `${diasRestantes}d para cierre`}
          </span>
        )}
        <button
          type="button"
          onClick={() => onVerDetalle(torneo)}
          className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
        >
          Ver inscriptos <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const TorneosPage = () => {
  const { torneos, setTorneos, addTorneoFromApi, addTorneo, updateTorneoFromApi, setEstado, deleteTorneo, updateTorneo } = useTorneosStore()
  const token  = useAuthStore((s) => s.token)
  const clubId = useAuthStore((s) => s.user?.club?.id)
  const club   = useClubStore((s) => s.club)
  const { notificaciones, eliminarNotificacion } = useNotificacionesStore()
  const notifTorneosNoLeidas = notificaciones.filter(
    (n) => (n.tipo === 'inscripcion_torneo' || n.tipo === 'baja_torneo' || n.tipo === 'actualizacion_torneo' || n.tipo === 'completacion_torneo') && !n.leida
  )
  const sinLeerInscripciones = notifTorneosNoLeidas.length

  useEffect(() => {
    if (!clubId) return
    api.get(`/torneos?clubId=${clubId}`)
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return
        const mapped = data.map(mapBackendTorneo)
        setTorneos(mapped)
        const hayEnCurso = mapped.some((t) => t.estado === 'in_progress')
        setTabActiva(hayEnCurso ? 'en_curso' : 'proximos')
      })
      .catch(() => {})
  }, [clubId])

  const navigate = useNavigate()
  const [tabActiva, setTabActiva] = useState('proximos')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [torneoEditar, setTorneoEditar] = useState(null)
  const [busquedaFin, setBusquedaFin] = useState('')
  const [añoFin, setAñoFin] = useState('')
  const [toastNuevoTorneo, setToastNuevoTorneo] = useState(null)
  const [toastFlyer, setToastFlyer]             = useState(false)
  const [toastEdicion, setToastEdicion]         = useState(false)
  const [toastEliminado, setToastEliminado]     = useState(false)
  const [toastEstado, setToastEstado]           = useState(null)   // { estado: 'open'|'closed'|... }
  const [flyerTorneo, setFlyerTorneo]           = useState(null)

  useEffect(() => {
    if (!toastNuevoTorneo) return
    const t = setTimeout(() => setToastNuevoTorneo(null), 4000)
    return () => clearTimeout(t)
  }, [toastNuevoTorneo])

  useEffect(() => {
    if (!toastFlyer) return
    const t = setTimeout(() => setToastFlyer(false), 3500)
    return () => clearTimeout(t)
  }, [toastFlyer])

  useEffect(() => {
    if (!toastEdicion) return
    const t = setTimeout(() => setToastEdicion(false), 3500)
    return () => clearTimeout(t)
  }, [toastEdicion])

  useEffect(() => {
    if (!toastEliminado) return
    const t = setTimeout(() => setToastEliminado(false), 3500)
    return () => clearTimeout(t)
  }, [toastEliminado])

  useEffect(() => {
    if (!toastEstado) return
    const t = setTimeout(() => setToastEstado(null), 3500)
    return () => clearTimeout(t)
  }, [toastEstado])

  const tabs = [
    { key: 'en_curso',    label: 'En curso',    icon: CheckCircle },
    { key: 'proximos',    label: 'Próximos',    icon: Clock },
    { key: 'finalizados', label: 'Finalizados', icon: Archive },
  ]

  const torneosTab = torneos.filter((t) => (TAB_ESTADOS[tabActiva] ?? []).includes(t.estado))

  const añosFinalizados = useMemo(() => {
    const años = new Set(
      torneos.filter((t) => t.estado === 'finished').map((t) => new Date(t.fechaFin + 'T12:00:00').getFullYear())
    )
    return [...años].sort((a, b) => b - a)
  }, [torneos])

  const finalizadosFiltrados = useMemo(() => {
    const q = busquedaFin.toLowerCase().trim()
    return torneosTab.filter((t) => {
      if (añoFin && String(new Date(t.fechaFin + 'T12:00:00').getFullYear()) !== añoFin) return false
      if (!q) return true
      const enNombre     = t.nombre.toLowerCase().includes(q)
      const enCategorias = t.categorias.some((c) => c.toLowerCase().includes(q))
      const enJugadores  = t.inscriptos.some(
        (i) => i.jugador1?.toLowerCase().includes(q) || i.jugador2?.toLowerCase().includes(q)
      )
      return enNombre || enCategorias || enJugadores
    })
  }, [torneosTab, busquedaFin, añoFin])

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}
  const isBackend  = (id) => typeof id === 'string'

  const handleToggleEstado = async (id) => {
    const torneo = torneos.find((t) => t.id === id)
    if (!torneo) return
    const nuevoEstado = toggleEstado(torneo.estado)
    if (isBackend(id)) {
      try { await api.patch(`/torneos/${id}/estado`, { estado: nuevoEstado }, authHeader) } catch { /* fallback local */ }
    }
    setEstado(id, nuevoEstado)
    setToastEstado(nuevoEstado)
  }

  const handleVerDetalle = (torneo) => {
    navigate(`/dashboardAdmin/torneos/${torneo.id}`)
  }

  const flyerFields = (form) => ({
    premioPrimero:        form.premioPrimero        ?? '',
    premioSegundo:        form.premioSegundo        ?? '',
    premioSemifinal:      form.premioSemifinal      ?? '',
    premioExtra:          form.premioExtra          ?? '',
    whatsapp:             form.whatsapp             ?? '',
    servicios:            form.servicios            ?? [],
    imagenFondo:          form.imagenFondo          ?? '',
    // campos frontend-only que el backend puede no devolver
    cupoEsperaPorCategoria: form.cupoEsperaPorCategoria ?? {},
    generoPorCategoria:     form.generoPorCategoria     ?? {},
  })

  const handleNuevoTorneo = async (form) => {
    if (token) {
      try {
        const data = await api.post('/torneos', form, authHeader)
        addTorneoFromApi({ ...mapBackendTorneo(data), ...flyerFields(form) })
        setModalNuevo(false)
        setTabActiva('proximos')
        setToastNuevoTorneo(form.nombre)
        return
      } catch { /* fallback local */ }
    }
    addTorneo(form)
    setModalNuevo(false)
    setTabActiva('proximos')
    setToastNuevoTorneo(form.nombre)
  }

  const handleEditar = (torneo) => setTorneoEditar(torneo)

  const handleGuardarEdicion = async (form) => {
    if (isBackend(torneoEditar.id)) {
      try {
        const data = await api.patch(`/torneos/${torneoEditar.id}`, form, authHeader)
        updateTorneoFromApi({ ...mapBackendTorneo(data), ...flyerFields(form) })
        setTorneoEditar(null)
        setToastEdicion(true)
        return
      } catch { /* fallback local */ }
    }
    updateTorneo(torneoEditar.id, form)
    setTorneoEditar(null)
    setToastEdicion(true)
  }

  const handleEliminar = async (id) => {
    if (isBackend(id)) {
      try { await api.delete(`/torneos/${id}`, authHeader) } catch { /* fallback local */ }
    }
    deleteTorneo(id)
    setToastEliminado(true)
  }

  const torneosAbiertos = torneos.filter((t) => t.estado === 'open')

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

      {/* Franja de inscripción vigente */}
      {torneosAbiertos.map((t) => <TorneoAlertRow key={t.id} torneo={t} onVerDetalle={handleVerDetalle} />)}

      {/* Panel inscripciones recientes */}
      {notifTorneosNoLeidas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Inscripciones recientes</span>
              {sinLeerInscripciones > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-brand-500 text-white leading-none">
                  {sinLeerInscripciones}
                </span>
              )}
            </div>
            {sinLeerInscripciones > 0 && (
              <button
                onClick={() => notifTorneosNoLeidas.forEach((n) => eliminarNotificacion(n.id))}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {notifTorneosNoLeidas.map((n) => {
              const ts = new Date(n.timestamp)
              const ahora = new Date()
              const diffMin = Math.floor((ahora - ts) / 60000)
              const tiempoStr = diffMin < 1 ? 'Ahora' : diffMin < 60 ? `Hace ${diffMin} min` : diffMin < 1440 ? `Hace ${Math.floor(diffMin / 60)}h` : ts.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
              const esBaja = n.tipo === 'baja_torneo'
              const esActualizacion = n.tipo === 'actualizacion_torneo'
              const esCompletacion = n.tipo === 'completacion_torneo'
              const iconColor = esBaja ? 'text-red-500' : esActualizacion ? 'text-sky-500' : esCompletacion ? 'text-violet-500' : n.vaAEspera ? 'text-amber-600' : 'text-emerald-600'
              const iconBg    = esBaja ? 'bg-red-100'  : esActualizacion ? 'bg-sky-100'  : esCompletacion ? 'bg-violet-100' : n.vaAEspera ? 'bg-amber-100'  : 'bg-emerald-100'
              const rowBg     = esBaja ? 'bg-red-50/30' : esActualizacion ? 'bg-sky-50/20' : esCompletacion ? 'bg-violet-50/20' : 'bg-brand-500/[0.02]'
              const prefijo   = esBaja ? 'Baja' : esActualizacion ? 'Actualización' : esCompletacion ? 'Inscripción completada' : null
              const prefijoColor = esBaja ? 'text-red-500' : esCompletacion ? 'text-violet-500' : 'text-sky-500'
              return (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${rowBg}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                    <UserCheck size={13} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium truncate">
                      {prefijo && <span className={`${prefijoColor} font-semibold text-xs`}>{prefijo} · </span>}
                      {n.jugador1} <span className="text-slate-400">/</span> {n.jugador2}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {n.torneoNombre} · {n.categoria}
                      {n.vaAEspera && <span className="ml-1 text-amber-500 font-medium">· Lista de espera</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-300 whitespace-nowrap">{tiempoStr}</span>
                    <button
                      onClick={() => eliminarNotificacion(n.id)}
                      className="w-1.5 h-1.5 rounded-full bg-brand-500 hover:bg-brand-600 transition-colors shrink-0"
                      title="Marcar como leída"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
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
            <div className="flex flex-col gap-4">

              {/* Barra de filtros */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por torneo, categoría o jugador…"
                    value={busquedaFin}
                    onChange={(e) => setBusquedaFin(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  />
                  {busquedaFin && (
                    <button onClick={() => setBusquedaFin('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>
                {añosFinalizados.length > 1 && (
                  <select
                    value={añoFin}
                    onChange={(e) => setAñoFin(e.target.value)}
                    className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
                  >
                    <option value="">Todos los años</option>
                    {añosFinalizados.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                )}
              </div>

              {/* Resultado vacío post-filtro */}
              {finalizadosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                  <Trophy size={36} strokeWidth={1.2} />
                  <p className="text-sm">Sin resultados para esa búsqueda</p>
                  <button onClick={() => { setBusquedaFin(''); setAñoFin('') }} className="text-xs text-brand-500 hover:text-brand-600 mt-1">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
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
                  {finalizadosFiltrados.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium text-slate-800">{t.nombre}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{t.formato}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600 text-xs">
                        <p>{t.categorias.map((cat) => {
                          const gen = t.genero === 'Ambos' ? (t.generoPorCategoria ?? {})[cat] : null
                          return gen ? `${cat} (${gen === 'M' ? 'Masc.' : gen === 'F' ? 'Fem.' : 'Mixto'})` : cat
                        }).join(', ')}</p>
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
              )}
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
                  onFlyer={setFlyerTorneo}
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

      {flyerTorneo && (
        <ModalFlyer
          torneo={flyerTorneo}
          club={club}
          onClose={() => setFlyerTorneo(null)}
          onDescargado={() => setToastFlyer(true)}
        />
      )}

      {/* Toasts */}
      {toastEliminado   && <Toast icon={Trash2}      iconBg="bg-red-500/15 border border-red-500/25"         iconColor="text-red-400"     barColor="bg-red-400/50"     label="Torneo eliminado" message="El torneo fue eliminado"       duration={3500} onClose={() => setToastEliminado(false)}  />}
      {toastEdicion     && <Toast icon={CheckCircle} iconBg="bg-brand-500/15 border border-brand-500/25"     iconColor="text-brand-400"   barColor="bg-brand-400/50"   label="Torneo editado"   message="Datos guardados correctamente"  duration={3500} onClose={() => setToastEdicion(false)}    />}
      {toastFlyer       && <Toast icon={Download}    iconBg="bg-emerald-500/15 border border-emerald-500/25" iconColor="text-emerald-400" barColor="bg-emerald-400/50" label="Flyer listo"       message="PNG descargado correctamente"   duration={3500} onClose={() => setToastFlyer(false)}      />}
      {toastNuevoTorneo && <Toast icon={Trophy}      iconBg="bg-brand-500/15 border border-brand-500/25"     iconColor="text-brand-400"   barColor="bg-brand-400/50"   label="Torneo creado"    message={toastNuevoTorneo}               duration={4000} onClose={() => setToastNuevoTorneo(null)} />}
      {toastEstado === 'open'   && <Toast icon={ToggleRight} iconBg="bg-emerald-500/15 border border-emerald-500/25" iconColor="text-emerald-400" barColor="bg-emerald-400/50" label="Inscripción abierta"  message="Las inscripciones están abiertas"  duration={3500} onClose={() => setToastEstado(null)} />}
      {toastEstado === 'closed' && <Toast icon={Lock}        iconBg="bg-amber-500/15 border border-amber-500/25"     iconColor="text-amber-400"   barColor="bg-amber-400/50"   label="Inscripción cerrada"  message="Las inscripciones están cerradas"  duration={3500} onClose={() => setToastEstado(null)} />}
      {toastEstado === 'draft'  && <Toast icon={ToggleLeft}  iconBg="bg-slate-500/15 border border-slate-500/25"     iconColor="text-slate-400"   barColor="bg-slate-400/50"   label="Volvió a borrador"    message="El torneo volvió a borrador"       duration={3500} onClose={() => setToastEstado(null)} />}

    </div>
  )
}

export default TorneosPage
