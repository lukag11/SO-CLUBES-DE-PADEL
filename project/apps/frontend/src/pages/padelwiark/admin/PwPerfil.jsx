import { useState, useEffect } from 'react'
import { MessageCircle, Mail, Loader2, Check, ChevronDown, Globe } from 'lucide-react'
import { api } from '../../../lib/api'
import usePlatformStore from '../../../store/platformStore'

// Perfil de PadelwIArk (plataforma): contacto de ventas que usa el CTA "Mejorar plan" de los clubes.
// Se carga UNA vez acá y el modal lo lee (GET /platform/contacto). El día que cargás el WhatsApp,
// el botón de upgrade de TODOS los clubes empieza a funcionar solo — sin tocar código.

// Prefijos de país para WhatsApp (código de país + móvil). Argentina usa 549 (54 + 9 de celular).
// Se muestran con bandera REAL (imagen) porque Windows no renderiza los emojis de bandera.
const PAISES = [
  { code: 'AR', nombre: 'Argentina', prefijo: '549' },
  { code: 'UY', nombre: 'Uruguay',   prefijo: '598' },
  { code: 'PY', nombre: 'Paraguay',  prefijo: '595' },
  { code: 'BO', nombre: 'Bolivia',   prefijo: '591' },
  { code: 'CL', nombre: 'Chile',     prefijo: '56'  },
  { code: 'PE', nombre: 'Perú',      prefijo: '51'  },
  { code: 'CO', nombre: 'Colombia',  prefijo: '57'  },
  { code: 'BR', nombre: 'Brasil',    prefijo: '55'  },
  { code: 'MX', nombre: 'México',    prefijo: '52'  },
  { code: 'US', nombre: 'EE.UU.',    prefijo: '1'   },
  { code: 'ES', nombre: 'España',    prefijo: '34'  },
]

const flagUrl = (code) => `https://flagcdn.com/24x18/${code.toLowerCase()}.png`
const Flag = ({ code, className = '' }) =>
  code
    ? <img src={flagUrl(code)} srcSet={`https://flagcdn.com/48x36/${code.toLowerCase()}.png 2x`} width={24} height={18} alt={code} className={`rounded-sm object-cover ${className}`} />
    : <Globe size={18} className={`text-[#9ba89f] ${className}`} />

// Dado el prefijo guardado, encuentra el país (para pintar la bandera). null = "Otro".
const paisByPrefijo = (pfx) => PAISES.find((p) => p.prefijo === String(pfx)) || null

const PwPerfil = ({ notify }) => {
  const token = usePlatformStore((s) => s.token)
  const [prefijo, setPrefijo] = useState('549')
  const [code, setCode] = useState('AR')      // code de país para la bandera (null = "Otro")
  const [customMode, setCustomMode] = useState(false)
  const [open, setOpen] = useState(false)
  const [area, setArea] = useState('')
  const [numero, setNumero] = useState('')
  const [email, setEmail] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.get('/platform/contacto')
      .then((c) => {
        const pfx = String(c?.prefijo || '549')
        const pais = paisByPrefijo(pfx)
        setPrefijo(pfx); setCode(pais?.code || null); setCustomMode(!pais)
        setArea(c?.area || ''); setNumero(c?.numero || ''); setEmail(c?.email || '')
      })
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const elegirPais = (p) => { setPrefijo(p.prefijo); setCode(p.code); setCustomMode(false); setOpen(false) }
  const elegirOtro = () => { setCode(null); setCustomMode(true); setPrefijo(''); setOpen(false) }

  const guardar = async () => {
    if (guardando) return
    setGuardando(true)
    try {
      await api.patch('/platform/contacto', { prefijo, area, numero, email }, { Authorization: `Bearer ${token}` })
      notify?.('Contacto de ventas guardado ✓', 'ok')
    } catch {
      notify?.('No se pudo guardar', 'error')
    } finally { setGuardando(false) }
  }

  const inputCls = 'w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#f4f5ef] outline-none focus:border-[#afca0b]/50 transition-colors'
  const labelCls = 'block text-xs text-[#9ba89f] mb-1.5'

  return (
    <div className="max-w-lg">
      <h1 className="pw-display text-xl font-semibold text-[#f4f5ef] mb-1">Contacto de ventas</h1>
      <p className="text-sm text-[#9ba89f] mb-6">Cuando un club toca <b className="text-[#f4f5ef]">"Mejorar plan"</b>, te escribe por acá. Cargá tu WhatsApp y el botón empieza a funcionar solo en todos los clubes.</p>

      {cargando ? (
        <div className="flex items-center gap-2 text-[#9ba89f] text-sm"><Loader2 size={16} className="animate-spin" /> Cargando…</div>
      ) : (
        <div className="rounded-2xl border border-white/8 bg-[#141c18]/60 p-6 flex flex-col gap-4">
          <div>
            <label className={labelCls}><MessageCircle size={12} className="inline mr-1 -mt-0.5" /> WhatsApp de ventas</label>

            {/* Fila: país (bandera+prefijo) · área · número */}
            <div className="flex gap-2">
              {/* Selector de país propio (banderas reales) */}
              <div className="relative shrink-0">
                <button type="button" onClick={() => setOpen((v) => !v)} className={`${inputCls} flex items-center gap-2 pr-2 whitespace-nowrap`}>
                  <Flag code={code} />
                  <span className="text-[#f4f5ef]">+{prefijo || '—'}</span>
                  <ChevronDown size={14} className="text-[#9ba89f]" />
                </button>
                {open && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute z-20 mt-1 w-56 max-h-64 overflow-auto rounded-xl border border-white/10 bg-[#0f1512] shadow-2xl py-1">
                      {PAISES.map((p) => (
                        <button key={p.code} type="button" onClick={() => elegirPais(p)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#f4f5ef] hover:bg-white/5 transition-colors">
                          <Flag code={p.code} />
                          <span className="flex-1 text-left">{p.nombre}</span>
                          <span className="text-[#9ba89f]">+{p.prefijo}</span>
                        </button>
                      ))}
                      <button type="button" onClick={elegirOtro} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#9ba89f] hover:bg-white/5 transition-colors border-t border-white/5 mt-1">
                        <Globe size={18} /> <span className="flex-1 text-left">Otro país…</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {customMode && (
                <input className={`${inputCls} w-20 shrink-0`} value={prefijo} onChange={(e) => setPrefijo(e.target.value.replace(/[^\d]/g, ''))} placeholder="prefijo" inputMode="numeric" title="Código de país (ej. 351 = Italia)" />
              )}

              <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value.replace(/[^\d]/g, ''))} placeholder="Área" inputMode="numeric" />
              <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value.replace(/[^\d]/g, ''))} placeholder="Número" inputMode="numeric" />
            </div>

            <p className="text-[11px] text-[#9ba89f]/70 mt-1.5">
              Quedaría <span className="text-[#f4f5ef]">+{prefijo || '—'} {area || '…'} {numero || '…'}</span>. En Argentina: área sin el 0 y número sin el 15.
            </p>
          </div>

          <div>
            <label className={labelCls}><Mail size={12} className="inline mr-1 -mt-0.5" /> Email de ventas <span className="opacity-50">(opcional)</span></label>
            <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ventas@padelwiark.com" type="email" />
            <p className="text-[11px] text-[#9ba89f]/70 mt-1">Se usa como respaldo si no cargás WhatsApp.</p>
          </div>

          <button onClick={guardar} disabled={guardando} className="pw-btn-lime flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 mt-1">
            {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : <><Check size={16} /> Guardar contacto</>}
          </button>
        </div>
      )}
    </div>
  )
}

export default PwPerfil
