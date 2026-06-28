import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Building2, Palette, LayoutGrid, BookOpen, Sparkles,
  Upload, Save, CheckCircle,
  Phone, Mail, MapPin, Sun, Moon,
  Pencil, Wifi, WifiOff, ChevronDown, ChevronUp,
  Images, Wrench, Users, HelpCircle, CalendarDays,
  Plus, Trash2, User, Check, X, AlertTriangle,
  ShowerHead, Car, GraduationCap, Coffee, Dumbbell,
  Shield, Wind, Utensils, Music, Info,
} from 'lucide-react'
import useClubStore from '../store/clubStore'
import useProfesoresStore from '../store/profesoresStore'
import useAuthStore from '../store/authStore'
import { api, uploadImage } from '../lib/api'
import { useToast } from '../components/ui/ToastProvider'

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

const WhatsAppIcon = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const InstagramIcon = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const FacebookIcon = ({ size = 15, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const Field = ({ label, name, value, onChange, type = 'text', placeholder, icon: Icon, iconColor = 'text-slate-300', textarea = false }) => (
  <div>
    <label className="block text-slate-500 text-xs font-medium mb-1.5">{label}</label>
    <div className="relative">
      {Icon && (
        <Icon size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconColor} pointer-events-none`} />
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
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6">
    <div className="mb-4 md:mb-5 pb-4 border-b border-slate-50">
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
  const token = useAuthStore((s) => s.token)
  const toast = useToast()
  const [form, setForm] = useState({ ...club })
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(club.logo)
  const fileRef = useRef()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = await uploadImage(file, { profile: 'logo', folder: 'club', token })
      setPreview(url)
      setForm((prev) => ({ ...prev, logo: url }))
    } catch (err) {
      console.error('Error al subir logo:', err)
      toast.error('No se pudo subir el logo. Probá de nuevo.')
    }
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
        <div className="flex flex-col sm:flex-row items-start gap-4">

          {/* Upload zone */}
          <div className="shrink-0 w-full sm:w-auto">
            <div
              onClick={() => fileRef.current.click()}
              className="w-full sm:w-28 h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
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
          <Field label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Libertador 1234" icon={MapPin} iconColor="text-red-500" />
          <Field label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} placeholder="+54 11 ..." icon={Phone} iconColor="text-emerald-500" />
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="info@club.com" icon={Mail} iconColor="text-blue-500" />
          <Field label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={handleChange} placeholder="+54 9 11 ..." icon={WhatsAppIcon} iconColor="text-[#25D366]" />
        </div>
      </SectionCard>

      {/* Redes sociales */}
      <SectionCard title="Redes sociales">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Instagram" name="instagram" value={form.instagram} onChange={handleChange} placeholder="@clubpadel" icon={InstagramIcon} iconColor="text-[#E1306C]" />
          <Field label="Facebook" name="facebook" value={form.facebook} onChange={handleChange} placeholder="clubpadel" icon={FacebookIcon} iconColor="text-[#1877F2]" />
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

// Rechaza colores demasiado oscuros para un acento (texto/contraste).
// Luminancia percibida; umbral ~0.35 deja pasar vibrantes (rojo/azul/violeta)
// y frena navy/negro.
const esColorMuyOscuro = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim())
  if (!m) return false
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.35
}

const TabApariencia = ({ club, updateClub, saveClub }) => {
  const toast = useToast()
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
    // Guard: el primario es un acento (botones/badges) → no permitir muy oscuro.
    // Se valida acá (al guardar), no en el onChange, para no spamear toasts mientras
    // el usuario arrastra por la paleta del selector.
    if (esColorMuyOscuro(colorPrimario)) {
      toast.error('Ese color es muy oscuro para un acento. Elegí uno más claro para que se lea bien sobre los botones.')
      return
    }
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
                  <div className="w-5 h-5 rounded flex items-center justify-center overflow-hidden" style={{ backgroundColor: club.logo ? 'transparent' : colorPrimario }}>
                    {club.logo
                      ? <img src={club.logo} alt={club.nombre || 'Club'} className="w-full h-full object-cover" />
                      : <span className="text-[8px] font-bold text-white">{(club.nombre || 'P').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <span className="text-white text-xs font-bold">{club.nombre || 'PadelwIArk'}</span>
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


// ─── Horario select helpers ──────────────────────────────────────────────────

const _toMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m }
const _toTime = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// Retorna opciones válidas de cierre: apertura + N×90
// El límite garantiza siempre al menos 3 slots disponibles.
// Para aperturas tardías (ej: 22:00) esto extiende naturalmente pasada medianoche.
const getCierreOpciones = (apertura) => {
  if (!apertura) return []
  const ap = _toMin(apertura)
  const limit = 1440 + 90 * 2  // 2 slots extra pasada medianoche (hasta ~03:00)
  const opts = []
  let cur = ap + 90
  let n = 1
  while (cur <= limit) {
    const isTomorrow = cur > 1440
    const displayMin = cur % 1440
    const value = displayMin === 0 ? '00:00' : _toTime(displayMin)
    const label = `${value}${isTomorrow ? ' (+1d)' : ''} — ${n} turno${n !== 1 ? 's' : ''}`
    opts.push({ value, label })
    cur += 90; n++
  }
  return opts
}

// Encuentra la opción de cierre más cercana al valor actual tras cambiar apertura
const snapCierre = (cierre, opts) => {
  if (!opts.length) return ''
  if (opts.find((o) => o.value === cierre)) return cierre
  const curM = cierre === '00:00' ? 1440 : _toMin(cierre)
  return opts.reduce((best, o) => {
    const om = o.value === '00:00' ? 1440 : _toMin(o.value)
    const bm = best.value === '00:00' ? 1440 : _toMin(best.value)
    return Math.abs(om - curM) < Math.abs(bm - curM) ? o : best
  }).value
}

const HORAS_SELECT = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

// Selector apertura (hora+minuto) + cierre (solo opciones válidas)
const HorarioSelect = ({ apertura, cierre, onAperturaChange, onCierreChange, size = 'sm' }) => {
  const [apH, apM] = apertura ? apertura.split(':') : ['08', '00']
  const opts = getCierreOpciones(apertura)
  const cierreVal = opts.find((o) => o.value === cierre) ? cierre : (opts[opts.length - 1]?.value ?? '')

  const cls = size === 'xs'
    ? 'border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:border-blue-400 transition-colors appearance-none bg-white'
    : 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-emerald-400 transition-colors appearance-none bg-white'

  const handleHora = (newH) => {
    const newAp = `${newH}:${apM}`
    const newOpts = getCierreOpciones(newAp)
    const newCierre = snapCierre(cierre, newOpts)
    // Solo llamamos onAperturaChange — el padre recibe ambos valores y aplica juntos o los usa en el applyFn del modal
    onAperturaChange(newAp, newCierre)
  }
  const handleMin = (newM) => {
    const newAp = `${apH}:${newM}`
    const newOpts = getCierreOpciones(newAp)
    const newCierre = snapCierre(cierre, newOpts)
    onAperturaChange(newAp, newCierre)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-slate-400 ${size === 'xs' ? 'text-xs' : 'text-xs'}`}>Apertura</span>
      <div className="flex items-center gap-1">
        <select value={apH} onChange={(e) => handleHora(e.target.value)} className={cls}>
          {HORAS_SELECT.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className="text-slate-300 text-sm">:</span>
        <select value={apM} onChange={(e) => handleMin(e.target.value)} className={cls}>
          <option value="00">00</option>
          <option value="30">30</option>
        </select>
      </div>
      <span className="text-slate-200">—</span>
      <span className={`text-slate-400 ${size === 'xs' ? 'text-xs' : 'text-xs'}`}>Cierre</span>
      <select value={cierreVal} onChange={(e) => onCierreChange(e.target.value)} className={`${cls} min-w-[140px]`}>
        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

const HORARIOS_CANCHA_DEFAULT = Object.fromEntries(
  DIAS.map((dia, i) => [
    dia,
    {
      apertura: i < 5 ? '08:00' : '09:00',
      cierre: i === 6 ? '21:00' : i === 5 ? '22:00' : '23:00',
      activo: true,
    },
  ])
)

const CanchaRow = ({ cancha, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...cancha })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setLocal((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSave = () => {
    const { horarios: _h, ...rest } = local
    onUpdate(cancha.id, { ...rest, precioTurno: Number(rest.precioTurno) })
    setEditing(false)
  }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">

      {/* Cabecera */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
        <div className={`w-2 h-2 rounded-full shrink-0 ${cancha.activa ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 font-semibold text-sm truncate">{cancha.nombre}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span className="text-slate-400 text-xs">{cancha.tipo}</span>
            <span className="text-slate-200">·</span>
            <span className="text-slate-400 text-xs">{cancha.indoor ? 'Indoor' : 'Outdoor'}</span>
            <span className="text-slate-200">·</span>
            <span className={`text-xs font-medium ${cancha.activa ? 'text-emerald-500' : 'text-slate-400'}`}>
              {cancha.activa ? 'Activa' : 'Inactiva'}
            </span>
            {cancha.horarios && (
              <>
                <span className="text-slate-200">·</span>
                <span className="text-xs font-medium text-blue-500">Horario propio</span>
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="text-right shrink-0">
            <p className="text-slate-800 font-bold text-sm">{formatPrice(cancha.precioTurno)}</p>
          </div>
        )}

        <button
          onClick={() => { setEditing((v) => !v); setLocal({ ...cancha }) }}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ml-1 ${editing ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
          title={editing ? 'Cancelar' : 'Editar'}
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Formulario edición */}
      {editing && (
        <div className="px-4 py-4 border-t border-slate-100 bg-white flex flex-col gap-5">

          {/* ── Identificación ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Identificación</p>

            <div className="grid sm:grid-cols-2 gap-4">
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
            </div>

            <div className="flex flex-wrap items-end gap-5">
              {/* Modalidad: Indoor / Outdoor — en el modelo es `indoor` (boolean), Outdoor = indoor:false */}
              <div>
                <span className="block text-slate-500 text-xs font-medium mb-1.5">Modalidad</span>
                <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setLocal((prev) => ({ ...prev, indoor: true }))}
                    className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all ${local.indoor ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Indoor
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocal((prev) => ({ ...prev, indoor: false }))}
                    className={`px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all ${!local.indoor ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Outdoor
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" name="activa" checked={local.activa} onChange={handleChange} className="rounded accent-emerald-500" />
                <span className="text-sm text-slate-600">Cancha activa</span>
              </label>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* ── Tarifa ── */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tarifa</p>
            <div className="max-w-xs">
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

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <Save size={13} />
              Guardar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Convierte "HH:MM" a minutos totales
const _hMin = (t) => { const [h, m] = (t || '00:00').split(':').map(Number); return h * 60 + (m || 0) }

const TabCanchas = ({ club, updateCancha, setCantidadCanchas, updateHorario, saveClub, updateClub, token }) => {
  const [saved, setSaved] = useState(false)
  const [pendingDesactivar, setPendingDesactivar] = useState(null)
  // { titulo, mensaje, nivel: 'apertura'|'cierre', checked, applyFn }
  const [pendingHorario, setPendingHorario] = useState(null)
  // sets vacíos hasta que el backend responda (optimista)
  const [existingData, setExistingData] = useState({ diasConDatos: new Set(), canchaDiaConDatos: new Set() })
  const cantidad = club.canchas.length
  const horasCancelacion = club.horasCancelacion ?? 0

  useEffect(() => {
    if (!token) return
    const auth = { Authorization: `Bearer ${token}` }
    const DIAS_SEM = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    Promise.all([
      api.get('/reservas', auth).catch(() => []),
      api.get('/turnos-fijos', auth).catch(() => []),
    ]).then(([reservas, turnos]) => {
      const hoy = new Date().toISOString().split('T')[0]
      const diasConDatos = new Set()
      const canchaDiaConDatos = new Set()
      // Solo reservas futuras (las pasadas ya ocurrieron, cambiar apertura no las afecta)
      reservas.filter(r => r.fecha >= hoy).forEach((r) => {
        const dia = DIAS_SEM[new Date(r.fecha + 'T00:00:00').getDay()]
        diasConDatos.add(dia)
        canchaDiaConDatos.add(`${r.canchaId}:${dia}`)
      })
      // Solo turnos activos (confirmado/pendiente). Normalizar lowercase del DB a capitalizado del frontend.
      const diaMap = Object.fromEntries(DIAS_SEM.map(d => [d.toLowerCase(), d]))
      turnos.filter(t => t.estado === 'confirmado' || t.estado === 'pendiente').forEach((t) => {
        const dia = diaMap[t.dia?.toLowerCase()] ?? t.dia
        diasConDatos.add(dia)
        canchaDiaConDatos.add(`${t.canchaId}:${dia}`)
      })
      setExistingData({ diasConDatos, canchaDiaConDatos })
    }).catch(() => {
      setExistingData({ diasConDatos: new Set(['*']), canchaDiaConDatos: new Set(['*']) })
    })
  }, [token])

  // Retorna true si hay reservas/turnos en ese día (para horario global)
  const hasDatosDia = (dia) => existingData.diasConDatos.has(dia) || existingData.diasConDatos.has('*')

  // Retorna true si hay reservas/turnos en esa cancha ese día (para horario custom)
  const hasDatosCanchaDia = (canchaId, dia) => existingData.canchaDiaConDatos.has(`${canchaId}:${dia}`) || existingData.canchaDiaConDatos.has('*')

  const confirmarApertura = ({ titulo, mensaje, applyFn }) => {
    setPendingHorario({ titulo, mensaje, nivel: 'apertura', checked: false, applyFn })
  }

  const confirmarCierreReducido = ({ titulo, mensaje, applyFn }) => {
    setPendingHorario({ titulo, mensaje, nivel: 'cierre', checked: false, applyFn })
  }

  const handleSave = () => {
    saveClub()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Configuración general */}
      <SectionCard title="Configuración general" subtitle="Cantidad de canchas y política de cancelación">
        <div className="flex flex-col gap-4">

          {/* Política de cancelación */}
          <div className="flex flex-col gap-2 p-3 md:p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-slate-700 font-medium text-sm">Plazo mínimo de cancelación</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Si el jugador cancela con menos de este tiempo de anticipación, se registra un cargo automático.
                Ponê 0 para deshabilitar.
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="number"
                min={0}
                max={168}
                value={horasCancelacion}
                onChange={(e) => updateClub({ horasCancelacion: Number(e.target.value) })}
                className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 font-semibold text-center focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <span className="text-slate-500 text-sm">horas de anticipación</span>
              {horasCancelacion > 0 && (
                <span className="text-emerald-600 text-xs font-medium bg-emerald-50 px-2 py-1 rounded-lg">
                  Cargo = precio del turno
                </span>
              )}
            </div>
          </div>

          {/* Cantidad de canchas */}
          <div className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-xl">
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

      {/* Resumen tarifas — solo desktop (en mobile la info ya está en cada CanchaRow) */}
      <div className="hidden sm:block">
      <SectionCard title="Resumen de tarifas">
        <div className="overflow-x-auto w-full rounded-xl border border-slate-100">
          <table className="w-full min-w-[320px] text-sm">
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
      </div>

      {/* Horarios de apertura */}
      <SectionCard title="Horarios de apertura" subtitle="Configurá los horarios del club por día">

        {/* Info box */}
        <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-3">
          <Info size={15} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-600 leading-relaxed">
            <span className="font-semibold">Los turnos son de 1.5h.</span> El cierre muestra solo las opciones exactas
            (apertura + múltiplos de 1.5h), así el sistema garantiza que todos los turnos queden perfectamente alineados.
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {DIAS.map((dia) => {
            const h = club.horarios[dia]
            return (
              <div
                key={dia}
                className={`rounded-xl transition-colors ${h.activo ? 'bg-slate-50' : 'bg-slate-50/40 opacity-60'}`}
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
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
                    <HorarioSelect
                      apertura={h.apertura}
                      cierre={h.cierre}
                      onAperturaChange={(newAp, newCierre) => {
                        if (newAp === h.apertura) { updateHorario(dia, { apertura: newAp, cierre: newCierre }); return }
                        if (!hasDatosDia(dia)) { updateHorario(dia, { apertura: newAp, cierre: newCierre }); return }
                        confirmarApertura({
                          titulo: `Cambiar apertura — ${dia} (horario general)`,
                          mensaje: `Estás por cambiar la apertura del ${dia} de ${h.apertura} a ${newAp}. Esto desplaza todas las franjas de la grilla en ese día para todas las canchas que no tienen horario propio. Las reservas y turnos fijos existentes en esos horarios pueden quedar fuera de la grilla visual.`,
                          applyFn: () => updateHorario(dia, { apertura: newAp, cierre: newCierre }),
                        })
                      }}
                      onCierreChange={(newCierre) => {
                        const oldMin = _hMin(h.cierre)
                        const newMin = _hMin(newCierre)
                        if (newMin < oldMin && hasDatosDia(dia)) {
                          confirmarCierreReducido({
                            titulo: `Reducir cierre — ${dia} (horario general)`,
                            mensaje: `Estás por reducir el cierre del ${dia} de ${h.cierre} a ${newCierre}. Las reservas o turnos fijos en las franjas que queden fuera del nuevo horario van a aparecer como "Fuera de grilla".`,
                            applyFn: () => updateHorario(dia, { cierre: newCierre }),
                          })
                        } else {
                          updateHorario(dia, { cierre: newCierre })
                        }
                      }}
                    />
                  ) : (
                    <span className="text-slate-400 text-sm italic">Cerrado</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Horarios personalizados por cancha */}
      <SectionCard title="Horarios personalizados por cancha" subtitle="Sobreescribí el horario general para una cancha específica">
        <div className="flex flex-col gap-2">
          {club.canchas.map((c) => {
            const tieneCustom = !!c.horarios
            const horariosActivos = c.horarios ?? HORARIOS_CANCHA_DEFAULT
            return (
              <div key={c.id} className="border border-slate-100 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                  <button
                    onClick={() => {
                      if (tieneCustom) {
                        setPendingDesactivar(c)
                      } else {
                        updateCancha(c.id, { ...c, horarios: { ...HORARIOS_CANCHA_DEFAULT } })
                      }
                    }}
                    className={[
                      'relative w-10 h-5 rounded-full transition-all duration-300 shrink-0',
                      tieneCustom ? 'bg-blue-500' : 'bg-slate-200',
                    ].join(' ')}
                  >
                    <div className={[
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300',
                      tieneCustom ? 'left-5' : 'left-0.5',
                    ].join(' ')} />
                  </button>
                  <div>
                    <p className="text-slate-700 font-medium text-sm">{c.nombre}</p>
                    <p className="text-slate-400 text-xs">
                      {tieneCustom ? 'Horario propio activo' : 'Hereda el horario general del club'}
                    </p>
                  </div>
                </div>

                {tieneCustom && (
                  <div className="px-4 py-3 border-t border-slate-100 flex flex-col gap-2">
                    {DIAS.map((dia) => {
                      const h = horariosActivos[dia] ?? { apertura: '08:00', cierre: '23:00', activo: true }
                      return (
                        <div key={dia} className={`rounded-xl transition-colors ${h.activo ? 'bg-slate-50' : 'bg-slate-50/40 opacity-60'}`}>
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <button
                              onClick={() => updateCancha(c.id, (curr) => ({
                                horarios: { ...curr.horarios, [dia]: { ...(curr.horarios?.[dia] ?? h), activo: !h.activo } },
                              }))}
                              className={['relative w-9 h-[18px] rounded-full transition-all duration-300 shrink-0', h.activo ? 'bg-emerald-500' : 'bg-slate-200'].join(' ')}
                            >
                              <div className={['absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all duration-300', h.activo ? 'left-[18px]' : 'left-0.5'].join(' ')} />
                            </button>
                            <span className="text-slate-700 font-medium text-xs w-20 shrink-0">{dia}</span>
                            {h.activo && (
                              <HorarioSelect
                                apertura={h.apertura}
                                cierre={h.cierre}
                                onAperturaChange={(newAp, newCierre) => {
                                  const apply = () => updateCancha(c.id, (curr) => ({ horarios: { ...curr.horarios, [dia]: { ...(curr.horarios?.[dia] ?? h), apertura: newAp, cierre: newCierre } } }))
                                  if (newAp === h.apertura || !hasDatosCanchaDia(c.id, dia)) { apply(); return }
                                  confirmarApertura({
                                    titulo: `Cambiar apertura — ${c.nombre} · ${dia}`,
                                    mensaje: `Estás por cambiar la apertura de ${c.nombre} el ${dia} de ${h.apertura} a ${newAp}. Esto desplaza todas las franjas de la grilla para esa cancha ese día. Las reservas y turnos fijos existentes en esos horarios pueden quedar fuera de la grilla visual.`,
                                    applyFn: apply,
                                  })
                                }}
                                onCierreChange={(newCierre) => {
                                  const oldMin = _hMin(h.cierre)
                                  const newMin = _hMin(newCierre)
                                  const apply = () => updateCancha(c.id, (curr) => ({ horarios: { ...curr.horarios, [dia]: { ...(curr.horarios?.[dia] ?? h), cierre: newCierre } } }))
                                  if (newMin < oldMin && hasDatosCanchaDia(c.id, dia)) {
                                    confirmarCierreReducido({
                                      titulo: `Reducir cierre — ${c.nombre} · ${dia}`,
                                      mensaje: `Estás por reducir el cierre de ${c.nombre} el ${dia} de ${h.cierre} a ${newCierre}. Las reservas o turnos fijos en las franjas que queden fuera del nuevo horario van a aparecer como "Fuera de grilla".`,
                                      applyFn: apply,
                                    })
                                  } else {
                                    apply()
                                  }
                                }}
                                size="xs"
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SaveButton onClick={handleSave} saved={saved} />

      {/* Modal advertencia cambio de apertura / cierre reducido */}
      {pendingHorario && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${pendingHorario.nivel === 'apertura' ? 'bg-red-100' : 'bg-amber-100'}`}>
              <AlertTriangle size={20} className={pendingHorario.nivel === 'apertura' ? 'text-red-500' : 'text-amber-500'} />
            </div>
            <h3 className="text-slate-800 font-bold mb-2 text-base">{pendingHorario.titulo}</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">{pendingHorario.mensaje}</p>

            {pendingHorario.nivel === 'apertura' && (
              <label className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pendingHorario.checked}
                  onChange={(e) => setPendingHorario((p) => ({ ...p, checked: e.target.checked }))}
                  className="mt-0.5 shrink-0 accent-red-500"
                />
                <span className="text-red-700 text-sm font-medium leading-snug">
                  Entiendo que las reservas y turnos fijos existentes pueden quedar fuera de la grilla visual y requerirán revisión manual.
                </span>
              </label>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPendingHorario(null)}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-2.5 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                disabled={pendingHorario.nivel === 'apertura' && !pendingHorario.checked}
                onClick={() => { pendingHorario.applyFn(); setPendingHorario(null) }}
                className={`flex-1 text-white font-bold rounded-xl py-2.5 text-sm transition-all ${
                  pendingHorario.nivel === 'apertura'
                    ? 'bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400'
                }`}
              >
                {pendingHorario.nivel === 'apertura' ? 'Confirmar cambio' : 'Cambiar igual'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal advertencia desactivar horario propio */}
      {pendingDesactivar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <AlertTriangle size={20} className="text-amber-500" />
            </div>
            <h3 className="text-slate-800 font-bold mb-2">¿Desactivar horario propio?</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-1">
              <span className="font-semibold text-slate-700">{pendingDesactivar.nombre}</span> tiene horarios personalizados configurados.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Si los desactivás, la cancha hereda el horario general del club. Las reservas existentes con horarios distintos pueden quedar{' '}
              <span className="text-amber-600 font-medium">fuera de la grilla visual</span>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDesactivar(null)}
                className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl py-2.5 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  updateCancha(pendingDesactivar.id, { ...pendingDesactivar, horarios: null })
                  setPendingDesactivar(null)
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl py-2.5 text-sm transition-all"
              >
                Desactivar igual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Hero ──────────────────────────────────────────────────────────────

const TabHero = ({ club, updateClub, saveClub }) => {
  const token = useAuthStore((s) => s.token)
  const toast = useToast()
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

  const handleImagen = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = await uploadImage(file, { profile: 'fondo', folder: 'club', token })
      setForm((prev) => ({ ...prev, heroImagen: url }))
    } catch (err) {
      console.error('Error al subir imagen:', err)
      toast.error('No se pudo subir la imagen. Probá de nuevo.')
    }
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
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="shrink-0 w-full sm:w-auto">
            <div
              onClick={() => fileRef.current.click()}
              className="w-full sm:w-48 h-28 rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group"
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
  const token = useAuthStore((s) => s.token)
  const toast = useToast()
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

  const handleFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = await uploadImage(file, { profile: 'galeria', folder: 'club', token })
      setForm((prev) => ({ ...prev, fotoPrincipal: url }))
    } catch (err) {
      console.error('Error al subir imagen:', err)
      toast.error('No se pudo subir la imagen. Probá de nuevo.')
    }
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
  const token = useAuthStore((s) => s.token)
  const toast = useToast()
  const [items, setItems] = useState(club.galeria ?? [])
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''
    if (files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const url = await uploadImage(file, { profile: 'galeria', folder: 'club', token })
        setItems((prev) => [...prev, { id: Date.now() + Math.random(), url, caption: '' }])
      }
    } catch (err) {
      console.error('Error al subir imágenes:', err)
      toast.error('No se pudieron subir todas las imágenes. Probá de nuevo.')
    } finally {
      setUploading(false)
    }
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
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50">
        <div className={`w-2 h-2 rounded-full shrink-0 ${servicio.activo ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 font-semibold text-sm truncate">{servicio.titulo}</p>
          <p className="hidden sm:block text-slate-400 text-xs mt-0.5 truncate">{servicio.descripcion}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onUpdate(servicio.id, { activo: !servicio.activo })}
            className={`relative w-9 h-5 rounded-full transition-all duration-300 ${servicio.activo ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${servicio.activo ? 'left-4' : 'left-0.5'}`} />
          </button>
          <button onClick={() => { setEditing((v) => !v); setLocal({ ...servicio }) }} title={editing ? 'Cancelar' : 'Editar'} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${editing ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(servicio.id)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-4 py-4 border-t border-slate-100 bg-white flex flex-col gap-4">
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
  const token = useAuthStore((s) => s.token)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState({ ...miembro })
  const fileRef = useRef()
  const inicial = miembro.nombre?.charAt(0)?.toUpperCase() ?? '?'

  const handleFoto = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = await uploadImage(file, { profile: 'avatar', folder: 'club', token })
      setLocal((p) => ({ ...p, foto: url }))
    } catch (err) {
      console.error('Error al subir foto:', err)
      toast.error('No se pudo subir la foto. Probá de nuevo.')
    }
  }

  const handleSave = () => { onUpdate(miembro.id, local); setEditing(false) }

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-3.5 bg-slate-50">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0 flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-sm">
          {miembro.foto ? <img src={miembro.foto} alt={miembro.nombre} className="w-full h-full object-cover" /> : inicial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 font-semibold text-sm truncate">{miembro.nombre}</p>
          <p className="text-slate-400 text-xs truncate">{miembro.rol}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { setEditing((v) => !v); setLocal({ ...miembro }) }} title={editing ? 'Cancelar' : 'Editar'} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${editing ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(miembro.id)} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-4 py-4 border-t border-slate-100 bg-white flex flex-col gap-4">
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
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
        <div className="w-10 h-10 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center shrink-0">
          <span className="text-orange-600 font-bold text-sm">{inicial || '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 font-semibold text-sm truncate">
            {profesor.nombre} {profesor.apellido}
          </p>
          <p className="text-slate-400 text-xs truncate hidden sm:block">{profesor.email} · {profesor.especialidad || 'Sin especialidad'}</p>
          <p className="text-slate-400 text-xs truncate sm:hidden">{profesor.especialidad || 'Sin especialidad'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`hidden sm:inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border ${profesor.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
            {profesor.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            onClick={() => { setEditing((v) => !v); setLocal({ ...profesor }) }}
            title={editing ? 'Cancelar edición' : 'Editar profesor'}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${editing ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>

      {/* Formulario de edición */}
      {editing && (
        <div className="px-4 py-4 border-t border-slate-100 bg-white flex flex-col gap-4">
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
              <label className="block text-slate-500 text-xs font-medium mb-1.5">
                Contraseña
                <span className="text-slate-300 font-normal ml-1">(vacío = no cambiar)</span>
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={local.password}
                  placeholder="Nueva contraseña..."
                  onChange={(e) => setLocal((p) => ({ ...p, password: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-9 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 transition-colors"
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
            <div>
              <label className="block text-slate-500 text-xs font-medium mb-1.5">Celular</label>
              <input
                type="tel"
                value={local.celular ?? ''}
                onChange={(e) => setLocal((p) => ({ ...p, celular: e.target.value }))}
                placeholder="+54 9 11 ..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400 transition-colors"
              />
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
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <button
              type="button"
              onClick={() => setLocal((p) => ({ ...p, activo: !p.activo }))}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${local.activo ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${local.activo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <div>
              <p className="text-slate-700 text-sm font-medium">
                Acceso al portal — {local.activo ? <span className="text-emerald-600">Activo</span> : <span className="text-slate-400">Inactivo</span>}
              </p>
              <p className="text-slate-400 text-xs">
                {local.activo
                  ? 'El profesor puede iniciar sesión en /dashboardProfesor'
                  : 'La cuenta está suspendida. El profesor no puede acceder al portal'}
              </p>
            </div>
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

// Reglas de validación por campo
const getPasswordStrength = (v) => {
  if (!v || v.length < 6) return null
  const hasLetter  = /[a-zA-Z]/.test(v)
  const hasNumber  = /\d/.test(v)
  const hasSpecial = /[^a-zA-Z0-9]/.test(v)
  const score = (hasLetter ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0)
  if (v.length >= 10 && score >= 3) return 'alto'
  if (v.length >= 8  && score >= 2) return 'medio'
  return 'bajo'
}

const STRENGTH_STYLES = {
  bajo:  { color: 'text-red-500',    bar: 'bg-red-400',    w: 'w-1/3' },
  medio: { color: 'text-amber-500',  bar: 'bg-amber-400',  w: 'w-2/3' },
  alto:  { color: 'text-emerald-500', bar: 'bg-emerald-400', w: 'w-full' },
}

const VALIDATORS_PROF = {
  nombre:   (v) => !v.trim() ? 'El nombre es requerido' : v.trim().length < 2 ? 'Mínimo 2 caracteres' : /\d/.test(v) ? 'El nombre no puede contener números' : '',
  apellido: (v) => !v.trim() ? 'El apellido es requerido' : /\d/.test(v) ? 'El apellido no puede contener números' : '',
  email:    (v) => !v.trim() ? 'El email es requerido' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Ingresá un email válido' : '',
  password: (v) => !v ? 'La contraseña es requerida' : v.length < 6 ? 'Mínimo 6 caracteres' : '',
}

const TabProfesores = ({ club, token }) => {
  const { profesores, setProfesores, addProfesor, updateProfesor } = useProfesoresStore()
  const [agregando, setAgregando] = useState(false)
  const NUEVO_INIT = { nombre: '', apellido: '', email: '', password: '', especialidad: '', canchasIds: [] }
  const [nuevo, setNuevo] = useState(NUEVO_INIT)
  const [fieldErrors, setFieldErrors] = useState({})
  const [hints, setHints] = useState({})
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const hintTimers = useRef({})
  const [ayudaAbierta, setAyudaAbierta] = useState(false)
  const toast = useToast()

  const showToast = (msg, type = 'ok') => (type === 'ok' ? toast.success(msg) : toast.error(msg))

  const headers = { Authorization: `Bearer ${token}` }
  const canchas = club.canchas?.filter((c) => c.activa) ?? CANCHAS_DEFAULT

  useEffect(() => {
    if (!token) return
    api.get('/profesores', headers)
      .then((data) => { if (Array.isArray(data)) setProfesores(data) })
      .catch(() => {})
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const showHint = (field, msg) => {
    setHints((h) => ({ ...h, [field]: msg }))
    clearTimeout(hintTimers.current[field])
    hintTimers.current[field] = setTimeout(() => setHints((h) => ({ ...h, [field]: '' })), 2000)
  }

  const validateField = (field, value) => {
    const err = VALIDATORS_PROF[field]?.(value) ?? ''
    setFieldErrors((e) => ({ ...e, [field]: err }))
    return err
  }

  const handleChange = (field, raw) => {
    let value = raw
    // Bloquear números en nombre/apellido
    if (field === 'nombre' || field === 'apellido') {
      const filtered = raw.replace(/[0-9]/g, '')
      if (raw !== filtered) showHint(field, 'No puede contener números')
      value = filtered
    }
    setNuevo((p) => ({ ...p, [field]: value }))
    if (fieldErrors[field]) validateField(field, value)
    // Validar contraseña en tiempo real
    if (field === 'password') validateField('password', value)
  }

  const handleBlur = (field) => validateField(field, nuevo[field])

  const handleAdd = async () => {
    setServerError('')
    // Validar todos los campos requeridos
    const errs = {}
    ;['nombre', 'apellido', 'email', 'password'].forEach((f) => {
      const e = VALIDATORS_PROF[f]?.(nuevo[f]) ?? ''
      if (e) errs[f] = e
    })
    if (Object.keys(errs).length) { setFieldErrors((prev) => ({ ...prev, ...errs })); return }
    if (submitting) return
    setSubmitting(true)
    try {
      const creado = await api.post('/profesores', { ...nuevo, email: nuevo.email.trim().toLowerCase() }, headers)
      addProfesor(creado)
      setNuevo(NUEVO_INIT)
      setFieldErrors({})
      setAgregando(false)
      showToast('Profesor creado correctamente')
    } catch (err) {
      setServerError(err?.message || 'Error al crear el profesor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id, data) => {
    try {
      const updated = await api.patch(`/profesores/${id}`, data, headers)
      updateProfesor(id, updated)
      showToast('Profesor actualizado correctamente')
    } catch (err) {
      showToast(err?.message || 'Error al actualizar el profesor', 'err')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.patch(`/profesores/${id}`, { activo: false }, headers)
      updateProfesor(id, { activo: false })
      showToast('Profesor desactivado', 'warn')
    } catch (err) {
      showToast(err?.message || 'Error al desactivar el profesor', 'err')
    }
  }

  const toggleCanchaNew = (id) => {
    setNuevo((p) => ({
      ...p,
      canchasIds: p.canchasIds.includes(id)
        ? p.canchasIds.filter((c) => c !== id)
        : [...p.canchasIds, id],
    }))
  }

  const TOAST_STYLES = {
    ok:   'bg-emerald-500',
    warn: 'bg-amber-500',
    err:  'bg-red-500',
  }

  return (
    <div className="flex flex-col gap-4 relative">
      {/* Toast */}
      <SectionCard
        title="Profesores del club"
        subtitle="Los profesores pueden acceder a su portal en /dashboardProfesor para gestionar su agenda de clases"
      >
        {/* Encabezado con botón de ayuda */}
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => setAyudaAbierta((v) => !v)}
            title="¿Cómo funciona?"
            className={[
              'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors',
              ayudaAbierta
                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300',
            ].join(' ')}
          >
            <HelpCircle size={13} /> ¿Cómo funciona?
          </button>
        </div>

        {/* Panel de ayuda */}
        {ayudaAbierta && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <HelpCircle size={14} className="text-emerald-600" />
                </div>
                <h3 className="text-slate-800 font-semibold text-sm">Gestión de profesores</h3>
              </div>
              <button onClick={() => setAyudaAbierta(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2.5">Acciones por profesor</p>
                <div className="flex flex-col gap-2">
                  {[
                    { icon: <Pencil size={12} />, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Lápiz', desc: 'Abre el formulario para editar nombre, email, celular, especialidad, canchas asignadas y contraseña. Para activar o desactivar el acceso al portal usá el toggle dentro del formulario.' },
                  ].map(({ icon, color, label, desc }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${color}`}>{icon}</div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        <span className="font-medium text-slate-700">{label}</span> — {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2.5">Estados</p>
                <div className="flex flex-col gap-2">
                  {[
                    { color: 'bg-emerald-500', label: 'Activo', desc: 'El profesor puede iniciar sesión y crear clases desde /dashboardProfesor.' },
                    { color: 'bg-slate-300',   label: 'Inactivo', desc: 'La cuenta está suspendida. El profesor no puede acceder al portal hasta que se reactive.' },
                  ].map(({ color, label, desc }) => (
                    <div key={label} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${color} mt-1 shrink-0`} />
                      <p className="text-xs text-slate-500 leading-relaxed">
                        <span className="font-medium text-slate-700">{label}</span> — {desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Canchas habilitadas</p>
                <p className="text-xs text-slate-500 leading-relaxed">Si no se selecciona ninguna cancha, el profesor puede crear clases en todas las canchas activas del club. Seleccioná una o más para restringir su acceso.</p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-600 mb-2">Contraseña</p>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-medium text-slate-700">El campo aparece vacío al editar</span> — esto es normal. Por seguridad, las contraseñas se guardan cifradas y nunca se pueden recuperar.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-medium text-slate-700">Para no cambiarla:</span> dejá el campo en blanco y guardá. La contraseña actual queda intacta.
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-medium text-slate-700">Para resetearla:</span> escribí la nueva contraseña en el campo y guardá. El profesor puede ingresar con la nueva contraseña desde ese momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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

              {/* Nombre */}
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Nombre *</label>
                <input
                  value={nuevo.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  onBlur={() => handleBlur('nombre')}
                  placeholder="María"
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-white transition-colors ${fieldErrors.nombre ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-emerald-400'}`}
                />
                {hints.nombre && <p className="text-amber-500 text-xs mt-1 animate-pulse">{hints.nombre}</p>}
                {fieldErrors.nombre && <p className="text-red-500 text-xs mt-1">{fieldErrors.nombre}</p>}
              </div>

              {/* Apellido */}
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Apellido *</label>
                <input
                  value={nuevo.apellido}
                  onChange={(e) => handleChange('apellido', e.target.value)}
                  onBlur={() => handleBlur('apellido')}
                  placeholder="González"
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-white transition-colors ${fieldErrors.apellido ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-emerald-400'}`}
                />
                {hints.apellido && <p className="text-amber-500 text-xs mt-1 animate-pulse">{hints.apellido}</p>}
                {fieldErrors.apellido && <p className="text-red-500 text-xs mt-1">{fieldErrors.apellido}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Email (login) *</label>
                <input
                  type="text"
                  inputMode="email"
                  value={nuevo.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="maria@club.com"
                  className={`w-full border rounded-lg px-3 py-2 text-sm text-slate-700 outline-none bg-white transition-colors ${fieldErrors.email ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-emerald-400'}`}
                />
                {fieldErrors.email && <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-slate-500 text-xs font-medium mb-1.5">Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={nuevo.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
                    placeholder="••••••••"
                    className={`w-full border rounded-lg px-3 py-2 pr-9 text-sm text-slate-700 outline-none bg-white transition-colors ${fieldErrors.password ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-emerald-400'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showPass ? <Moon size={14} /> : <Sun size={14} />}
                  </button>
                </div>
                {(() => {
                  const level = getPasswordStrength(nuevo.password)
                  if (!level) return null
                  const s = STRENGTH_STYLES[level]
                  return (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${s.bar} ${s.w}`} />
                      </div>
                      <span className={`text-xs font-medium capitalize ${s.color}`}>{level}</span>
                    </div>
                  )
                })()}
                {fieldErrors.password && <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Especialidad */}
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

            {serverError && (
              <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{serverError}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setAgregando(false); setFieldErrors({}); setServerError('') }}
                className="text-sm text-slate-400 hover:text-slate-600 px-4 py-2 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCircle size={13} /> {submitting ? 'Creando...' : 'Crear profesor'}
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { club, updateClub, updateCancha, updateHorario, setCantidadCanchas, saveClub } = useClubStore()
  const token = useAuthStore((s) => s.token)
  const boundSaveClub = () => saveClub(token)

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Club</h2>
        <p className="text-slate-400 text-sm mt-1">Información pública, apariencia y configuración general</p>
      </div>

      {/* Tabs — mobile: bottom sheet / desktop: pills */}
      <div className="sm:hidden">
        {/* Overlay */}
        {dropdownOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setDropdownOpen(false)}
          />
        )}
        {/* Trigger */}
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-3 bg-slate-100 rounded-xl px-4 py-3 text-sm font-medium text-slate-700"
        >
          <div className="flex items-center gap-2.5">
            {(() => {
              const current = TABS.find(t => t.key === activeTab)
              const CurrentIcon = current?.icon
              return CurrentIcon ? <><CurrentIcon size={15} className="text-brand-500" /><span>{current.label}</span></> : null
            })()}
          </div>
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {/* Bottom sheet */}
        {dropdownOpen && (
          <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-slate-100">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Sección del club</span>
              <button onClick={() => setDropdownOpen(false)} className="text-slate-400 hover:text-slate-600">
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] pb-4">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setDropdownOpen(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm transition-colors ${
                    activeTab === key
                      ? 'bg-brand-500/5 text-brand-600 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={15} className={activeTab === key ? 'text-brand-500' : 'text-slate-400'} />
                  {label}
                  {activeTab === key && <Check size={13} className="ml-auto text-brand-500" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="hidden sm:flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
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
      {activeTab === 'info'       && <TabInfo       club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'canchas'    && <TabCanchas    club={club} updateCancha={updateCancha} setCantidadCanchas={setCantidadCanchas} updateHorario={updateHorario} saveClub={boundSaveClub} updateClub={updateClub} token={token} />}
      {activeTab === 'historia'   && <TabHistoria   club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'hero'       && <TabHero       club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'galeria'    && <TabGaleria    club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'servicios'  && <TabServicios  club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'staff'       && <TabStaff       club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'profesores'  && <TabProfesores  club={club} token={token} />}
      {activeTab === 'faq'         && <TabFaq         club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
      {activeTab === 'apariencia' && <TabApariencia club={club} updateClub={updateClub} saveClub={boundSaveClub} />}
    </div>
  )
}

export default QuienesSomosPage
