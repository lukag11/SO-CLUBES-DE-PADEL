// Observabilidad: Sentry (error tracking en producción). DORMIDO si no hay SENTRY_DSN: ni siquiera
// se importa el paquete, así en local no afecta el arranque. Para activarlo en el deploy: setear
// SENTRY_DSN en las env vars de Railway. No hay nada más que tocar.
let Sentry = null

if (process.env.SENTRY_DSN) {
  Sentry = await import('@sentry/node')
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1,
  })

  // Puente console.error → Sentry. Todas las rutas ya hacen `console.error(err)` antes de responder
  // 500, pero esos errores ATAJADOS en un try/catch nunca llegan al error-handler de Express (que es
  // lo único que Sentry captura por defecto). Interceptamos console.error UNA sola vez: si algún
  // argumento es un Error, lo mandamos a Sentry con su stack. Así cubrimos los ~60 catches de plata
  // (pagos/cargos/comandas/caja/webhooks/reservas…) sin tocarlos uno por uno. Solo capturamos
  // instancias de Error → los logs de texto (console.error('msg', e.message)) no generan ruido.
  const origError = console.error.bind(console)
  console.error = (...args) => {
    try {
      const err = args.find((a) => a instanceof Error)
      if (err) Sentry.captureException(err)
    } catch { /* nunca romper el logging por culpa de Sentry */ }
    origError(...args)
  }
}

// Reporte explícito para catches que NO logean el Error (o donde querés adjuntar contexto).
// No-op si Sentry está dormido. Nunca lanza.
export const captureException = (err, extra) => {
  if (Sentry && err) {
    try { Sentry.captureException(err, extra ? { extra } : undefined) } catch { /* noop */ }
  }
}

// Monta el error-handler de Express de Sentry (para los errores que SÍ propagan a next()).
export const sentryErrorHandler = (app) => {
  if (Sentry) Sentry.setupExpressErrorHandler(app)
}

export { Sentry }
