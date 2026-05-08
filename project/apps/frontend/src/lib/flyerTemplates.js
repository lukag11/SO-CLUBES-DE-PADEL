// Config compartida entre FlyerTorneo.jsx (preview CSS) y generateFlyer.jsx (Satori PNG)

export const FLYER_TEMPLATES = [
  {
    id: 'navy',
    name: 'Navy',
    defaultAccent: '#3b82f6',
    preview: { bg: '#0d1f3c', bar: ['#3b82f6', '#10b981'], text: 'white' },
  },
  {
    id: 'fuego',
    name: 'Fuego',
    defaultAccent: '#f97316',
    preview: { bg: '#1e0800', bar: ['#f97316', '#ef4444'], text: 'white' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    defaultAccent: '#6366f1',
    preview: { bg: '#f1f5f9', bar: ['#6366f1', '#8b5cf6'], text: '#0f172a' },
  },
]

export const getTemplateConfig = (template = 'navy', accentColor) => {
  const accent = accentColor || FLYER_TEMPLATES.find((t) => t.id === template)?.defaultAccent || '#3b82f6'

  if (template === 'fuego') return {
    accent,
    dark: true,
    bg: 'linear-gradient(145deg, #1a0800 0%, #2d1200 50%, #120500 100%)',
    barGradient: `linear-gradient(90deg, ${accent}, #ef4444, ${accent})`,
    glow1: `radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)`,
    glow2: `radial-gradient(circle, rgba(239,68,68,0.09) 0%, transparent 70%)`,
    textColor: 'white',
    subTextColor: 'rgba(255,255,255,0.38)',
    cardBg: 'rgba(255,255,255,0.045)',
    cardBorder: `rgba(249,115,22,0.18)`,
    dateBg: 'rgba(255,255,255,0.07)',
    dateBorder: `rgba(249,115,22,0.22)`,
    logoBg: `rgba(249,115,22,0.15)`,
    logoBorder: `rgba(249,115,22,0.30)`,
    logoText: accent,
    wsp: `linear-gradient(90deg, #16a34a, #15803d)`,
    catColors: [
      { bg: 'rgba(249,115,22,0.14)', border: 'rgba(249,115,22,0.30)', text: '#fb923c' },
      { bg: 'rgba(239,68,68,0.14)',  border: 'rgba(239,68,68,0.30)',  text: '#f87171' },
      { bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.30)', text: '#fbbf24' },
      { bg: 'rgba(167,139,250,0.14)',border: 'rgba(167,139,250,0.30)',text: '#a78bfa' },
    ],
    prize1Color: '#fb923c',
    prize2Color: '#94a3b8',
    prizeSFColor: '#fbbf24',
    serviceCheck: '#fb923c',
    serviceText: 'rgba(255,255,255,0.55)',
  }

  if (template === 'minimal') return {
    accent,
    dark: false,
    bg: '#f1f5f9',
    barGradient: `linear-gradient(90deg, ${accent}, #8b5cf6, ${accent})`,
    glow1: 'transparent',
    glow2: 'transparent',
    textColor: '#0f172a',
    subTextColor: '#64748b',
    cardBg: 'white',
    cardBorder: '#e2e8f0',
    dateBg: 'white',
    dateBorder: '#e2e8f0',
    logoBg: `rgba(99,102,241,0.08)`,
    logoBorder: `rgba(99,102,241,0.20)`,
    logoText: accent,
    wsp: `linear-gradient(90deg, #16a34a, #15803d)`,
    catColors: [
      { bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)',  text: accent },
      { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.25)', text: '#8b5cf6' },
      { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', text: '#10b981' },
      { bg: 'rgba(244,114,182,0.08)',border: 'rgba(244,114,182,0.25)',text: '#f472b6' },
    ],
    prize1Color: accent,
    prize2Color: '#64748b',
    prizeSFColor: '#8b5cf6',
    serviceCheck: accent,
    serviceText: '#475569',
  }

  // navy (default)
  return {
    accent,
    dark: true,
    bg: 'linear-gradient(145deg, #09152a 0%, #0d1f3c 50%, #080f1e 100%)',
    barGradient: `linear-gradient(90deg, ${accent}, #10b981, ${accent})`,
    glow1: `radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 70%)`,
    glow2: `radial-gradient(circle, rgba(16,185,129,0.09) 0%, transparent 70%)`,
    textColor: 'white',
    subTextColor: 'rgba(255,255,255,0.38)',
    cardBg: 'rgba(255,255,255,0.045)',
    cardBorder: 'rgba(255,255,255,0.08)',
    dateBg: 'rgba(255,255,255,0.07)',
    dateBorder: 'rgba(255,255,255,0.13)',
    logoBg: `rgba(59,130,246,0.15)`,
    logoBorder: `rgba(59,130,246,0.30)`,
    logoText: '#60a5fa',
    wsp: `linear-gradient(90deg, #16a34a, #15803d)`,
    catColors: [
      { bg: 'rgba(74,222,128,0.14)',  border: 'rgba(74,222,128,0.30)',  text: '#4ade80' },
      { bg: 'rgba(96,165,250,0.14)',  border: 'rgba(96,165,250,0.30)',  text: '#60a5fa' },
      { bg: 'rgba(251,191,36,0.14)', border: 'rgba(251,191,36,0.30)', text: '#fbbf24' },
      { bg: 'rgba(167,139,250,0.14)',border: 'rgba(167,139,250,0.30)',text: '#a78bfa' },
    ],
    prize1Color: '#fbbf24',
    prize2Color: '#94a3b8',
    prizeSFColor: '#a78bfa',
    serviceCheck: '#4ade80',
    serviceText: 'rgba(255,255,255,0.55)',
  }
}
