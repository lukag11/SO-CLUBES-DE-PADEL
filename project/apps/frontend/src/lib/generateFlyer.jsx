import satori from 'satori'
import { getTemplateConfig } from './flyerTemplates'

// Fuentes locales (evitar CDN para no depender de red externa)
import font400Url from '@fontsource/inter/files/inter-latin-400-normal.woff?url'
import font700Url from '@fontsource/inter/files/inter-latin-700-normal.woff?url'
import font900Url from '@fontsource/inter/files/inter-latin-900-normal.woff?url'

// ── Font cache ────────────────────────────────────────────────────────────────

const FONT_CACHE = {}

const getFont = async (url) => {
  if (FONT_CACHE[url]) return FONT_CACHE[url]
  const buf = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Font not found: ${url}`)
    return r.arrayBuffer()
  })
  FONT_CACHE[url] = buf
  return buf
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const toDataUrl = async (url) => {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const res   = await fetch(url)
    const buf   = await res.arrayBuffer()
    const mime  = res.headers.get('content-type') || 'image/jpeg'
    const bytes = new Uint8Array(buf)
    let b64 = ''
    const chunk = 8192
    for (let i = 0; i < bytes.length; i += chunk) {
      b64 += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return `data:${mime};base64,${btoa(b64)}`
  } catch { return null }
}

const svgToPng = (svg, w, h) =>
  new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const img  = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })

const parseDate = (iso) => new Date((iso || '2025-01-01') + 'T12:00:00')

const SERVICIOS_LABELS = {
  indoor: 'Canchas indoor', bar: 'Bar y comidas',
  parking: 'Estacionamiento', cupos: 'Cupos limitados',
  vestuarios: 'Vestuarios', wifi: 'WiFi',
}

// Satori no soporta colores hex de 8 dígitos (#rrggbbaa) → usamos rgba()
const rgba = (hex, alpha) => {
  const h    = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r    = parseInt(full.slice(0, 2), 16)
  const g    = parseInt(full.slice(2, 4), 16)
  const b    = parseInt(full.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ── Builder ───────────────────────────────────────────────────────────────────

const buildElement = ({ torneo, club, logoDataUrl, bgDataUrl, cfg }) => {
  const categorias = Array.isArray(torneo.categorias) ? torneo.categorias : []
  const servicios  = Array.isArray(torneo.servicios)  ? torneo.servicios  : []
  const hasPremios = !!(torneo.premioPrimero || torneo.premioSegundo || torneo.premioSemifinal)
  const hasWsp     = !!torneo.whatsapp
  const hasServ    = servicios.length > 0
  const accent     = cfg.accent
  const isDark     = cfg.dark !== false

  const fechaI   = parseDate(torneo.fechaInicio)
  const fechaF   = parseDate(torneo.fechaFin || torneo.fechaInicio)
  const diaI     = fechaI.getDate()
  const diaF     = fechaF.getDate()
  const mes      = fechaF.toLocaleDateString('es-AR', { month: 'long' }).toUpperCase()
  const daysText = diaI === diaF ? String(diaI) : `${diaI} AL ${diaF}`
  const daysSize = daysText.length <= 2 ? 118 : daysText.length <= 5 ? 92 : 74

  const initials     = (club.nombre || 'PD').slice(0, 2).toUpperCase()
  const clubNombre   = (club.nombre || 'CLUB DE PADEL').toUpperCase()
  const showSubtitle = torneo.nombre && torneo.nombre.trim().length > 0

  const subTextColor = isDark ? 'rgba(255,255,255,0.4)' : cfg.subTextColor
  const bodyColor    = isDark ? 'white' : cfg.textColor

  // Satori: usar background sólido cuando es gradiente complejo (no soportado en position:absolute)
  const rootBg = cfg.dark !== false ? (cfg.id === 'fuego' ? '#1a0800' : '#09152a') : '#f1f5f9'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: 1080, height: 1080,
      background: rootBg,
      fontFamily: 'Inter', color: bodyColor,
    }}>

      {/* Foto de fondo */}
      {bgDataUrl && (
        <img src={bgDataUrl} width={1080} height={1080} style={{
          position: 'absolute', top: 0, left: 0,
          objectFit: 'cover', opacity: 0.28,
        }} />
      )}

      {/* Glow decorativo superior-derecho */}
      <div style={{
        display: 'flex', position: 'absolute',
        top: -200, right: -200, width: 640, height: 640,
        background: rgba(accent, 0.07), borderRadius: 320,
      }} />

      {/* Glow decorativo inferior-izquierdo */}
      <div style={{
        display: 'flex', position: 'absolute',
        bottom: -150, left: -150, width: 480, height: 480,
        background: rgba(accent, 0.055), borderRadius: 240,
      }} />

      {/* Rectángulo decorativo rotado */}
      <div style={{
        display: 'flex', position: 'absolute',
        top: -70, right: -70, width: 280, height: 280,
        background: rgba(accent, bgDataUrl ? 0.07 : 0.10),
        transform: 'rotate(45deg)', borderRadius: 30,
      }} />

      {/* Barra superior */}
      <div style={{
        display: 'flex', position: 'absolute',
        top: 0, left: 0, right: 0, height: 8,
        background: accent,
      }} />

      {/* Barra izquierda */}
      <div style={{
        display: 'flex', position: 'absolute',
        top: 0, left: 0, bottom: 0, width: 14,
        background: accent,
      }} />

      {/* Contenido principal */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        paddingLeft: 80, paddingRight: 66, paddingTop: 72, paddingBottom: 32,
        flexGrow: 1,
      }}>

        {/* Nombre del club */}
        <div style={{
          display: 'flex', fontSize: 20, fontWeight: 700,
          letterSpacing: 7, color: accent,
          marginBottom: 22,
        }}>
          {clubNombre}
        </div>

        {/* TORNEO — hero */}
        <div style={{
          display: 'flex', fontSize: 200, fontWeight: 900,
          color: bodyColor, letterSpacing: -7,
          marginBottom: 4,
        }}>
          TORNEO
        </div>

        {/* DE PADEL */}
        <div style={{
          display: 'flex', fontSize: 58, fontWeight: 900,
          color: accent, letterSpacing: 13,
          marginBottom: showSubtitle ? 12 : 38,
        }}>
          DE PADEL
        </div>

        {/* Nombre del torneo como subtítulo */}
        {showSubtitle && (
          <div style={{
            display: 'flex', fontSize: 26, fontWeight: 700,
            color: subTextColor,
            letterSpacing: 3,
            marginBottom: 38,
          }}>
            {torneo.nombre.toUpperCase()}
          </div>
        )}

        {/* Línea divisora */}
        <div style={{
          display: 'flex', height: 3,
          background: accent,
          marginBottom: 44,
        }} />

        {/* Fila info */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flexGrow: 1,
        }}>

          {/* Izquierda: logo + categorías */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

            {/* Logo */}
            <div style={{
              display: 'flex', width: 92, height: 92, borderRadius: 22,
              background: isDark ? rgba(accent, 0.10) : rgba(accent, 0.08),
              borderWidth: 2, borderStyle: 'solid', borderColor: rgba(accent, 0.33),
              alignItems: 'center', justifyContent: 'center',
            }}>
              {logoDataUrl
                ? <img src={logoDataUrl} width={92} height={92} style={{ objectFit: 'cover' }} />
                : <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, color: accent }}>{initials}</div>
              }
            </div>

            {/* Categorías */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
              {categorias.map((cat, i) => (
                <div key={cat} style={{
                  display: 'flex', padding: '18px 36px', borderRadius: 14,
                  borderWidth: 3, borderStyle: 'solid',
                  borderColor: i === 0 ? accent : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)'),
                  background: i === 0 ? rgba(accent, 0.10) : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  fontSize: 36, fontWeight: 900,
                  color: i === 0 ? accent : bodyColor,
                  letterSpacing: 2,
                }}>
                  {cat}
                </div>
              ))}
              {torneo.genero && torneo.genero !== 'Mixto' && (
                <div style={{
                  display: 'flex', padding: '18px 36px', borderRadius: 14,
                  borderWidth: 3, borderStyle: 'solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)',
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  fontSize: 36, fontWeight: 900,
                  color: isDark ? 'rgba(255,255,255,0.6)' : subTextColor,
                  letterSpacing: 2,
                }}>
                  {torneo.genero}
                </div>
              )}
            </div>
          </div>

          {/* Derecha: fecha */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10,
          }}>
            <div style={{
              display: 'flex', fontSize: 18, fontWeight: 700, letterSpacing: 5,
              color: subTextColor, marginBottom: 8,
            }}>
              FECHA
            </div>
            <div style={{
              display: 'flex', fontSize: daysSize, fontWeight: 900,
              color: accent, letterSpacing: -2,
            }}>
              {daysText}
            </div>
            <div style={{
              display: 'flex', fontSize: 52, fontWeight: 900,
              color: bodyColor, letterSpacing: 2, marginTop: 10,
            }}>
              {mes}
            </div>
          </div>
        </div>

        {/* Premios */}
        {hasPremios && (
          <div style={{ display: 'flex', marginTop: 34, borderRadius: 18 }}>
            <div style={{ display: 'flex', width: 8, background: accent, flexShrink: 0 }} />
            <div style={{
              display: 'flex', flexDirection: 'column', flexGrow: 1,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
              padding: '24px 36px',
            }}>
              <div style={{
                display: 'flex', fontSize: 14, fontWeight: 700, letterSpacing: 4,
                color: subTextColor, marginBottom: 14,
              }}>
                PREMIOS
              </div>
              <div style={{ display: 'flex', gap: 54, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {torneo.premioPrimero && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: 14, color: subTextColor, marginBottom: 4 }}>1 Puesto</div>
                    <div style={{ display: 'flex', fontSize: 54, fontWeight: 900, color: accent }}>{torneo.premioPrimero}</div>
                  </div>
                )}
                {torneo.premioSegundo && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: 14, color: subTextColor, marginBottom: 4 }}>2 Puesto</div>
                    <div style={{ display: 'flex', fontSize: 54, fontWeight: 900, color: cfg.prize2Color }}>{torneo.premioSegundo}</div>
                  </div>
                )}
                {torneo.premioSemifinal && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: 14, color: subTextColor, marginBottom: 4 }}>Semifinal</div>
                    <div style={{ display: 'flex', fontSize: 54, fontWeight: 900, color: cfg.prizeSFColor }}>{torneo.premioSemifinal}</div>
                  </div>
                )}
              </div>
              {torneo.premioExtra && (
                <div style={{ display: 'flex', marginTop: 12, fontSize: 20, color: subTextColor }}>
                  {torneo.premioExtra}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Barra de servicios */}
      {hasServ && (
        <div style={{
          display: 'flex', padding: '18px 80px', flexWrap: 'wrap',
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
          borderTopWidth: 1, borderTopStyle: 'solid',
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
          gap: 44, alignItems: 'center',
        }}>
          {servicios.slice(0, 5).map((s) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 22, fontWeight: 600,
              color: isDark ? 'rgba(255,255,255,0.55)' : subTextColor,
            }}>
              <div style={{ display: 'flex', fontSize: 18, fontWeight: 900, color: accent }}>v</div>
              <div style={{ display: 'flex' }}>{SERVICIOS_LABELS[s] ?? s}</div>
            </div>
          ))}
        </div>
      )}

      {/* Barra WhatsApp */}
      {hasWsp && (
        <div style={{
          display: 'flex', height: 110, background: accent,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, color: 'white', letterSpacing: 1 }}>
            Inscripciones - {torneo.whatsapp}
          </div>
        </div>
      )}

    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export const generateFlyer = async ({ torneo, club, template = 'navy', accentColor }) => {
  const cfg = getTemplateConfig(template, accentColor)

  const [fontReg, fontBold, fontBlack, logoDataUrl, bgDataUrl] = await Promise.all([
    getFont(font400Url),
    getFont(font700Url),
    getFont(font900Url),
    club.logo          ? toDataUrl(club.logo)          : Promise.resolve(null),
    torneo.imagenFondo ? toDataUrl(torneo.imagenFondo) : Promise.resolve(null),
  ])

  const element = buildElement({ torneo, club, logoDataUrl, bgDataUrl, cfg })

  const svg = await satori(element, {
    width: 1080,
    height: 1080,
    fonts: [
      { name: 'Inter', data: fontReg,   weight: 400, style: 'normal' },
      { name: 'Inter', data: fontBold,  weight: 700, style: 'normal' },
      { name: 'Inter', data: fontBlack, weight: 900, style: 'normal' },
    ],
  })

  return svgToPng(svg, 1080, 1080)
}
