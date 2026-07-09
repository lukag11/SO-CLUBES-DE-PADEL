// LECTOR DE FACTURAS con IA (visión). Recibe la foto de una factura/ticket/recibo y usa
// Claude (visión) para extraer los datos del gasto, que el dueño después confirma.
// Modelo Haiku 4.5 para arrancar barato; si falla en facturas complejas se sube a Sonnet.
// NUNCA guarda solo: devuelve los datos para que el dueño los revise (la plata se confirma).
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // toma ANTHROPIC_API_KEY del entorno

const CATEGORIAS = new Set(['energia', 'agua', 'internet', 'alquiler', 'sueldos', 'mantenimiento', 'insumos', 'otros'])

const PROMPT = `Sos un asistente que lee facturas, tickets y recibos argentinos y extrae sus datos.
Mirá la imagen y devolvé SOLO un JSON válido (sin explicaciones, sin markdown, sin \`\`\`) con esta forma EXACTA:
{"proveedor": string|null, "concepto": string, "monto": number, "fecha": "YYYY-MM-DD"|null, "vencimiento": "YYYY-MM-DD"|null, "numeroFactura": string|null, "categoria": string}
Reglas:
- "monto": el TOTAL A PAGAR (buscá el texto "TOTAL A PAGAR", o "TOTAL FACTURADO", o "TOTAL"). Devolvelo como ENTERO en pesos.
  ATENCIÓN AL FORMATO ARGENTINO: el punto "." separa los MILES y la coma "," separa los DECIMALES (centavos).
  Convertí así (quitando el símbolo $ y descartando los centavos, redondeando a entero):
    "$ 22.560,30"   -> 22560
    "120.000"       -> 120000
    "1.500.000,50"  -> 1500000
    "$ 8.000"       -> 8000
  Si no ves el total claro, poné 0 (NO inventes).
- "concepto": qué es, corto y en criollo (ej: "Luz", "Agua", "Internet", "Alquiler", "Gas"). Usá el nombre del servicio si es uno conocido.
- "categoria": UNA de estas: energia, agua, internet, alquiler, sueldos, mantenimiento, insumos, otros.
- "proveedor": la empresa que emite (ej: "Epec", "Aguas Cordobesas", "Telecom"), o null.
- "fecha": fecha de EMISIÓN en YYYY-MM-DD, o null si no se ve.
- "vencimiento": la fecha de VENCIMIENTO (buscá "VENCIMIENTO", "Vto", "Fecha de pago" o "1er vencimiento") en YYYY-MM-DD. Es cuándo hay que pagarla. Si no se ve, null.
- Si un dato no está, poné null (salvo concepto y monto).`

// Extrae { proveedor, concepto, monto, fecha, numeroFactura, categoria } de una imagen dataURL.
export async function extraerGastoDeImagen(dataUrl) {
  const m = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,(.+)$/s.exec((dataUrl || '').trim())
  if (!m) throw new Error('formato_imagen_invalido')
  const mediaType = m[1] === 'image/jpg' ? 'image/jpeg' : m[1]
  const data = m[2]

  const resp = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
        { type: 'text', text: PROMPT },
      ],
    }],
  })

  const txt = (resp.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  const ini = txt.indexOf('{'), fin = txt.lastIndexOf('}')
  if (ini < 0 || fin < 0) throw new Error('no_se_pudo_leer')
  let raw
  try { raw = JSON.parse(txt.slice(ini, fin + 1)) } catch { throw new Error('no_se_pudo_leer') }

  const cat = String(raw.categoria || '').trim().toLowerCase()
  return {
    proveedor: raw.proveedor ? String(raw.proveedor).trim() : null,
    concepto: raw.concepto ? String(raw.concepto).trim() : '',
    monto: Math.max(0, Math.round(Number(raw.monto) || 0)),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha) ? raw.fecha : null,
    vencimiento: /^\d{4}-\d{2}-\d{2}$/.test(raw.vencimiento) ? raw.vencimiento : null,
    numeroFactura: raw.numeroFactura ? String(raw.numeroFactura).trim() : null,
    categoria: CATEGORIAS.has(cat) ? cat : 'otros',
  }
}
