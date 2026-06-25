# 🔄 Flujo de Desarrollo

## 🧱 Unidades de trabajo

Todo desarrollo debe dividirse en:

- Feature (funcionalidad)
- Task (tarea)
- Subtask (subtarea)

---

## 🚀 Flujo de ejecución

1. Definir objetivo
2. Dividir en tareas
3. Validar enfoque
4. Implementar
5. Revisar

---

## 🧩 Reglas de iteración

- Trabajar una funcionalidad a la vez
- Cada tarea debe tener una única responsabilidad
- Evitar cambios paralelos no relacionados

---

## ✅ Definición de terminado

Una tarea se considera finalizada cuando:

- Funciona correctamente
- Sigue los estándares definidos
- Es entendible
- Es escalable

---

## 🛡️ Red de seguridad (tests + monitoreo)

Tres capas para no llevarse sustos en producción:

**1. CI automático (GitHub Actions — `.github/workflows/ci.yml`)**
- Corre en cada `push`/`PR` a `main`: instala el backend y ejecuta `npm test` (tests unitarios de la lógica de tiempo y anti-conflicto).
- Si un test se rompe, el check queda en **rojo** → se ve antes de mergear. Es la red contra regresiones.

**2. Suite de concurrencia (manual, antes de cada release)**
- `cd project/apps/backend && npm run test:concurrencia` (18 escenarios, necesita Postgres local con el club demo sembrado).
- Cubre doble-booking, cruce de medianoche, cancelación con cargo y sobrecobro de cobros.
- No corre en CI porque necesita la DB sembrada; **correrla a mano antes de soltar una versión que toque Reservas/pagos.**

**3. `qa-flujos` antes de entregar a un cliente / antes de una demo**
- Invocar el agente `qa-flujos` para auditar reservas/turnos/pagos/auth contra las reglas de negocio.
- Es la última pasada humana+IA antes de que lo vea un dueño de club.

**4. Error tracking en producción (Sentry — dormido hasta el deploy)**
- El código ya está instrumentado en `src/app.js`, **DORMIDO**: si no existe la env var `SENTRY_DSN`, ni se importa el paquete (en local no afecta nada).
- **Para activarlo en el deploy:** crear un proyecto en sentry.io (gratis), copiar el DSN y setear `SENTRY_DSN` en las env vars de Railway. Nada más que tocar.
- **Qué captura hoy:** crashes del proceso (excepciones/promesas no manejadas, automático) + errores que burbujean de Express.
- **Limitación conocida (refinamiento post-entrega):** las rutas que hacen `try/catch` y responden 500 NO se reportan a Sentry todavía (quedan en los logs de Railway vía `console.error`). Para cobertura fina: agregar `Sentry.captureException(err)` en esos catch, o migrar el arranque a `node --import ./src/instrument.mjs` (instrumentación completa + silencia el warning de "express is not instrumented").
