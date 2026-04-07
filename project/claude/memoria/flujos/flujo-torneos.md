# Flujo: Torneos

Gestión de torneos desde el admin y visualización/inscripción del jugador.  
Reglas aplicadas: RN-35, RN-36.

> **Estado actual**: Estructura base implementada con mock data. La integración entre el panel admin y el dashboard jugador está pendiente.

---

## Admin — Crear torneo (`/dashboardAdmin/torneos`)

1. Admin va a la sección Torneos
2. Ve lista de torneos existentes (activos, próximos, finalizados)
3. Admin crea un nuevo torneo:
   - Nombre, categorías habilitadas (8va–1ra) (RN-35)
   - Cupo por categoría
   - Formato (grupos + eliminación, eliminación directa, etc.)
   - Fecha de inicio y fin
   - Descripción
4. Torneo queda en estado `próximo`
5. Admin puede activar inscripción → toggle en cada torneo
6. Admin puede ver inscriptos por categoría

---

## Admin — Gestionar resultados (pendiente)

- Registrar resultados de partidos
- El ranking se actualiza automáticamente según resultados (RN-36)
- Avanzar equipos en el cuadro

---

## Jugador — Ver torneos (`/dashboardJugadores/torneos`)

1. Jugador va a la sección Torneos
2. Ve torneos disponibles (activos y próximos)
3. Puede inscribirse en la categoría que le corresponde (RN-30 — categoría del jugador)
4. Ve historial de torneos jugados y resultados

---

## Pendiente de implementar

- Conexión real entre `TorneosPage` (admin) y `PlayerTournamentsPage` (jugador)
- Store compartido para torneos
- Lógica de inscripción validada por categoría del jugador
- Cuadros de eliminación / grupos
- Carga de resultados
- Actualización automática del ranking
