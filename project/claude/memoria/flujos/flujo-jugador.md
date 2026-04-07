# Flujo: Jugador — Registro y Acceso

Cubre el ciclo completo del jugador: registro, login, acceso al dashboard.  
Store: `playerStore`  
Reglas aplicadas: RN-29 a RN-31.

---

## Registro

1. Jugador llega a la landing del club (`/`)
2. CTA "Reservar cancha" o "Ver torneos" → redirige a `/dashboardJugadores`
   - Si ya está autenticado (`playerStore.isAuthenticated`) → redirige a `/dashboardJugadores/dashboard`
   - Si no → muestra `PlayerAuthPage` (login/registro)
3. Jugador elige "Registrarse"
4. Redirige a `/dashboardJugadores/registro`
5. Stepper de 3 pasos (RN-29):
   - **Paso 1 — Datos básicos**: nombre, apellido, DNI, email, contraseña
   - **Paso 2 — Perfil**: nivel de juego, categoría (8va–1ra), teléfono
   - **Paso 3 — Preferencias**: días disponibles, preferencias de horario
6. Al completar: `playerStore.login(player, token)`
   - Guarda `player_token` en localStorage
   - Guarda `player_data` en localStorage
7. Redirige a `/dashboardJugadores/dashboard`

---

## Login

1. Jugador va a `/dashboardJugadores`
2. Ingresa credenciales en `PlayerAuthPage`
3. `playerStore.login(player, token)` → igual que en registro
4. Redirige a `/dashboardJugadores/dashboard`

---

## Sesión persistente

- Al recargar: `playerStore` lee `player_token` y `player_data` de localStorage
- Si existen y son válidos → `isAuthenticated: true`, jugador queda logueado
- Si no existen → `isAuthenticated: false`, `PlayerLayout` redirige a `/dashboardJugadores`

---

## Logout

- `playerStore.logout()` limpia `player_token` y `player_data` de localStorage
- `isAuthenticated: false`
- Redirige a `/dashboardJugadores`

---

## Secciones del dashboard jugador

| Ruta | Página | Descripción |
|---|---|---|
| `/dashboard` | PlayerDashboardPage | Resumen: próximas reservas, estadísticas, racha |
| `/reservas` | PlayerReservasPage | Reservar cancha o solicitar turno fijo |
| `/turnos-fijos` | PlayerTurnosFijosPage | Ver y gestionar turnos fijos activos |
| `/estadisticas` | PlayerStatsPage | Historial y gráficos de rendimiento |
| `/torneos` | PlayerTournamentsPage | Torneos disponibles e historial |
| `/oponentes` | PlayerOpponentsPage | Análisis de rivales frecuentes |
| `/perfil` | PlayerProfilePage | Editar datos personales |
| `/notificaciones` | PlayerNotificacionesPage | Notificaciones del sistema |
