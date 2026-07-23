// Info comercial de los planes para mostrar DENTRO de la app (modal "Mejorar plan").
// Fuente única del front para el upsell. Los ids coinciden con el backend (basico/pro/premium).
// Mantener sincronizado con la landing (PwPrecios.jsx) y la matriz del backend (lib/planes.js).

export const PLANES_INFO = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 42900,
    tagline: 'Ordená tus reservas y cobrá.',
    incluye: [
      'Reservas en tiempo real + turnos fijos',
      'Cobros online (link, QR, transferencia)',
      'Caja del día',
      'Hasta 4 canchas · 2 usuarios',
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: 74900,
    tagline: 'Tu club completo: bar, torneos y profes.',
    destacado: true,
    incluye: [
      'Todo lo de Básico, canchas ilimitadas',
      'Finanzas completas (caja, stock, bar, gastos)',
      'Torneos + profesores + estadísticas',
      'Hasta 5 usuarios con permisos',
    ],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 119900,
    tagline: 'Inteligencia de negocio e IA.',
    incluye: [
      'Todo lo de Pro',
      'Dirección: punto de equilibrio y costos',
      'WIarky: el asistente con IA',
      'Usuarios ilimitados + soporte prioritario',
    ],
  },
]

export const ORDEN_PLAN = { basico: 0, pro: 1, premium: 2 }
export const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`
