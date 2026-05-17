# Flujo: Administrador — Directorio de Jugadores

Ruta: `/dashboardAdmin/jugadores`  
Archivo: `JugadoresAdminPage.jsx`  
Endpoints: `GET/POST/PATCH/DELETE /api/jugadores`

---

## Estados de un jugador

| Estado | `cuentaActiva` | `activo` | Visual | Descripción |
|---|---|---|---|---|
| Activo | `true` | `true` | Bolita verde | Tiene cuenta y acceso completo |
| Sin cuenta | `false` | `true` | Bolita verde/amarillo | Pre-registrado por admin, sin password |
| Inactivo | `true` | `false` | Bolita roja | Cuenta desactivada, sin acceso |

---

## Alta manual de jugador

1. Admin hace click en "Dar de alta"
2. Completa nombre, apellido, DNI (obligatorios), email, teléfono, categoría (opcionales)
3. Validación en tiempo real: nombre/apellido sin números, DNI solo dígitos 7-8
4. Backend crea jugador con `cuentaActiva: false`, sin password
5. Aparece en la lista con bolita verde/amarillo ("Sin cuenta")
6. Toast de confirmación: "Nombre Apellido dado de alta"

**Caso de uso:** cargar al jugador antes de que se registre, para asignarle torneos o turnos fijos.

---

## Match automático al registrarse

Cuando el jugador va a `/jugadores/registro` con el mismo DNI:
1. Backend detecta registro existente con `cuentaActiva: false`
2. En vez de 409, hace MERGE: asigna password + `cuentaActiva: true`
3. El jugador queda logueado con todo su historial (torneos, turnos fijos)
4. En la lista admin, el jugador pasa a bolita verde ("Activo")

---

## Editar jugador

1. Admin abre el drawer de un jugador → "Editar datos"
2. Puede modificar: nombre, apellido, email, teléfono, categoría
3. DNI: editable solo si `cuentaActiva: false` (sin cuenta). Bloqueado para activos e inactivos.
4. Validación idéntica al alta
5. Backend: `PATCH /api/jugadores/:id`
6. Toast: "Datos actualizados correctamente"

---

## Dar de baja

1. Admin abre drawer → "Dar de baja" (solo visible si `cuentaActiva && activo`)
2. Aparece modal de confirmación custom (no `window.confirm`)
3. Admin confirma → backend `PATCH /api/jugadores/:id` con `{ activo: false }`
4. Jugador pasa a bolita roja en la lista
5. Si el jugador estaba logueado: en su próximo request recibe 401 `cuenta_inactiva`
6. `PlayerLayout` intercepta el evento y muestra modal "Cuenta desactivada" → logout automático

---

## Reactivar jugador

1. Admin abre drawer → "Reactivar cuenta" (solo visible si `cuentaActiva && !activo`)
2. Sin modal de confirmación (acción reversible)
3. Backend `PATCH /api/jugadores/:id` con `{ activo: true }`
4. Jugador vuelve a bolita verde, puede loguearse nuevamente
5. Toast: "Nombre Apellido reactivado"

---

## Eliminar jugador

1. Admin abre drawer → "Eliminar jugador" (solo visible si `!cuentaActiva`)
2. Modal de confirmación con ícono rojo, nombre del jugador y aviso "no se puede deshacer"
3. Backend `DELETE /api/jugadores/:id` — verifica que `cuentaActiva: false` antes de borrar
4. Registro eliminado de la DB permanentemente
5. Toast: "Nombre Apellido eliminado"

---

## Filtros disponibles

| Filtro | Muestra |
|---|---|
| Todos | Todos los jugadores del club |
| Activos | `cuentaActiva: true && activo: true` |
| Sin cuenta | `cuentaActiva: false` |
| Inactivos | `cuentaActiva: true && activo: false` |

---

## Protección de rutas (middleware requireActive)

Todas las rutas del jugador incluyen `requireActive` como tercer middleware:

```
requireAuth → requireRole('jugador') → requireActive → handler
```

Si `activo: false`:
- Devuelve `401 { error: 'cuenta_inactiva', message: 'Tu cuenta fue dada de baja...' }`
- `api.js` despacha `CustomEvent('jugador:cuenta-inactiva')`
- `PlayerLayout` escucha el evento → muestra modal → logout → redirect a `/jugadores`

Rutas protegidas: reservas, turnos-fijos, jugadores/me, notificaciones, torneos, cargos.

---

## Login bloqueado si inactivo

`POST /auth/jugador/login` verifica `activo` después de validar password:
- `!jugador.activo` → 403 "Tu cuenta fue dada de baja. Contactá al club."

---

## Historial expandible en drawer (2026-05-17)

El drawer de un jugador muestra dos cards colapsables: "Turnos fijos" y "Reservas eventuales".

- Al primer click se hace un fetch on-demand al endpoint correspondiente
- Los datos quedan cacheados en estado local del drawer (no se re-fetchean al volver a abrir)
- Cada item muestra: día (TF) o fecha (reservas), horario inicio–fin, nombre de cancha, badge de estado
- Implementado con `ChevronDown` con rotación animada + `Repeat` (ícono turnos fijos)

**Endpoints usados:**
- `GET /api/turnos-fijos/jugador/:id` — TF no inactivos del jugador
- `GET /api/reservas/jugador/:id` — reservas eventuales no canceladas del jugador

---

## Fix conteo doble (_count.reservas)

El backend incluye en el select de todos los endpoints de jugadores:
```js
_count: { select: { reservas: { where: { estado: 'confirmada', esTurnoFijo: false } } } }
```

Sin este filtro, cuando el admin creaba un turno fijo manual el backend generaba una `Reserva(esTurnoFijo:true)` + un `TurnoFijo`, y ambos se contaban, mostrando "1 fijo + 1 reserva" incorrectamente.

---

## Alta rápida — jugador sin cuenta

Ver `flujo-reservas-eventuales.md` — sección "Alta rápida inline". El jugador creado vía alta rápida aparece en este directorio con `cuentaActiva: false`. Puede ser buscado, editado y dado de alta como cualquier pre-registro.
