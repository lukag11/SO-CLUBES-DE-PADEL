# Carpeta QA — flujos críticos de PadelwIArk

Material del agente `qa-flujos` (definido en `.claude/agents/qa-flujos.md`). Lo tenés a la vista igual que la carpeta del mentor.

## Archivos
- **`registro-auditorias.md`** — historial de cada auditoría: qué flujo se revisó, veredicto (APTO / NO APTO) y los hallazgos. El QA lee esto antes de auditar (para saber qué ya cubrió) y agrega una entrada al terminar. Las más nuevas van arriba.

## Reglas de negocio que el QA verifica
Están embebidas en el agente (`.claude/agents/qa-flujos.md`, sección "Reglas de negocio que SIEMPRE verificás"). Resumen: slots 1.5h · turno fijo `pendiente` vs reserva `confirmada` · `runSerializable` anti doble-booking · RN-51 (un turno fijo por cancha/día) · sin localStorage para negocio · deudas bloquean baja · multi-tenant por `clubId` · guard de doble-submit.

## Cómo usarlo
- Antes de cerrar una feature de reservas/turnos/pagos/auth, o antes de una demo: pedí *"qa, audita el flujo de reservas"* (o el que sea).
- El QA reporta con severidad y veredicto. **No arregla código** — el fix lo decidís vos.
