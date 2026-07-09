// LECTOR DE FACTURAS con IA (visión). Recibe la foto de una factura/ticket/recibo y usa
// Claude (visión) para extraer los datos del gasto, que el dueño después confirma.
// Modelo Haiku 4.5 para arrancar barato; si falla en facturas complejas se sube a Sonnet.
// NUNCA guarda solo: devuelve los datos para que el dueño los revise (la plata se confirma).
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // toma ANTHROPIC_API_KEY del entorno

const CATEGORIAS = new Set(['servicios', 'alquiler', 'sueldos', 'impuestos', 'bebidas', 'kiosco', 'deportivo', 'insumos', 'mantenimiento', 'otros'])

const PROMPT = `Sos un asistente que lee facturas, tickets y recibos argentinos y extrae sus datos.
Mirá la imagen y devolvé SOLO un JSON válido (sin explicaciones, sin markdown, sin \`\`\`) con esta forma EXACTA:
{"proveedor": string|null, "cuitProveedor": string|null, "tipoComprobante": string|null, "concepto": string, "monto": number, "fecha": "YYYY-MM-DD"|null, "vencimiento": "YYYY-MM-DD"|null, "contado": boolean, "numeroFactura": string|null, "categoria": string}
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
- "categoria": elegí SOLO UNA de esta lista, según QUÉ se compró/pagó (es una factura de un club de pádel):
    • "servicios"  = luz, agua, gas, internet, teléfono (facturas de servicios).
    • "alquiler"   = alquiler del local.
    • "sueldos"    = sueldos, honorarios, recibos de personal.
    • "impuestos"  = AFIP, ingresos brutos, tasa municipal, impuestos.
    • "bebidas"    = compra de gaseosas, agua, cerveza, isotónicas, jugos (para el bar).
    • "kiosco"     = compra de golosinas, snacks, comida, cosas del kiosco.
    • "deportivo"  = compra de pelotas, cubregrip/grips, paletas, muñequeras, mercadería deportiva (para la tienda o para el club).
    • "insumos"    = artículos de limpieza, papelería, cosas varias de uso interno.
    • "mantenimiento" = reparaciones, service técnico, arreglos de canchas.
    • "otros"      = si no encaja en ninguna.
  Pista: si es una factura de un DISTRIBUIDOR/mayorista de bebidas → "bebidas"; de artículos de pádel → "deportivo".
- "proveedor": la empresa que emite (ej: "Epec", "Coca Cola Andina", "Vifood"), o null.
- "cuitProveedor": el CUIT del que EMITE la factura (formato 30-12345678-9). NO el del cliente. Null si no se ve.
- "tipoComprobante": el tipo de comprobante ("Factura A", "Factura B", "Factura C", "Ticket", "Remito", "Recibo"). Null si no se ve.
- "fecha": fecha de EMISIÓN en YYYY-MM-DD, o null si no se ve.
- "contado": true si la factura dice "CONTADO" / "Pago contado" (se pagó al recibirla); false si es a crédito / cuenta corriente / tiene un vencimiento de pago futuro.
- "vencimiento": SOLO la fecha de VENCIMIENTO DE PAGO (cuándo hay que pagarla), típico de servicios (luz, agua, internet). Buscá "VENCIMIENTO", "1er vencimiento", "Fecha de pago".
    ¡ATENCIÓN! NO confundir con datos FISCALES: "Vto CAE", "CAE", "Vencimiento CAE" NO son vencimientos de pago (son de AFIP) → IGNORALOS, no los pongas acá.
    Si es CONTADO (ya pagada), poné "vencimiento": null.
- Si un dato no está, poné null (salvo concepto, monto y contado).`

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
  const contado = raw.contado === true
  return {
    proveedor: raw.proveedor ? String(raw.proveedor).trim() : null,
    cuitProveedor: raw.cuitProveedor ? String(raw.cuitProveedor).trim() : null,
    tipoComprobante: raw.tipoComprobante ? String(raw.tipoComprobante).trim() : null,
    concepto: raw.concepto ? String(raw.concepto).trim() : '',
    monto: Math.max(0, Math.round(Number(raw.monto) || 0)),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(raw.fecha) ? raw.fecha : null,
    // Si es CONTADO, no hay vencimiento de pago (ya está pagada) aunque el modelo lea algo.
    vencimiento: (!contado && /^\d{4}-\d{2}-\d{2}$/.test(raw.vencimiento)) ? raw.vencimiento : null,
    contado,
    numeroFactura: raw.numeroFactura ? String(raw.numeroFactura).trim() : null,
    categoria: CATEGORIAS.has(cat) ? cat : 'otros',
  }
}
