// Mascot de PadelwIArk: una pelotita de pádel con ojitos y boca.
// SVG vivo (parpadea + flota). Reutilizable: size + expresion (idle/feliz/hablando) + flotar.
export default function AsistentePelota({ size = 64, expresion = 'idle', flotar = true, className = '' }) {
  // Boca según expresión
  const boca = {
    idle:    'M 38,66 Q 50,74 62,66',     // sonrisa suave
    feliz:   'M 36,64 Q 50,80 64,64',     // sonrisota
    hablando:'M 42,66 Q 50,72 58,66',     // boca chica
  }[expresion] || 'M 38,66 Q 50,74 62,66'

  return (
    <div className={`wiark-mascota ${flotar ? 'wiark-bob' : ''} ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes wiark-bob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-6%) } }
        @keyframes wiark-blink { 0%,92%,100%{ transform: scaleY(1) } 96%{ transform: scaleY(0.1) } }
        .wiark-bob { animation: wiark-bob 3.2s ease-in-out infinite; will-change: transform; }
        .wiark-mascota .wiark-ojos { transform-box: fill-box; transform-origin: center; animation: wiark-blink 4.5s infinite; }
      `}</style>
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label="WIarky, asistente de PadelwIArk">
        <defs>
          <radialGradient id="wiark-ball" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#eaff7a" />
            <stop offset="45%" stopColor="#cfee2a" />
            <stop offset="80%" stopColor="#afca0b" />
            <stop offset="100%" stopColor="#8fa509" />
          </radialGradient>
          <filter id="wiark-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#5b6b00" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* sombra en el piso */}
        <ellipse cx="50" cy="92" rx="26" ry="4.5" fill="#000" opacity="0.12" />

        {/* pelota */}
        <circle cx="50" cy="50" r="38" fill="url(#wiark-ball)" filter="url(#wiark-shadow)" />
        {/* brillo */}
        <ellipse cx="37" cy="33" rx="12" ry="8" fill="#ffffff" opacity="0.28" />
        {/* costuras de pelota de pádel */}
        <path d="M 17,33 Q 41,50 17,71" fill="none" stroke="#fbfff0" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <path d="M 83,33 Q 59,50 83,71" fill="none" stroke="#fbfff0" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

        {/* cejas */}
        <path d="M 30,33 Q 37,29 44,33" fill="none" stroke="#3a4400" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 56,33 Q 63,29 70,33" fill="none" stroke="#3a4400" strokeWidth="2.4" strokeLinecap="round" />

        {/* ojos (parpadean) */}
        <g className="wiark-ojos">
          <ellipse cx="38" cy="46" rx="8.5" ry="10.5" fill="#fff" stroke="#3a4400" strokeWidth="1.2" />
          <ellipse cx="62" cy="46" rx="8.5" ry="10.5" fill="#fff" stroke="#3a4400" strokeWidth="1.2" />
          <circle cx="39.5" cy="48" r="4.2" fill="#1f2600" />
          <circle cx="63.5" cy="48" r="4.2" fill="#1f2600" />
          <circle cx="41" cy="46" r="1.4" fill="#fff" />
          <circle cx="65" cy="46" r="1.4" fill="#fff" />
        </g>

        {/* cachetes */}
        <circle cx="28" cy="60" r="4" fill="#ff7a59" opacity="0.25" />
        <circle cx="72" cy="60" r="4" fill="#ff7a59" opacity="0.25" />

        {/* boca */}
        <path d={boca} fill="none" stroke="#2a3200" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}
