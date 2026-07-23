// PARSEO DE ALTA DE CLUB con IA (lenguaje natural → config). El dueño describe su club en criollo
// ("3 canchas de cristal techadas, abro de 8 a 23, el turno $12.000") y Claude (Haiku) extrae los
// datos que el asistente de bienvenida PRE-LLENA. NUNCA configura solo: devuelve los datos para que
// el dueño los revise y confirme en los formularios reales (misma filosofía que ocrGasto/ocrComprobante).
// La IA calcula mal a veces → TODO se verifica/normaliza por código antes de devolver.
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // toma ANTHROPIC_API_KEY del entorno

const PROMPT = `Sos el asistente de alta de un club de pádel argentino. El dueño describe su club en lenguaje natural (español rioplatense). Extraé los datos y devolvé SOLO un JSON válido (sin explicaciones, sin markdown, sin \`\`\`) con esta forma EXACTA:
{"cantidad": number, "tipo": "Cristal"|"Pared", "indoor": boolean, "apertura": "HH:MM", "cierre": "HH:MM", "precio": number}
Reglas:
- "cantidad": cuántas canchas tiene (entero 1 a 20). Si no lo dice, 1.
- "tipo": "Cristal" (paredes de vidrio / panorámicas / blindex) o "Pared" (muro de cemento / mampostería). Si menciona varias, poné la que MÁS tenga. Si no lo dice, "Cristal".
- "indoor": true si son techadas / cubiertas / indoor / bajo techo; false si son descubiertas / al aire libre / outdoor / a cielo abierto. Si no lo dice, true.
- "apertura" y "cierre": horario de atención en formato 24h "HH:MM".
    "abro de 8 a 23" -> "08:00" / "23:00".
    "de 9 de la mañana a 12 de la noche" -> "09:00" / "00:00".
    "8am a 1am" -> "08:00" / "01:00".
    Si no lo dice, "08:00" / "23:00".
- "precio": precio del turno (1 hora y media) en pesos, ENTERO. Formato argentino (el punto separa miles).
    "12 lucas" / "12 mil" / "$12.000" -> 12000.
    "9500" -> 9500.
    Si no lo dice, 0.
No inventes: si un dato no está, usá el default indicado arriba.`

// Valida "HH:MM" 24h. Devuelve el string si es válido, o null.
const hhmmOK = (s) => {
  if (typeof s !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

// Interpreta el texto libre y devuelve { cantidad, tipo, indoor, apertura, cierre, precio } YA VERIFICADO.
export async function parsearClubOnboarding(texto) {
  const leerCon = async (model) => {
    const resp = await client.messages.create({
      model,
      max_tokens: 200,
      messages: [{ role: 'user', content: `${PROMPT}\n\nTexto del dueño:\n"""${texto}"""` }],
    })
    const txt = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    const ini = txt.indexOf('{'), fin = txt.lastIndexOf('}')
    if (ini < 0 || fin < 0) throw new Error('no_se_pudo_interpretar')
    try { return JSON.parse(txt.slice(ini, fin + 1)) } catch { throw new Error('no_se_pudo_interpretar') }
  }

  // Haiku para el 90%; si no puede, lo rescata Sonnet.
  let raw
  try { raw = await leerCon('claude-haiku-4-5') }
  catch { raw = await leerCon('claude-sonnet-5') }

  // VERIFICACIÓN DURA (la IA a veces se manda) — todo clampeado/normalizado por código.
  const tipo = raw.tipo === 'Pared' ? 'Pared' : 'Cristal'
  return {
    cantidad: Math.max(1, Math.min(20, Math.round(Number(raw.cantidad) || 1))),
    tipo,
    indoor: raw.indoor !== false,               // default techadas salvo que diga explícito que no
    apertura: hhmmOK(raw.apertura) || '08:00',
    cierre: hhmmOK(raw.cierre) || '23:00',
    precio: Math.max(0, Math.round(Number(raw.precio) || 0)),
  }
}
