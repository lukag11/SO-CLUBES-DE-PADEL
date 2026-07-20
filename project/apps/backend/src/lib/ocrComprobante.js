// LECTOR DE COMPROBANTES DE TRANSFERENCIA con IA (visión). Recibe la captura del comprobante
// (homebanking / billetera / Mercado Pago) y usa Claude para extraer monto, alias/CBU destino,
// fecha y origen. Se usa para VERIFICAR una transferencia contra la deuda + el alias del club.
// NUNCA salda solo: devuelve los datos para comparar; el humano (o el auto-saldar) decide.
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // toma ANTHROPIC_API_KEY del entorno

const PROMPT = `Sos un asistente que lee COMPROBANTES DE TRANSFERENCIA bancaria argentinos (captura del homebanking, de una billetera virtual o de Mercado Pago).
Mirá la imagen y devolvé SOLO un JSON válido (sin explicaciones, sin markdown, sin \`\`\`) con esta forma EXACTA:
{"monto": number, "aliasDestino": string|null, "cbuDestino": string|null, "titularDestino": string|null, "origen": string|null, "fecha": "YYYY-MM-DD"|null}
Reglas:
- "monto": el importe transferido, ENTERO en pesos. Formato argentino: el punto "." separa miles y la coma "," los centavos. "$ 5.010,00" -> 5010, "1.500" -> 1500, "12.120" -> 12120. Descartá centavos. Si no lo ves, poné 0.
- "aliasDestino": el ALIAS de la cuenta que RECIBIÓ la plata (buscá "para", "destino", "cuenta destino", "alias"). Ej: "club.padel.mp". Null si no se ve.
- "cbuDestino": el CBU o CVU destino (número de ~22 dígitos), si se ve. Null si no.
- "titularDestino": el nombre del que RECIBIÓ (titular destino), si se ve. Null si no.
- "origen": el nombre de quien ENVIÓ la transferencia (origen/de), si se ve. Null si no.
- "fecha": fecha de la transferencia en YYYY-MM-DD, o null si no se ve.
- Si la imagen NO parece un comprobante de transferencia (es otra cosa), poné "monto": 0 y todo lo demás null.
- Si un dato no está, poné null (salvo monto que va 0). NO inventes.`

// Extrae { monto, aliasDestino, cbuDestino, titularDestino, origen, fecha } de una imagen dataURL.
export async function extraerComprobanteTransferencia(dataUrl) {
  const m = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/s.exec((dataUrl || '').trim())
  if (!m) throw new Error('formato_imagen_invalido')
  const mediaType = m[1] === 'image/jpg' ? 'image/jpeg' : m[1]
  const data = m[2]

  const leerCon = async (model) => {
    const resp = await client.messages.create({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mediaType, data } }, { type: 'text', text: PROMPT }] }],
    })
    const txt = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
    const ini = txt.indexOf('{'), fin = txt.lastIndexOf('}')
    if (ini < 0 || fin < 0) throw new Error('no_se_pudo_leer')
    try { return JSON.parse(txt.slice(ini, fin + 1)) } catch { throw new Error('no_se_pudo_leer') }
  }

  // Haiku (rápido/barato) para el 90%; si no puede con una captura difícil, la rescata Sonnet.
  let raw
  try { raw = await leerCon('claude-haiku-4-5') } catch { raw = await leerCon('claude-sonnet-5') }

  return {
    monto: Math.max(0, Math.round(Number(raw.monto) || 0)),
    aliasDestino: raw.aliasDestino ? String(raw.aliasDestino).trim() : null,
    cbuDestino: raw.cbuDestino ? String(raw.cbuDestino).trim() : null,
    titularDestino: raw.titularDestino ? String(raw.titularDestino).trim() : null,
    origen: raw.origen ? String(raw.origen).trim() : null,
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha) ? raw.fecha : null,
  }
}

// Compara lo leído contra lo esperado (monto de la deuda + alias del club) → veredicto.
//   coincide     = monto ok Y el destino matchea el alias del club.
//   no_coincide  = el monto NO da (señal fuerte de error/fraude).
//   dudoso       = monto ok pero no se pudo confirmar el destino, o no se leyó bien.
export function veredictoTransferencia({ iaMonto, iaAlias, iaCbu, montoEsperado, aliasClub }) {
  if (!iaMonto || iaMonto <= 0) return 'dudoso' // no se pudo leer el monto
  const montoOk = Math.abs(iaMonto - montoEsperado) <= 1
  if (!montoOk) return 'no_coincide'
  const alias = String(aliasClub || '').toLowerCase().replace(/[\s.-]/g, '')
  const leido = `${iaAlias || ''} ${iaCbu || ''}`.toLowerCase().replace(/[\s.-]/g, '')
  const destinoOk = alias.length >= 4 && leido.includes(alias)
  return destinoOk ? 'coincide' : 'dudoso'
}
