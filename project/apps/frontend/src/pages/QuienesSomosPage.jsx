import { useState, useRef } from 'react'
import {
  Building2, Palette, LayoutGrid, BookOpen, Sparkles,
  Upload, Save, CheckCircle, AtSign, Share2,
  Phone, Mail, MapPin, Sun, Moon,
  Pencil, Wifi, WifiOff, ChevronDown, ChevronUp,
  Images, Wrench, Users, HelpCircle, CalendarDays,
  Plus, Trash2, User,
  ShowerHead, Car, GraduationCap, Coffee, Dumbbell,
  Shield, Wind, Utensils, Music,
} from 'lucide-react'
import useClubStore from '../store/clubStore'
import useProfesoresStore from '../store/profesoresStore'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'info',        label: 'Información',      icon: Building2    },
  { key: 'canchas',     label: 'Canchas y Horarios', icon: LayoutGrid  },
  { key: 'historia',    label: 'Historia',          icon: BookOpen    },
  { key: 'hero',        label: 'Hero',              icon: Sparkles    },
  { key: 'galeria',     label: 'Galería',           icon: Images      },
  { key: 'servicios',   label: 'Servicios',         icon: Wrench      },
  { key: 'staff',       label: 'Staff',             icon: Users       },
  { key: 'profesores',  label: 'Profesores',        icon: GraduationCap },
  { key: 'faq',         label: 'FAQ',               icon: HelpCircle  },
  { key: 'apariencia',  label: 'Apariencia',        icon: Palette     },
]

const FONTS = [
  { value: 'Inter',       label: 'Inter',       muestra: 'Aa' },
  { value: 'Roboto',      label: 'Roboto',      muestra: 'Aa' },
  { value: 'Poppins',     label: 'Poppins',     muestra: 'Aa' },
  { value: 'Montserrat',  label: 'Montserrat',  muestra: 'Aa' },
  { value: 'Lato',        label: 'Lato',        muestra: 'Aa' },
]

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const formatPrice = (n) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ─── Sub-componentes ─────────────────────────────────────────────────────────

const Field = ({ label, name, value, onChange, type = 'text', placeholder, icon: Icon, textarea = false }) => (
  <div>
    <label className="block text-slate-500 text-xs font-medium mb-1.5">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
      )}
      {textarea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all resize-none"
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={[
            'w-full border border-slate-200 rounded-xl py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all',
            Icon ? 'pl-9 pr-4' : 'px-4',
          ].join(' ')}
        />
      )}
    </div>
  </div>
)

const SectionCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
    <div className="mb-5 pb-4 border-b border-slate-50">
      <h3 className="text-slate-800 font-semibold">{title}</h3>
      {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
)

const SaveButton = ({ onClick, saved, label = 'Guardar cambios' }) => (
  <div className="flex items-center gap-3 justify-end pt-4">
    {saved && (
      <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
        <CheckCircle size={15} /> Guardado
      </span>
    )}
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-500/20"
    >
      <Save size={15} />
      {label}
    </button>
  </div>
)

// ─── Tab: Información ────────────────────────────────────────────────────────

const TabInfo = ({ club, updateClub, saveClub }) => {
  const [form, setForm] = useState({ ...club })
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(club.logo)
  const fileRef = useRef()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setPreview(ev.target.result)
      setForm((prev) => ({ ...prev, logo: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateClub(form)
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Logo + datos básicos */}
      <SectionCard title="Logo del club" subtitle="Se mostrará en la página principal y en el área de jugadores">
        <div className="flex items-start gap-6">

          {/* Upload zone */}
          <div className="shrink-0">
            <div
              onClick={() => fileRef.current.click()}
              className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
            >
              {preview ? (
                <img src={preview} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <>
                  <Upload size={22} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-slate-300 group-hover:text-emerald-400 text-xs mt-1.5 transition-colors text-center px-2">
                    Subir logo
                  </span>
                </>
              )}
            </div>
            {preview && (
              <button
                onClick={() => { setPreview(null); setForm((p) => ({ ...p, logo: null })) }}
                className="mt-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full text-center"
              >
                Eliminar
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            <p className="text-slate-400 text-xs mt-2 text-center">PNG, SVG o JPG</p>
          </div>

          {/* Nombre + descripción */}
          <div className="flex-1 flex flex-col gap-4">
            <Field label="Nombre del club" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Club de Pádel..." icon={Building2} />
            <Field label="Descripción" name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Breve descripción del club..." textarea />
          </div>
        </div>
      </SectionCard>

      {/* Contacto */}
      <SectionCard title="Datos de contacto">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Libertador 1234" icon={MapPin} />
          <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 11 ..." icon={Phone} />
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="info@club.com" icon={Mail} />
          <Field label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+54 9 11 ..." icon={Phone} />
        </div>
      </SectionCard>

      {/* Redes sociales */}
      <SectionCard title="Redes sociales">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} placeholder="@clubpadel" icon={AtSign} />
          <Field label="Facebook" name="facebook" value={form.facebook} onChange={handleChange} placeholder="clubpadel" icon={Share2} />
        </div>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Apariencia ─────────────────────────────────────────────────────────

const ColorPicker = ({ label, description, value, onChange }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
    <div className="relative shrink-0">
      <div
        className="w-12 h-12 rounded-xl border-2 border-white shadow-md cursor-pointer"
        style={{ backgroundColor: value }}
        onClick={() => document.getElementById(`cp-${label}`).click()}
      />
      <input
        id={`cp-${label}`}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      />
    </div>
    <div className="flex-1">
      <p className="text-slate-700 font-medium text-sm">{label}</p>
      <p className="text-slate-400 text-xs mt-0.5">{description}</p>
    </div>
    <span className="font-mono text-xs text-slate-400 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg">
      {value.toUpperCase()}
    </span>
  </div>
)

const TEMPLATES_META = [
  {
    id: 1,
    nombre: 'Oscuro / Pro',
    desc: 'Split hero, glows, dark cards.',
    preview: (cp) => (
      <div className="w-full h-full bg-[#0d1117] rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 p-3 flex gap-2 items-center">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-1.5 rounded w-3/4 opacity-60" style={{ backgroundColor: cp }} />
            <div className="h-2.5 rounded w-full bg-white" />
            <div className="h-2.5 rounded w-5/6 bg-white/70" />
            <div className="h-1 rounded w-2/3 bg-white/20 mt-1" />
            <div className="h-5 rounded-lg w-24 mt-1" style={{ backgroundColor: cp }} />
          </div>
          <div className="flex flex-col gap-1 w-16">
            <div className="h-10 rounded-lg bg-white/5 border border-white/10" />
            <div className="grid grid-cols-2 gap-1">
              <div className="h-5 rounded bg-white/5" />
              <div className="h-5 rounded bg-white/5" />
            </div>
          </div>
        </div>
        <div className="h-6 bg-black/20 flex items-center gap-1.5 px-3">
          {[1,2,3].map(i => <div key={i} className="h-3 w-10 rounded bg-white/5" />)}
        </div>
      </div>
    ),
  },
  {
    id: 2,
    nombre: 'Impacto',
    desc: 'Fullscreen imagen, texto centrado.',
    preview: (cp) => (
      <div className="w-full h-full bg-[#0a0a0a] rounded-lg overflow-hidden relative flex flex-col items-center justify-center gap-2">
        <div className="absolute inset-0 opacity-30" style={{ background: `linear-gradient(135deg, #0a0a0a 30%, ${cp}40 100%)` }} />
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="h-1 rounded-full w-12 opacity-60" style={{ backgroundColor: cp }} />
          <div className="h-3 rounded w-20 bg-white" />
          <div className="h-3 rounded w-16" style={{ backgroundColor: cp }} />
          <div className="h-1 rounded w-14 bg-white/30 mt-0.5" />
          <div className="h-5 rounded-xl w-20 mt-1" style={{ backgroundColor: cp }} />
        </div>
      </div>
    ),
  },
  {
    id: 3,
    nombre: 'Minimalista',
    desc: 'Fondo claro, tipografía limpia.',
    preview: (cp) => (
      <div className="w-full h-full bg-slate-50 rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 p-3 flex gap-2 items-center">
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-1 rounded-full w-8" style={{ backgroundColor: cp }} />
            <div className="h-2.5 rounded w-full bg-slate-800" />
            <div className="h-2.5 rounded w-4/5 bg-slate-800/70" />
            <div className="h-1.5 rounded w-2 rounded-full mt-0.5" style={{ backgroundColor: cp }} />
            <div className="h-1 rounded w-2/3 bg-slate-300 mt-0.5" />
            <div className="h-5 rounded-lg w-20 mt-1" style={{ backgroundColor: cp }} />
          </div>
          <div className="w-14 h-16 rounded-xl bg-white border border-slate-200 shadow-sm" />
        </div>
        <div className="h-6 bg-slate-900 flex items-center gap-1.5 px-3">
          {[1,2,3].map(i => <div key={i} className="h-2 w-10 rounded bg-white/10" />)}
        </div>
      </div>
    ),
  },
  {
    id: 4,
    nombre: 'Bold / Deportivo',
    desc: 'Muy oscuro, bordes de color, números.',
    preview: (cp) => (
      <div className="w-full h-full bg-[#080808] rounded-lg overflow-hidden flex flex-col relative">
        <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: cp }} />
        <div className="flex-1 p-3 pl-4 flex flex-col justify-center gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="h-px w-4" style={{ backgroundColor: cp }} />
            <div className="h-1 rounded w-16 opacity-60" style={{ backgroundColor: cp }} />
          </div>
          <div className="h-4 rounded w-full bg-white" />
          <div className="h-4 rounded w-4/5 opacity-20 border border-current" style={{ borderColor: cp, color: cp }} />
          <div className="h-5 rounded-lg w-20 mt-1 border-2" style={{ borderColor: cp, backgroundColor: cp }} />
        </div>
        <div className="border-t border-white/5 p-3 pl-4 flex gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="h-3 w-4 rounded font-black text-[6px]" style={{ color: cp }}>0{i}</div>
              <div className="h-1.5 rounded w-8 bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 5,
    nombre: 'Elegante',
    desc: 'Premium, líneas finas, asimétrico.',
    preview: (cp) => (
      <div className="w-full h-full bg-[#0c0c0e] rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 p-3 grid grid-cols-2 gap-0 items-center">
          <div className="flex flex-col gap-2 pr-3 border-r border-white/10">
            <div className="flex items-center gap-1.5">
              <div className="h-px w-4" style={{ backgroundColor: cp }} />
              <div className="h-1 rounded w-10 opacity-50" style={{ backgroundColor: cp }} />
            </div>
            <div className="h-2.5 rounded w-full bg-white" />
            <div className="h-2.5 rounded w-3/4 italic" style={{ color: cp, backgroundColor: cp }} />
            <div className="h-1 rounded w-full bg-white/10 mt-1" />
            <div className="flex items-center gap-1 mt-1">
              <div className="w-6 h-6 rounded-full border flex items-center justify-center" style={{ borderColor: `${cp}50` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cp }} />
              </div>
              <div className="h-1.5 rounded w-12 bg-white/20" />
            </div>
          </div>
          <div className="flex flex-col gap-2 pl-3">
            {['','',''].map((_, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="h-1 rounded w-6 opacity-20 bg-white" />
                <div className={`h-3 rounded font-black ${i === 0 ? '' : 'bg-white/20'}`} style={i === 0 ? { color: cp, backgroundColor: cp, width: '2rem' } : { width: `${3 - i}rem` }} />
              </div>
            ))}
          </div>
        </div>
        <div className="h-5 border-t border-white/5 flex items-center px-3 gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: cp }} />
          <div className="h-1.5 rounded w-12 bg-white/20" />
        </div>
      </div>
    ),
  },
]

const SECCIONES_CONFIG = [
  { key: 'reservas',  label: 'Turnos disponibles',       icon: CalendarDays },
  { key: 'historia',  label: 'Historia / Quiénes somos', icon: BookOpen },
  { key: 'galeria',   label: 'Galería',                  icon: Images },
  { key: 'servicios', label: 'Servicios',                icon: Wrench },
  { key: 'staff',     label: 'Staff / Equipo',           icon: Users },
  { key: 'faq',       label: 'Preguntas frecuentes',     icon: HelpCircle },
]

const NAVBAR_ESTILOS = [
  { value: 'fijo-oscuro',  label: 'Fijo oscuro',    desc: 'Fondo oscuro sólido, siempre visible' },
  { value: 'transparente', label: 'Transparente',   desc: 'Transparente sobre el hero, sólido al hacer scroll' },
  { value: 'color-solido', label: 'Color sólido',   desc: 'Usa el color primario del club como fondo' },
]

const TabApariencia = ({ club, updateClub, saveClub }) => {
  const [templateId, setTemplateId] = useState(club.templateId ?? 1)
  const [seccionesVisibles, setSeccionesVisibles] = useState(
    club.seccionesVisibles ?? { reservas: true, historia: true, galeria: true, servicios: true, staff: true, faq: true }
  )
  const [navbarEstilo, setNavbarEstilo] = useState(club.navbarEstilo ?? 'fijo-oscuro')
  const [colorPrimario, setColorPrimario] = useState(club.colorPrimario)
  const [colorSecundario, setColorSecundario] = useState(club.colorSecundario)
  const [modoOscuro, setModoOscuro] = useState(club.modoOscuroJugadores)
  const [fontFamilia, setFontFamilia] = useState(club.fontFamilia || 'Inter')
  const [saved, setSaved] = useState(false)

  const toggleSeccion = (key) =>
    setSeccionesVisibles((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleSave = () => {
    updateClub({ templateId, seccionesVisibles, navbarEstilo, colorPrimario, colorSecundario, modoOscuroJugadores: modoOscuro, fontFamilia })
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Templates */}
      <SectionCard title="Template de la landing" subtitle="Elegí el estilo visual de la página pública del club">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {TEMPLATES_META.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplateId(t.id)}
              className={[
                'flex flex-col rounded-xl border overflow-hidden transition-all text-left',
                templateId === t.id
                  ? 'border-emerald-400 shadow-md shadow-emerald-400/10'
                  : 'border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              {/* Mini preview */}
              <div className="h-24 w-full overflow-hidden">
                {t.preview(colorPrimario)}
              </div>
              {/* Label */}
              <div className="px-2.5 py-2 bg-white border-t border-slate-100">
                <p className="text-slate-700 font-semibold text-xs">{t.nombre}</p>
                <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{t.desc}</p>
                {templateId === t.id && (
                  <span className="inline-block text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1">Activo</span>
                )}
              </div>
            </button>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-3">Los colores del club se aplican sobre el template. Guardá para ver los cambios en la landing.</p>
      </SectionCard>

      {/* Secciones visibles */}
      <SectionCard title="Secciones de la landing" subtitle="Activá o desactivá las secciones que se muestran en la página pública">
        <div className="flex flex-col gap-2">
          {SECCIONES_CONFIG.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <Icon size={15} className="text-slate-400" />
                <span className="text-slate-700 text-sm font-medium">{label}</span>
              </div>
              <button
                onClick={() => toggleSeccion(key)}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${seccionesVisibles[key] ? 'bg-emerald-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${seccionesVisibles[key] ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-3">Las secciones desactivadas no aparecen en la landing pero sus datos se mantienen guardados.</p>
      </SectionCard>

      {/* Navbar */}
      <SectionCard title="Estilo del navbar" subtitle="Apariencia de la barra de navegación en la página pública">
        <div className="grid sm:grid-cols-3 gap-3">
          {NAVBAR_ESTILOS.map((n) => (
            <button
              key={n.value}
              type="button"
              onClick={() => setNavbarEstilo(n.value)}
              className={[
                'flex flex-col gap-2 p-4 rounded-xl border text-left transition-all',
                navbarEstilo === n.value
                  ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              ].join(' ')}
            >
              {/* Mini preview navbar */}
              <div className="w-full h-7 rounded-lg overflow-hidden flex items-center px-2 gap-1.5"
                style={{
                  backgroundColor: n.value === 'fijo-oscuro' ? '#1E1F23'
                    : n.value === 'transparente' ? 'transparent'
                    : colorPrimario,
                  border: n.value === 'transparente' ? '1px dashed #cbd5e1' : 'none',
                }}
              >
                <div className="w-3 h-3 rounded" style={{ backgroundColor: n.value === 'color-solido' ? 'rgba(255,255,255,0.4)' : colorPrimario }} />
                <div className="flex gap-1 flex-1">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-1 w-5 rounded-full" style={{ backgroundColor: n.value === 'color-solido' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)' }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-700 font-semibold text-xs">{n.label}</p>
                <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{n.desc}</p>
              </div>
              {navbarEstilo === n.value && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full w-fit">Activo</span>
              )}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Colores */}
      <SectionCard title="Colores del club" subtitle="Se aplican en la página pública y en el área de jugadores">
        <div className="flex flex-col gap-3">
          <ColorPicker
            label="Color primario"
            description="Botones, badges, acentos principales"
            value={colorPrimario}
            onChange={setColorPrimario}
          />
          <ColorPicker
            label="Color secundario"
            description="Acento admin, gráficos, indicadores"
            value={colorSecundario}
            onChange={setColorSecundario}
          />
        </div>
      </SectionCard>

      {/* Fuente */}
      <SectionCard title="Tipografía" subtitle="Fuente principal del área de jugadores y página pública">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {FONTS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFontFamilia(f.value)}
              className={[
                'flex flex-col items-center gap-2 px-3 py-4 rounded-xl border transition-all',
                fontFamilia === f.value
                  ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <span
                className="text-2xl font-bold text-slate-800 leading-none"
                style={{ fontFamily: f.value }}
              >
                {f.muestra}
              </span>
              <span className="text-xs font-medium text-slate-500">{f.label}</span>
              {fontFamilia === f.value && (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Seleccionada
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-slate-400 text-xs mt-3">
          La fuente se aplica al área de jugadores y la página pública. El panel admin siempre usa Inter.
        </p>
      </SectionCard>

      {/* Preview */}
      <SectionCard title="Vista previa" subtitle="Así se verán los colores aplicados">
        <div className="grid sm:grid-cols-2 gap-4">

          {/* Preview landing / público */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-2">Página pública</p>
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <div className="bg-[#1E1F23] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
                    <span className="text-[8px] font-bold text-white">P</span>
                  </div>
                  <span className="text-white text-xs font-bold">PadelOS</span>
                </div>
                <div
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#1E1F23]"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Reservar
                </div>
              </div>
              <div className="bg-[#0a0e1a] px-4 py-5">
                <div className="w-8 h-1 rounded mb-2" style={{ backgroundColor: colorPrimario }} />
                <p className="text-white font-bold text-sm">Tu club, tu pasión</p>
                <p className="text-white/40 text-xs mt-1">Reservas · Torneos · Estadísticas</p>
              </div>
            </div>
          </div>

          {/* Preview área jugadores */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-2">Área jugadores</p>
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <div className="bg-[#0d1117] px-3 py-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: colorPrimario }}>
                  <span className="text-[8px] font-bold text-[#0d1117]">P</span>
                </div>
                <span className="text-white text-xs font-bold flex-1">Área Jugadores</span>
              </div>
              <div className="bg-[#0d1117] px-3 py-3 space-y-1.5 border-t border-white/5">
                {['Mi resumen', 'Estadísticas', 'Mis torneos'].map((item, i) => (
                  <div
                    key={item}
                    className={`px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 ${i === 0 ? 'border' : ''}`}
                    style={i === 0 ? {
                      backgroundColor: `${colorPrimario}20`,
                      borderColor: `${colorPrimario}40`,
                      color: colorPrimario,
                    } : { color: 'rgba(255,255,255,0.35)' }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={i === 0 ? { backgroundColor: colorPrimario } : { backgroundColor: 'rgba(255,255,255,0.15)' }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Modo oscuro jugadores */}
      <SectionCard title="Configuración de tema" subtitle="Modo visual del área de jugadores">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-3">
            {modoOscuro ? <Moon size={18} className="text-slate-600" /> : <Sun size={18} className="text-amber-500" />}
            <div>
              <p className="text-slate-700 font-medium text-sm">Modo oscuro en área jugadores</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {modoOscuro ? 'Actualmente en modo oscuro (recomendado)' : 'Actualmente en modo claro'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setModoOscuro((v) => !v)}
            className={[
              'relative w-12 h-6 rounded-full transition-all duration-300',
              modoOscuro ? 'bg-emerald-500' : 'bg-slate-200',
            ].join(' ')}
          >
            <div className={[
              'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-300',
              modoOscuro ? 'left-6' : 'left-0.5',
            ].join(' ')} />
          </button>
        </div>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} label="Aplicar apariencia" />
    </div>
  )
}

// ─── Tab: Canchas & Tarifas ──────────────────────────────────────────────────


const CanchaRow = ({ cancha, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...cancha })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setLocal((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSave = () => {
    onUpdate(cancha.id, {
      ...local,
      precioTurno: Number(local.precioTurno),
    })
    setEditing(false)
  }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">

      {/* Cabecera */}
      <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-50">
        <div className={`w-2 h-2 rounded-full shrink-0 ${cancha.activa ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        <div className="flex-1">
          <p className="text-slate-700 font-semibold text-sm">{cancha.nombre}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-400 text-xs">{cancha.tipo}</span>
            <span className="text-slate-200">·</span>
            <span className="text-slate-400 text-xs">{cancha.indoor ? 'Indoor' : 'Outdoor'}</span>
            <span className="text-slate-200">·</span>
            <span className={`text-xs font-medium ${cancha.activa ? 'text-emerald-500' : 'text-slate-400'}`}>
              {cancha.activa ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        </div>

        {!editing && (
          <div className="text-right shrink-0">
            <p className="text-slate-800 font-bold text-sm">{formatPrice(cancha.precioTurno)}</p>
          </div>
        )}

        <button
          onClick={() => { setEditing((v) => !v); setLocal({ ...cancha }) }}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors ml-2"
        >
          <Pencil size={13} />
          {editing ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      {/* Formulario edición */}
      {editing && (
        <div className="px-5 py-4 border-t border-slate-100 bg-white">
          <div className="grid sm:grid-cols-3 gap-4">

            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre</label>
              <input
                name="nombre"
                value={local.nombre}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Tipo</label>
              <div className="relative">
                <select
                  name="tipo"
                  value={local.tipo}
                  onChange={handleChange}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 appearance-none transition-colors"
                >
                  <option>Cristal</option>
                  <option>Pared</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Precio turno (ARS)</label>
              <input
                name="precioTurno"
                type="number"
                value={local.precioTurno}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="indoor" checked={local.indoor} onChange={handleChange} className="rounded accent-emerald-500" />
              <span className="text-sm text-slate-600">Indoor</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="activa" checked={local.activa} onChange={handleChange} className="rounded accent-emerald-500" />
              <span className="text-sm text-slate-600">Cancha activa</span>
            </label>
            <div className="ml-auto">
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={13} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const TabCanchas = ({ club, updateCancha, setCantidadCanchas, updateHorario, saveClub }) => {
  const [saved, setSaved] = useState(false)
  const cantidad = club.canchas.length

  const handleSave = () => {
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Configuración general */}
      <SectionCard title="Configuración general" subtitle="Cantidad de canchas y modalidad de tarifas">
        <div className="flex flex-col gap-4">

          {/* Cantidad de canchas */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-slate-700 font-medium text-sm">Cantidad de canchas</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {cantidad} {cantidad === 1 ? 'cancha configurada' : 'canchas configuradas'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCantidadCanchas(cantidad - 1)}
                disabled={cantidad <= 1}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-lg flex items-center justify-center hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                −
              </button>
              <span className="text-slate-800 font-bold text-xl w-8 text-center tabular-nums">
                {cantidad}
              </span>
              <button
                onClick={() => setCantidadCanchas(cantidad + 1)}
                disabled={cantidad >= 20}
                className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-lg flex items-center justify-center hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                +
              </button>
            </div>
          </div>

        </div>
      </SectionCard>

      {/* Lista de canchas */}
      <SectionCard title="Canchas" subtitle="Configuración individual por cancha">
        <div className="flex flex-col gap-3">
          {club.canchas.map((c) => (
            <CanchaRow key={c.id} cancha={c} onUpdate={updateCancha} />
          ))}
        </div>
      </SectionCard>

      {/* Resumen tarifas */}
      <SectionCard title="Resumen de tarifas">
        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left text-slate-500 font-medium text-xs px-4 py-3">Cancha</th>
                <th className="text-left text-slate-500 font-medium text-xs px-4 py-3">Tipo</th>
                <th className="text-right text-slate-500 font-medium text-xs px-4 py-3">Precio turno</th>
                <th className="text-center text-slate-500 font-medium text-xs px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {club.canchas.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-700 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{c.tipo} · {c.indoor ? 'Indoor' : 'Outdoor'}</td>
                  <td className="px-4 py-3 text-right text-slate-700 font-semibold">{formatPrice(c.precioTurno)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.activa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {c.activa ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {c.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Horarios de apertura */}
      <SectionCard title="Horarios de apertura" subtitle="Configurá los horarios del club por día">
        <div className="flex flex-col gap-2">
          {DIAS.map((dia) => {
            const h = club.horarios[dia]
            return (
              <div
                key={dia}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors ${h.activo ? 'bg-slate-50' : 'bg-slate-50/40 opacity-60'}`}
              >
                <button
                  onClick={() => updateHorario(dia, { activo: !h.activo })}
                  className={[
                    'relative w-10 h-5 rounded-full transition-all duration-300 shrink-0',
                    h.activo ? 'bg-emerald-500' : 'bg-slate-200',
                  ].join(' ')}
                >
                  <div className={[
                    'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300',
                    h.activo ? 'left-5' : 'left-0.5',
                  ].join(' ')} />
                </button>
                <span className="text-slate-700 font-medium text-sm w-24 shrink-0">{dia}</span>
                {h.activo ? (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Apertura</span>
                      <input
                        type="time"
                        value={h.apertura}
                        onChange={(e) => updateHorario(dia, { apertura: e.target.value })}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
                      />
                    </div>
                    <span className="text-slate-200">—</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-xs">Cierre</span>
                      <input
                        type="time"
                        value={h.cierre}
                        onChange={(e) => updateHorario(dia, { cierre: e.target.value })}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
                      />
                    </div>
                    <span className="text-xs text-slate-400 ml-auto">{h.apertura} a {h.cierre}</span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-sm italic">Cerrado</span>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Hero ──────────────────────────────────────────────────────────────

const TabHero = ({ club, updateClub, saveClub }) => {
  const [form, setForm] = useState({
    heroTitulo:            club.heroTitulo            ?? '',
    heroTituloDestacado:   club.heroTituloDestacado   ?? '',
    heroSubtitulo:         club.heroSubtitulo         ?? '',
    heroBadge:             club.heroBadge             ?? '',
    heroCtaPrimarioTexto:  club.heroCtaPrimarioTexto  ?? 'Reservar cancha',
    heroCtaSecundarioTexto: club.heroCtaSecundarioTexto ?? 'Ver torneos',
    heroImagen:            club.heroImagen            ?? null,
  })
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleImagen = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm((prev) => ({ ...prev, heroImagen: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateClub(form)
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Textos */}
      <SectionCard title="Textos del hero" subtitle="Se muestran en la sección principal de la página pública">
        <div className="flex flex-col gap-4">
          <Field
            label="Badge (texto pequeño sobre el título)"
            name="heroBadge"
            value={form.heroBadge}
            onChange={handleChange}
            placeholder="Club de Pádel · Buenos Aires"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Título principal"
              name="heroTitulo"
              value={form.heroTitulo}
              onChange={handleChange}
              placeholder="Tu cancha te espera,"
            />
            <div>
              <Field
                label="Título destacado (en color primario)"
                name="heroTituloDestacado"
                value={form.heroTituloDestacado}
                onChange={handleChange}
                placeholder="reservá ahora"
              />
              <p className="text-slate-400 text-xs mt-1">Se renderiza en el color primario del club.</p>
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Subtítulo</label>
            <textarea
              name="heroSubtitulo"
              value={form.heroSubtitulo}
              onChange={handleChange}
              rows={2}
              placeholder="Reservas online, torneos y estadísticas..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all resize-none"
            />
          </div>
        </div>
      </SectionCard>

      {/* CTAs */}
      <SectionCard title="Llamados a la acción" subtitle="Botones del hero — redirigen al área de jugadores">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Field
              label="Botón primario"
              name="heroCtaPrimarioTexto"
              value={form.heroCtaPrimarioTexto}
              onChange={handleChange}
              placeholder="Reservar cancha"
            />
            <p className="text-slate-400 text-xs mt-1">Redirige al login / dashboard del jugador.</p>
          </div>
          <div>
            <Field
              label="Botón secundario"
              name="heroCtaSecundarioTexto"
              value={form.heroCtaSecundarioTexto}
              onChange={handleChange}
              placeholder="Ver torneos"
            />
            <p className="text-slate-400 text-xs mt-1">Redirige al login / dashboard del jugador.</p>
          </div>
        </div>
      </SectionCard>

      {/* Imagen de fondo */}
      <SectionCard title="Imagen de fondo" subtitle="Opcional — se superpone con overlay oscuro sobre el hero">
        <div className="flex items-start gap-6">
          <div className="shrink-0">
            <div
              onClick={() => fileRef.current.click()}
              className="w-48 h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
            >
              {form.heroImagen ? (
                <img src={form.heroImagen} alt="Hero" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={22} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-slate-300 group-hover:text-emerald-400 text-xs mt-1.5 text-center px-3 transition-colors">
                    Subir imagen
                  </span>
                </>
              )}
            </div>
            {form.heroImagen && (
              <button
                onClick={() => setForm((p) => ({ ...p, heroImagen: null }))}
                className="mt-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full text-center"
              >
                Eliminar imagen
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImagen} />
            <p className="text-slate-400 text-xs mt-2 text-center">PNG, JPG o WEBP</p>
          </div>

          <div className="flex-1">
            <p className="text-slate-500 text-sm">
              Si subís una imagen, se mostrará como fondo del hero con un overlay oscuro para mantener la legibilidad del texto.
            </p>
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <p className="text-slate-400 text-xs font-medium mb-1">Recomendaciones</p>
              <ul className="text-slate-400 text-xs flex flex-col gap-1 list-disc list-inside">
                <li>Resolución mínima: 1440 × 800 px</li>
                <li>Formato horizontal (paisaje)</li>
                <li>Peso máximo: 3 MB</li>
              </ul>
            </div>
          </div>
        </div>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Historia ──────────────────────────────────────────────────────────

const TabHistoria = ({ club, updateClub, saveClub }) => {
  const [form, setForm] = useState({
    tituloBio:     club.tituloBio     ?? 'Quiénes Somos',
    historia:      club.historia      ?? '',
    anoFundacion:  club.anoFundacion  ?? '',
    fotoPrincipal: club.fotoPrincipal ?? null,
  })
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setForm((prev) => ({ ...prev, fotoPrincipal: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateClub(form)
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Título y texto */}
      <SectionCard title="Historia del club" subtitle="Se mostrará en la sección &quot;Quiénes somos&quot; de la página principal">
        <div className="flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Título de la sección"
              name="tituloBio"
              value={form.tituloBio}
              onChange={handleChange}
              placeholder="Quiénes Somos"
            />
            <Field
              label="Año de fundación"
              name="anoFundacion"
              value={form.anoFundacion}
              onChange={handleChange}
              placeholder="2015"
            />
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Historia del club</label>
            <textarea
              name="historia"
              value={form.historia}
              onChange={handleChange}
              rows={6}
              placeholder="Contá la historia del club, cómo empezó, qué los distingue..."
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all resize-none"
            />
            <p className="text-slate-400 text-xs mt-1.5">
              Podés usar párrafos separados con doble salto de línea.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Foto principal */}
      <SectionCard title="Foto del club" subtitle="Se mostrará junto al texto de historia en la página principal">
        <div className="flex items-start gap-6">

          {/* Upload zone */}
          <div className="shrink-0">
            <div
              onClick={() => fileRef.current.click()}
              className="w-40 h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
            >
              {form.fotoPrincipal ? (
                <img src={form.fotoPrincipal} alt="Foto del club" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Upload size={22} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                  <span className="text-slate-300 group-hover:text-emerald-400 text-xs mt-1.5 text-center px-3 transition-colors">
                    Subir foto
                  </span>
                </>
              )}
            </div>
            {form.fotoPrincipal && (
              <button
                onClick={() => setForm((p) => ({ ...p, fotoPrincipal: null }))}
                className="mt-2 text-xs text-slate-400 hover:text-red-400 transition-colors w-full text-center"
              >
                Eliminar foto
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            <p className="text-slate-400 text-xs mt-2 text-center">PNG, JPG o WEBP</p>
          </div>

          <div className="flex-1">
            <p className="text-slate-500 text-sm">
              La foto se mostrará en la sección "Quiénes somos" de la landing. Si no cargás una foto, se mostrará solo el texto.
            </p>
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <p className="text-slate-400 text-xs font-medium mb-1">Recomendaciones</p>
              <ul className="text-slate-400 text-xs flex flex-col gap-1 list-disc list-inside">
                <li>Resolución mínima: 800 × 500 px</li>
                <li>Formato horizontal (paisaje)</li>
                <li>Peso máximo: 2 MB</li>
              </ul>
            </div>
          </div>
        </div>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Galería ───────────────────────────────────────────────────────────

const TabGaleria = ({ club, updateClub, saveClub }) => {
  const [items, setItems] = useState(club.galeria ?? [])
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setItems((prev) => [
          ...prev,
          { id: Date.now() + Math.random(), url: ev.target.result, caption: '' },
        ])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleCaption = (id, value) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, caption: value } : it)))

  const handleDelete = (id) => setItems((prev) => prev.filter((it) => it.id !== id))

  const handleSave = () => {
    updateClub({ galeria: items })
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Galería del club" subtitle="Las fotos se muestran en la página pública. Podés subir varias a la vez.">
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

        {/* Botón agregar */}
        <button
          onClick={() => fileRef.current.click()}
          className="flex items-center gap-2 border-2 border-dashed border-slate-200 hover:border-emerald-400 text-slate-400 hover:text-emerald-500 rounded-xl px-5 py-3 text-sm font-medium transition-all w-fit mb-4"
        >
          <Plus size={16} /> Agregar fotos
        </button>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300">
            <Images size={36} className="mb-3" />
            <p className="text-sm">Todavía no hay fotos en la galería</p>
          </div>
        )}

        {/* Grid fotos */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div key={it.id} className="flex flex-col gap-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-100 group">
                <img src={it.url} alt={it.caption} className="w-full h-28 object-cover" />
                <button
                  onClick={() => handleDelete(it.id)}
                  className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <input
                value={it.caption}
                onChange={(e) => handleCaption(it.id, e.target.value)}
                placeholder="Descripción (opcional)"
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 placeholder:text-slate-300 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          ))}
        </div>
      </SectionCard>
      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Servicios ──────────────────────────────────────────────────────────

const ICONOS_SERVICIOS = {
  ShowerHead: ShowerHead, Car: Car, GraduationCap: GraduationCap,
  Wifi: Wifi, Coffee: Coffee, Dumbbell: Dumbbell,
  Shield: Shield, Wind: Wind, Utensils: Utensils, Music: Music,
}

const ICONOS_OPCIONES = Object.keys(ICONOS_SERVICIOS)

const ServicioRow = ({ servicio, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...servicio })
  const Icon = ICONOS_SERVICIOS[local.icono] ?? Wrench

  const handleSave = () => { onUpdate(servicio.id, local); setEditing(false) }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-50">
        <div className={`w-2 h-2 rounded-full shrink-0 ${servicio.activo ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-slate-500" />
        </div>
        <div className="flex-1">
          <p className="text-slate-700 font-semibold text-sm">{servicio.titulo}</p>
          <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{servicio.descripcion}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onUpdate(servicio.id, { activo: !servicio.activo })}
            className={`relative w-9 h-5 rounded-full transition-all duration-300 ${servicio.activo ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${servicio.activo ? 'left-4' : 'left-0.5'}`} />
          </button>
          <button onClick={() => { setEditing((v) => !v); setLocal({ ...servicio }) }} className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1">
            <Pencil size={12} /> {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button onClick={() => onDelete(servicio.id)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Título</label>
              <input value={local.titulo} onChange={(e) => setLocal((p) => ({ ...p, titulo: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors" />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Ícono</label>
              <div className="relative">
                <select value={local.icono} onChange={(e) => setLocal((p) => ({ ...p, icono: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 appearance-none transition-colors">
                  {ICONOS_OPCIONES.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Descripción</label>
            <textarea value={local.descripcion} onChange={(e) => setLocal((p) => ({ ...p, descripcion: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-all resize-none" />
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Save size={13} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const TabServicios = ({ club, updateClub, saveClub }) => {
  const [items, setItems] = useState(club.servicios ?? [])
  const [saved, setSaved] = useState(false)

  const handleUpdate = (id, data) =>
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))

  const handleDelete = (id) => setItems((prev) => prev.filter((s) => s.id !== id))

  const handleAdd = () =>
    setItems((prev) => [...prev, { id: Date.now(), icono: 'Wifi', titulo: 'Nuevo servicio', descripcion: '', activo: true }])

  const handleSave = () => {
    updateClub({ servicios: items })
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Servicios del club" subtitle="Solo los servicios activos se muestran en la landing">
        <div className="flex flex-col gap-3">
          {items.map((s) => (
            <ServicioRow key={s.id} servicio={s} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          <Plus size={15} /> Agregar servicio
        </button>
      </SectionCard>
      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Staff ──────────────────────────────────────────────────────────────

const StaffCard = ({ miembro, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...miembro })
  const fileRef = useRef()
  const inicial = miembro.nombre?.charAt(0)?.toUpperCase() ?? '?'

  const handleFoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLocal((p) => ({ ...p, foto: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => { onUpdate(miembro.id, local); setEditing(false) }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-50">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-sm">
          {miembro.foto ? <img src={miembro.foto} alt={miembro.nombre} className="w-full h-full object-cover" /> : inicial}
        </div>
        <div className="flex-1">
          <p className="text-slate-700 font-semibold text-sm">{miembro.nombre}</p>
          <p className="text-slate-400 text-xs">{miembro.rol}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { setEditing((v) => !v); setLocal({ ...miembro }) }} className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1">
            <Pencil size={12} /> {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button onClick={() => onDelete(miembro.id)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col gap-4">
          <div className="flex items-start gap-4">
            {/* Upload foto */}
            <div className="shrink-0">
              <div onClick={() => fileRef.current.click()} className="w-16 h-16 rounded-full border-2 border-dashed border-slate-200 hover:border-emerald-400 flex items-center justify-center cursor-pointer overflow-hidden group transition-all">
                {local.foto
                  ? <img src={local.foto} alt="" className="w-full h-full object-cover" />
                  : <User size={20} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                }
              </div>
              {local.foto && (
                <button onClick={() => setLocal((p) => ({ ...p, foto: null }))} className="mt-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors w-full text-center">Quitar</button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            </div>
            <div className="flex-1 flex flex-col gap-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre</label>
                  <input value={local.nombre} onChange={(e) => setLocal((p) => ({ ...p, nombre: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors" />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs font-medium mb-1.5">Rol</label>
                  <input value={local.rol} onChange={(e) => setLocal((p) => ({ ...p, rol: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Descripción</label>
                <textarea value={local.descripcion} onChange={(e) => setLocal((p) => ({ ...p, descripcion: e.target.value }))} rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-all resize-none" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSave} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Save size={13} /> Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const TabStaff = ({ club, updateClub, saveClub }) => {
  const [items, setItems] = useState(club.staff ?? [])
  const [saved, setSaved] = useState(false)

  const handleUpdate = (id, data) =>
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)))

  const handleDelete = (id) => setItems((prev) => prev.filter((m) => m.id !== id))

  const handleAdd = () =>
    setItems((prev) => [...prev, { id: Date.now(), nombre: 'Nuevo integrante', rol: 'Rol', foto: null, descripcion: '' }])

  const handleSave = () => {
    updateClub({ staff: items })
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard title="Equipo del club" subtitle="El staff se muestra en la landing como tarjetas de presentación">
        <div className="flex flex-col gap-3">
          {items.map((m) => (
            <StaffCard key={m.id} miembro={m} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          <Plus size={15} /> Agregar integrante
        </button>
      </SectionCard>
      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Tab: Profesores ─────────────────────────────────────────────────────────

const CANCHAS_DEFAULT = [
  { id: 1, nombre: 'Cancha 1' },
  { id: 2, nombre: 'Cancha 2' },
  { id: 3, nombre: 'Cancha 3' },
  { id: 4, nombre: 'Cancha 4' },
]

const ProfesorCard = ({ profesor, canchas, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...profesor })
  const [showPass, setShowPass] = useState(false)

  const handleSave = () => {
    onUpdate(profesor.id, { ...local, email: local.email.trim().toLowerCase() })
    setEditing(false)
  }

  const toggleCancha = (id) => {
    setLocal((p) => ({
      ...p,
      canchasIds: p.canchasIds.includes(id)
        ? p.canchasIds.filter((c) => c !== id)
        : [...p.canchasIds, id],
    }))
  }

  const inicial = `${profesor.nombre?.[0] ?? ''}${profesor.apellido?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      {/* Header de la card */}
      <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-50">
        <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
          <span className="text-orange-600 font-bold text-sm">{inicial || '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 font-semibold text-sm">
            {profesor.nombre} {profesor.apellido}
          </p>
          <p className="text-slate-400 text-xs">{profesor.email} · {profesor.especialidad || 'Sin especialidad'}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${profesor.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
            {profesor.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            onClick={() => { setEditing((v) => !v); setLocal({ ...profesor }) }}
            className="text-xs font-medium text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
          >
            <Pencil size={12} /> {editing ? 'Cancelar' : 'Editar'}
          </button>
          <button onClick={() => onDelete(profesor.id)} className="text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Formulario de edición */}
      {editing && (
        <div className="px-5 py-5 border-t border-slate-100 bg-white flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre</label>
              <input
                value={local.nombre}
                onChange={(e) => setLocal((p) => ({ ...p, nombre: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Apellido</label>
              <input
                value={local.apellido}
                onChange={(e) => setLocal((p) => ({ ...p, apellido: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Email (login)</label>
              <input
                type="email"
                value={local.email}
                onChange={(e) => setLocal((p) => ({ ...p, email: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={local.password}
                  onChange={(e) => setLocal((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPass ? <Moon size={14} /> : <Sun size={14} />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Especialidad</label>
              <input
                value={local.especialidad}
                onChange={(e) => setLocal((p) => ({ ...p, especialidad: e.target.value }))}
                placeholder="Ej: Técnica, Iniciación, Competitivo..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>

          {/* Canchas habilitadas */}
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-2">
              Canchas habilitadas{' '}
              <span className="text-slate-300 font-normal">(vacío = todas)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {canchas.map((c) => {
                const sel = local.canchasIds.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCancha(c.id)}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      sel
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'border-slate-200 text-slate-400 hover:border-slate-300',
                    ].join(' ')}
                  >
                    {c.nombre}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Estado activo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setLocal((p) => ({ ...p, activo: !p.activo }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${local.activo ? 'bg-emerald-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${local.activo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-slate-500 text-sm">{local.activo ? 'Activo' : 'Inactivo'}</span>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={13} /> Guardar cambios
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const TabProfesores = ({ club }) => {
  const { profesores, addProfesor, updateProfesor, toggleProfesor } = useProfesoresStore()
  const [agregando, setAgregando] = useState(false)
  const [nuevo, setNuevo] = useState({ nombre: '', apellido: '', email: '', password: '', especialidad: '', canchasIds: [] })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const canchas = club.canchas?.filter((c) => c.activa) ?? CANCHAS_DEFAULT

  const handleAdd = () => {
    setError('')
    if (!nuevo.nombre.trim() || !nuevo.email.trim() || !nuevo.password.trim()) {
      setError('Nombre, email y contraseña son obligatorios.')
      return
    }
    const emailLower = nuevo.email.trim().toLowerCase()
    if (profesores.some((p) => p.email === emailLower)) {
      setError('Ya existe un profesor con ese email.')
      return
    }
    addProfesor({ ...nuevo, email: emailLower })
    setNuevo({ nombre: '', apellido: '', email: '', password: '', especialidad: '', canchasIds: [] })
    setAgregando(false)
  }

  const handleUpdate = (id, data) => updateProfesor(id, data)
  const handleDelete = (id) => toggleProfesor(id) // desactiva en lugar de eliminar

  const toggleCanchaNew = (id) => {
    setNuevo((p) => ({
      ...p,
      canchasIds: p.canchasIds.includes(id)
        ? p.canchasIds.filter((c) => c !== id)
        : [...p.canchasIds, id],
    }))
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Profesores del club"
        subtitle="Los profesores pueden acceder a su portal en /dashboardProfesor para gestionar su agenda de clases"
      >
        {/* Lista */}
        <div className="flex flex-col gap-3">
          {profesores.length === 0 && !agregando && (
            <p className="text-slate-400 text-sm text-center py-6">No hay profesores registrados todavía.</p>
          )}
          {profesores.map((p) => (
            <ProfesorCard
              key={p.id}
              profesor={p}
              canchas={canchas}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {/* Formulario nuevo profesor */}
        {agregando && (
          <div className="mt-4 border border-emerald-100 rounded-xl bg-emerald-50/40 p-5 flex flex-col gap-4">
            <p className="text-slate-700 font-semibold text-sm">Nuevo profesor</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre *</label>
                <input
                  value={nuevo.nombre}
                  onChange={(e) => setNuevo((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="María"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Apellido</label>
                <input
                  value={nuevo.apellido}
                  onChange={(e) => setNuevo((p) => ({ ...p, apellido: e.target.value }))}
                  placeholder="González"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Email (login) *</label>
                <input
                  type="email"
                  value={nuevo.email}
                  onChange={(e) => setNuevo((p) => ({ ...p, email: e.target.value }))}
                  placeholder="maria@club.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={nuevo.password}
                    onChange={(e) => setNuevo((p) => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showPass ? <Moon size={14} /> : <Sun size={14} />}
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Especialidad</label>
                <input
                  value={nuevo.especialidad}
                  onChange={(e) => setNuevo((p) => ({ ...p, especialidad: e.target.value }))}
                  placeholder="Ej: Técnica, Iniciación, Competitivo..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 bg-white transition-colors"
                />
              </div>
            </div>

            {/* Canchas */}
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-2">
                Canchas habilitadas <span className="text-slate-300 font-normal">(vacío = todas)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {canchas.map((c) => {
                  const sel = nuevo.canchasIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCanchaNew(c.id)}
                      className={[
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        sel
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white',
                      ].join(' ')}
                    >
                      {c.nombre}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setAgregando(false); setError('') }}
                className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCircle size={13} /> Crear profesor
              </button>
            </div>
          </div>
        )}

        {!agregando && (
          <button
            onClick={() => setAgregando(true)}
            className="flex items-center gap-2 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Plus size={15} /> Agregar profesor
          </button>
        )}
      </SectionCard>
    </div>
  )
}

// ─── Tab: FAQ + Política ─────────────────────────────────────────────────────

const FaqItem = ({ item, onUpdate, onDelete }) => {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <div className="flex-1">
          <p className="text-slate-700 font-medium text-sm">{item.pregunta || <span className="text-slate-300 italic">Sin pregunta</span>}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onDelete(item.id) }} className="text-slate-300 hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className="px-5 py-4 border-t border-slate-100 bg-white flex flex-col gap-3">
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Pregunta</label>
            <input value={item.pregunta} onChange={(e) => onUpdate(item.id, { pregunta: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors" />
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-medium mb-1.5">Respuesta</label>
            <textarea value={item.respuesta} onChange={(e) => onUpdate(item.id, { respuesta: e.target.value })} rows={3} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-all resize-none" />
          </div>
        </div>
      )}
    </div>
  )
}

const TabFaq = ({ club, updateClub, saveClub }) => {
  const [faqItems, setFaqItems] = useState(club.faq ?? [])
  const [politica, setPolitica] = useState(club.politicaReservas ?? '')
  const [saved, setSaved] = useState(false)

  const handleUpdateFaq = (id, data) =>
    setFaqItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)))

  const handleDeleteFaq = (id) => setFaqItems((prev) => prev.filter((f) => f.id !== id))

  const handleAddFaq = () =>
    setFaqItems((prev) => [...prev, { id: Date.now(), pregunta: '', respuesta: '' }])

  const handleSave = () => {
    updateClub({ faq: faqItems, politicaReservas: politica })
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* FAQ */}
      <SectionCard title="Preguntas frecuentes" subtitle="Se muestran en la landing como acordeón colapsable">
        <div className="flex flex-col gap-3">
          {faqItems.map((f) => (
            <FaqItem key={f.id} item={f} onUpdate={handleUpdateFaq} onDelete={handleDeleteFaq} />
          ))}
        </div>
        <button onClick={handleAddFaq} className="flex items-center gap-2 mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          <Plus size={15} /> Agregar pregunta
        </button>
      </SectionCard>

      {/* Política */}
      <SectionCard title="Política de reservas" subtitle="Visible para los jugadores al momento de reservar una cancha">
        <textarea
          value={politica}
          onChange={(e) => setPolitica(e.target.value)}
          rows={5}
          placeholder="Describí las condiciones de reserva, cancelación, pagos y reglas del club..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10 transition-all resize-none"
        />
        <p className="text-slate-400 text-xs mt-2">Este texto no se muestra en la landing pública, solo al jugador durante el proceso de reserva.</p>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const QuienesSomosPage = () => {
  const [activeTab, setActiveTab] = useState('info')
  const { club, updateClub, updateCancha, updateHorario, setCantidadCanchas, saveClub } = useClubStore()

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Club</h2>
        <p className="text-slate-400 text-sm mt-1">Información pública, apariencia y configuración general</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={[
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'info'       && <TabInfo       club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'canchas'    && <TabCanchas    club={club} updateCancha={updateCancha} setCantidadCanchas={setCantidadCanchas} updateHorario={updateHorario} saveClub={saveClub} />}
      {activeTab === 'historia'   && <TabHistoria   club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'hero'       && <TabHero       club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'galeria'    && <TabGaleria    club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'servicios'  && <TabServicios  club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'staff'       && <TabStaff       club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'profesores'  && <TabProfesores  club={club} />}
      {activeTab === 'faq'         && <TabFaq         club={club} updateClub={updateClub} saveClub={saveClub} />}
      {activeTab === 'apariencia' && <TabApariencia club={club} updateClub={updateClub} saveClub={saveClub} />}
    </div>
  )
}

export default QuienesSomosPage
