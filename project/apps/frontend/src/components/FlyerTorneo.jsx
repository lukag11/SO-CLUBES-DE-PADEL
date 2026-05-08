import { forwardRef } from 'react'
import { getTemplateConfig } from '../lib/flyerTemplates'

const SERVICIOS_LABELS = {
  indoor:     'Canchas indoor',
  bar:        'Bar y comidas',
  parking:    'Estacionamiento',
  cupos:      'Cupos limitados',
  vestuarios: 'Vestuarios',
  wifi:       'WiFi',
}

const parseDate = (iso) => new Date((iso || '2025-01-01') + 'T12:00:00')

const FlyerTorneo = forwardRef(({ torneo, club, template = 'navy', accentColor }, ref) => {
  const cfg = getTemplateConfig(template, accentColor)

  const categorias = torneo.categorias ?? []
  const servicios  = torneo.servicios  ?? []
  const hasPremios = torneo.premioPrimero || torneo.premioSegundo || torneo.premioSemifinal
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
  const daysSize = daysText.length <= 2 ? 59 : daysText.length <= 5 ? 46 : 37

  const initials   = (club.nombre || 'PD').slice(0, 2).toUpperCase()
  const clubNombre = (club.nombre || 'CLUB DE PADEL').toUpperCase()
  const showSubtitle = torneo.nombre && torneo.nombre.trim().length > 0

  const subTextColor = isDark ? 'rgba(255,255,255,0.4)' : cfg.subTextColor
  const bodyColor    = isDark ? 'white' : cfg.textColor

  return (
    <div
      ref={ref}
      style={{
        width: 540, height: 540,
        background: cfg.bg,
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        overflow: 'hidden',
        color: bodyColor,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Foto de fondo */}
      {torneo.imagenFondo && (
        <img
          src={torneo.imagenFondo}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', opacity: 0.28, zIndex: 0,
          }}
        />
      )}

      {/* Glow decorativo superior-derecho */}
      <div style={{
        position: 'absolute', top: -100, right: -100,
        width: 320, height: 320,
        background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Glow decorativo inferior-izquierdo */}
      <div style={{
        position: 'absolute', bottom: -75, left: -75,
        width: 240, height: 240,
        background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
        borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Rectángulo decorativo rotado */}
      <div style={{
        position: 'absolute', top: -35, right: -35,
        width: 140, height: 140,
        background: accent, opacity: isDark ? 0.10 : 0.07,
        transform: 'rotate(45deg)', borderRadius: 15,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Barra superior */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${accent}, ${accent}, transparent)`,
        zIndex: 2,
      }} />

      {/* Barra izquierda */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 7,
        background: accent, zIndex: 2,
      }} />

      {/* Contenido principal */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', flexDirection: 'column',
        paddingLeft: 40, paddingRight: 33, paddingTop: 36, paddingBottom: 16,
        flex: 1, overflow: 'hidden',
      }}>

        {/* Nombre del club */}
        <div style={{
          fontSize: 10, fontWeight: 700,
          letterSpacing: 3.5, color: accent,
          textTransform: 'uppercase', marginBottom: 11,
        }}>
          {clubNombre}
        </div>

        {/* TORNEO */}
        <div style={{
          fontSize: 100, fontWeight: 900,
          color: bodyColor, textTransform: 'uppercase',
          letterSpacing: -3.5, lineHeight: 0.82, marginBottom: 2,
        }}>
          TORNEO
        </div>

        {/* DE PÁDEL */}
        <div style={{
          fontSize: 29, fontWeight: 900,
          color: accent, textTransform: 'uppercase',
          letterSpacing: 6.5, lineHeight: 1,
          marginBottom: showSubtitle ? 6 : 19,
        }}>
          DE PÁDEL
        </div>

        {/* Nombre del torneo subtítulo */}
        {showSubtitle && (
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: subTextColor,
            textTransform: 'uppercase', letterSpacing: 1.5, lineHeight: 1,
            marginBottom: 19,
          }}>
            {torneo.nombre.toUpperCase()}
          </div>
        )}

        {/* Divider */}
        <div style={{
          height: 1.5,
          background: `linear-gradient(90deg, ${accent}, ${accent}66, transparent)`,
          marginBottom: 22,
        }} />

        {/* Info row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', flex: 1,
        }}>

          {/* Izquierda: logo + categorías */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxWidth: 300 }}>

            {/* Logo */}
            <div style={{
              width: 46, height: 46, borderRadius: 11, overflow: 'hidden',
              background: isDark ? `${accent}1a` : `${accent}14`,
              border: `1.5px solid ${accent}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {club.logo
                ? <img src={club.logo} alt="" crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 17, fontWeight: 900, color: accent }}>{initials}</span>
              }
            </div>

            {/* Categorías */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {categorias.map((cat, i) => (
                <span key={cat} style={{
                  display: 'inline-flex', padding: '9px 18px', borderRadius: 7,
                  border: `1.5px solid ${i === 0 ? accent : (isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)')}`,
                  background: i === 0 ? `${accent}1a` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  fontSize: 18, fontWeight: 900,
                  color: i === 0 ? accent : bodyColor,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {cat}
                </span>
              ))}
              {torneo.genero && torneo.genero !== 'Mixto' && (
                <span style={{
                  display: 'inline-flex', padding: '9px 18px', borderRadius: 7,
                  border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.15)'}`,
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  fontSize: 18, fontWeight: 900,
                  color: isDark ? 'rgba(255,255,255,0.6)' : subTextColor,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {torneo.genero}
                </span>
              )}
            </div>
          </div>

          {/* Derecha: fecha */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 5 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 2.5,
              color: subTextColor, textTransform: 'uppercase', marginBottom: 4,
            }}>
              FECHA
            </div>
            <div style={{
              fontSize: daysSize, fontWeight: 900,
              lineHeight: 0.86, color: accent, letterSpacing: -1,
            }}>
              {daysText}
            </div>
            <div style={{
              fontSize: 26, fontWeight: 900, lineHeight: 1,
              color: bodyColor, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5,
            }}>
              {mes}
            </div>
          </div>
        </div>

        {/* Premios */}
        {hasPremios && (
          <div style={{ display: 'flex', marginTop: 17, borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ width: 4, background: accent, flexShrink: 0 }} />
            <div style={{
              display: 'flex', flexDirection: 'column', flex: 1,
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
              padding: '12px 18px',
            }}>
              <div style={{
                fontSize: 7, fontWeight: 700, letterSpacing: 2,
                color: subTextColor, textTransform: 'uppercase', marginBottom: 7,
              }}>
                PREMIOS
              </div>
              <div style={{ display: 'flex', gap: 27, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                {torneo.premioPrimero && (
                  <div>
                    <div style={{ fontSize: 7, color: subTextColor, marginBottom: 2 }}>1° Puesto</div>
                    <div style={{ fontSize: 27, fontWeight: 900, color: accent, lineHeight: 1 }}>{torneo.premioPrimero}</div>
                  </div>
                )}
                {torneo.premioSegundo && (
                  <div>
                    <div style={{ fontSize: 7, color: subTextColor, marginBottom: 2 }}>2° Puesto</div>
                    <div style={{ fontSize: 27, fontWeight: 900, color: cfg.prize2Color, lineHeight: 1 }}>{torneo.premioSegundo}</div>
                  </div>
                )}
                {torneo.premioSemifinal && (
                  <div>
                    <div style={{ fontSize: 7, color: subTextColor, marginBottom: 2 }}>Semifinal</div>
                    <div style={{ fontSize: 27, fontWeight: 900, color: cfg.prizeSFColor, lineHeight: 1 }}>{torneo.premioSemifinal}</div>
                  </div>
                )}
              </div>
              {torneo.premioExtra && (
                <div style={{ marginTop: 6, fontSize: 10, color: subTextColor, fontStyle: 'italic' }}>{torneo.premioExtra}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Servicios */}
      {hasServ && (
        <div style={{
          position: 'relative', zIndex: 3,
          padding: '9px 40px',
          background: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.04)',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
          display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {servicios.slice(0, 5).map((s) => (
            <span key={s} style={{
              fontSize: 11, fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.55)' : subTextColor,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ color: accent, fontWeight: 900, fontSize: 10 }}>✓</span>
              {SERVICIOS_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      )}

      {/* WhatsApp */}
      {hasWsp && (
        <div style={{
          position: 'relative', zIndex: 3,
          height: 55, background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 17, fontWeight: 900, color: 'white', letterSpacing: 0.3 }}>
            Inscripciones · {torneo.whatsapp}
          </span>
        </div>
      )}
    </div>
  )
})

FlyerTorneo.displayName = 'FlyerTorneo'
export default FlyerTorneo
