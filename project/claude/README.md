# /claude — Sistema de Contexto del Agente IA

Esta carpeta es el **sistema nervioso del agente IA** del proyecto.  
Contiene todo lo que Claude necesita para comportarse correctamente en cada sesión de trabajo.  
Es independiente del código fuente y puede evolucionar sin afectar la aplicación.

---

## Estructura

```
claude/
├── context/        → Qué es el producto: negocio, arquitectura, reglas y roadmap
├── memoria/        → Qué pasó: estado actual, decisiones, bugs, flujos por rol
├── prompts/        → Cómo arrancar/cerrar sesiones con el agente
├── templates/      → Plantillas estandarizadas para documentar tareas, bugs y features
└── workflows/      → Secuencias paso a paso para tareas recurrentes
```

---

## Carpetas

### `context/`
Todo lo que el agente necesita saber sobre el negocio y el producto antes de tocar código.  
Incluye visión, arquitectura, funcionalidades, usuarios, roadmap y monetización.

- **`governance/`** — Reglas de comportamiento del agente: protocolo, estándares de código, flujo de desarrollo y criterios de decisión.

### `memoria/`
Estado vivo del proyecto. Se actualiza después de cada sesión importante.  
Contiene el progreso por módulo, decisiones técnicas, bugs registrados, reglas de negocio e ideas.

- **`flujos/`** — Flujo completo por rol (admin, jugador, profesor) y por proceso (reservas, turnos fijos, torneos, ausencias).

### `prompts/`
Instrucciones listas para usar al inicio y cierre de cada sesión.  
El `master_prompt.md` es el punto de entrada obligatorio antes de cualquier acción.

### `templates/`
Formatos reutilizables para documentar de forma consistente:
tareas, features, bugs, decisiones técnicas, endpoints y modelos de datos.

### `workflows/`
Flujos detallados paso a paso para tareas recurrentes:
desarrollo general, nueva feature, fix de bugs, actualización de memoria y cierre de sesión.

---

## Cómo usar esto

**Al iniciar una sesión:**
1. Leer `prompts/master_prompt.md`
2. Revisar `memoria/progreso.md` para saber el estado actual
3. Usar `prompts/iniciar_tarea.md` para arrancar la tarea

**Al cerrar una sesión:**
1. Seguir `workflows/workflow_cierre.md`
2. Actualizar los archivos relevantes en `memoria/`
3. Registrar decisiones en `memoria/decisiones.md`

---

## Referencia visual

Ver [estructura_carpeta_claude.html](estructura_carpeta_claude.html) para una vista detallada con descripción de cada archivo.
