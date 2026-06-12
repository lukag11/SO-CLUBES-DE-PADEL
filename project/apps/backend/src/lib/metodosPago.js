// IDs de métodos de cobro válidos (espeja el catálogo del frontend en lib/metodosPago.jsx).
// El backend valida contra esta lista para integridad de datos.
export const METODOS_VALIDOS = ['efectivo', 'transferencia', 'mercadopago', 'debito', 'credito', 'otro']

// Normaliza un método: devuelve el id válido o 'efectivo' por defecto si falta/es inválido.
export const normalizarMetodo = (m) => (METODOS_VALIDOS.includes(m) ? m : 'efectivo')
