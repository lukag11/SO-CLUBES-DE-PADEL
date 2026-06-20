# Carpeta documentador

Material del agente `documentador` (definido en `.claude/agents/documentador.md`). Lo tenés a la vista igual que mentor y qa.

## Por qué esta carpeta no tiene archivos de datos
A diferencia del mentor (que guarda `perfil.md` + `bitacora.md`) y del qa (que guarda `registro-auditorias.md`), el documentador **no tiene memoria propia**: escribe directo donde corresponde —

- `project/claude/memoria/progreso.md` — bloque fechado por cada cierre.
- Otros de `project/claude/memoria/` (decisiones, features, bugs, reglas-negocio) si aplican.
- Auto-memoria global del usuario (si hay un hecho duradero).
- `project/claude/context/` y `CLAUDE.md` solo si cambió algo estructural.

Su "salida" es el repo documentado, no un archivo acá. Esta carpeta existe para mantener el patrón `agentes/<nombre>/` y dejar a mano esta explicación.

## Cómo usarlo
- Al cerrar un bloque/feature: *"documentá el bloque"* → actualiza progreso + memoria y FRENA (te muestra qué cambió).
- Para cerrar y subir: *"documentá y subí"* → además commitea y pushea con tu convención (`docs(progreso): ...` + footer del entorno), mostrándote el commit antes del push.

## Protecciones
- **Nunca `git add .` ciego** — stagea a propósito y deja afuera los archivos basura (0 bytes / nombres rotos), avisándote.
- **Te muestra el commit y los archivos staged antes de pushear.**
