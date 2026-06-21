# 🐛 Bugs

## [2026-06-20] Familia de bugs de medianoche (`00:00` como hora de fin)

Descripción:
`00:00` como hora de FIN de un turno se calculaba como minuto 0 en vez de 1440 (medianoche del día siguiente). Bugs PRE-EXISTENTES, salieron al barrer el bloque de automatización de turnos. Afectaba:
- validación de duración 1.5h del turno fijo
- `turnoYaTerminoHoy` y `venceCobro`
- corte de la ventana de cancelación
- `deudas.js` (turnos impagos contados como deuda antes de tiempo)
- `clubs.js` (`ocupadasAhora`)
- TODOS los checks de solapamiento de TF (creación jugador, creación admin, aprobación admin, reserva-vs-TF)

Fix:
Guard `=== '00:00' ? 1440` en cada conversión a minutos. Barrido completo en `routes/turnos-fijos.js`, `routes/reservas.js`, `routes/clubs.js`, `lib/deudas.js`.

Estado:
Cerrado. Probado e2e.

---

## [fecha] Problema con reservas duplicadas

Descripción:
Se pueden crear dos reservas en el mismo horario.

Estado:
Pendiente
