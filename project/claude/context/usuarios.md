# Usuarios del sistema

**Actualizado:** 2026-05-04

---

## 1. Administrador del club

**Ruta:** `/dashboardAdmin`
**Login:** email + password (mock: admin@club.com / 123456)

Responsabilidades:
- Aprobar/rechazar reservas eventuales y turnos fijos
- Ver y gestionar la grilla semanal de reservas
- Registrar pagos
- Crear y gestionar torneos (inscriptos, grupos, bracket, resultados)
- Configurar el club (canchas, horarios, logo, landing)
- Ver notificaciones de nuevas reservas

---

## 2. Jugador

**Ruta:** `/dashboardJugadores`
**Login:** DNI + contraseña
**Registro:** stepper 3 pasos (datos personales, DNI, contraseña)

Responsabilidades:
- Reservar canchas (grilla por fecha y cancha)
- Solicitar turnos fijos semanales
- Ver historial de reservas
- Inscribirse a torneos
- Ver estadísticas propias
- Ver notificaciones

---

## 3. Profesor

**Ruta:** `/dashboardProfesor`
**Login:** email + password (credenciales creadas por admin)

Responsabilidades:
- Ver su agenda de clases
- Configurar su disponibilidad horaria
- Ver clases asignadas por el admin

---

## 4. SuperAdmin PadelOS (futuro)

**Ruta:** `/superadmin` (pendiente)

Responsabilidades:
- Gestionar todos los clubes (tenants)
- Crear cuentas de admin para nuevos clientes
- Ver métricas globales de la plataforma

---

## Separación de datos (multi-tenancy)

Cada usuario pertenece a un club (`club_id`). El backend filtra toda la data por club.
Un jugador del Club A nunca ve data del Club B.
