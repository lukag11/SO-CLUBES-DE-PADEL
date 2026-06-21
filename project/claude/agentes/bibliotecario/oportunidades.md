# Oportunidades — huecos e ideas accionables

> Lo que Luca no está viendo. El agente prioriza por impacto vs esfuerzo y ata cada ítem a una fuente/razón.
> Formato: idea · por qué (hueco de mercado / necesidad real) · impacto · esfuerzo · fuente · estado (nueva / en evaluación / descartada / en roadmap).

<!-- Oportunidades acá, ordenadas por impacto. -->

---

## 2026-06-21 · Rediseño dashboard admin — widgets recomendados (priorizado)

Cruzado contra lo que PadelwIArk ya tiene (6 tarjetas estáticas + feed). Marcado [HIGIENE] = lo tiene todo el rubro, hay que tenerlo; [DIFERENCIADOR] = nos despega.

### Imprescindibles (alto impacto, esfuerzo bajo-medio) — datos que YA están en la DB

1. **Occupancy rate del día (%) con gauge/sparkline** [HIGIENE]. Hoy mostramos "3/6 ahora" (snapshot). Falta el % de ocupación del día = slots reservados / slots disponibles. Es EL KPI rey del rubro (target 50%+). Esfuerzo: bajo (la data de reservas+franjas ya está). Fuente: financialmodelslab.com, Doinsport, Cortclub.

2. **Bloque "Necesita tu atención"** [DIFERENCIADOR de UX]. Lista accionable: turnos fijos por aprobar, ausencias a liberar, impagos del día, deudas vencidas, torneos con cupo+deadline. Convierte el dashboard de reporte pasivo a centro de acción. Esfuerzo: bajo-medio (la data existe: cargos pendientes, turnos, deuda). Fuente: patrones UX SaaS (alertas/condicional formatting).

3. **Agenda/timeline del día (próximos turnos)** [HIGIENE]. Hoy el feed mira al pasado. Falta una línea de tiempo de los turnos que vienen HOY (hora, cancha, jugador, pagado/impago). Es lo primero que mira un dueño al abrir. Esfuerzo: bajo (reservas de hoy ya se consultan). Fuente: Cortclub "coach daily agenda", patrón "today's agenda".

4. **Tendencia/comparación vs período anterior en cada KPI** [HIGIENE]. Hoy los números son estáticos sin contexto ("$X" sin saber si subió). Agregar "+12% vs ayer/semana pasada" + sparkline. Esfuerzo: medio (requiere query del período previo). Fuente: sparklines/UX SaaS.

### Diferenciadores (impacto alto, esfuerzo medio)

5. **Heatmap de ocupación día × franja horaria** [DIFERENCIADOR]. Visualiza horas pico/valle. Permite ver "los martes 15-17 están muertos" → base para promos/dynamic pricing futuro. Esfuerzo: medio. Fuente: CourtReserve peak hours, Doinsport low-performing slots, heatmaps UX.

6. **Utilización por cancha** [HIGIENE-fino]. Qué cancha rinde y cuál no. Cortclub lo vende como dolor central ("can't see which courts underperform"). Esfuerzo: medio. Fuente: Cortclub, CourtReserve.

7. **Saldo por cobrar / cobranzas del día destacado** [HIGIENE]. Ya hay un badge de "deuda por cobrar"; subirlo a widget con acción directa (ir a cobrar). Cortclub lo pone central. Esfuerzo: bajo. Fuente: Cortclub.

### Para más adelante (dependen de más data/uso)

8. **No-show / cancelaciones del día** [DIFERENCIADOR]. Métrica que Playtomic pone de primera ("reduce cancellations"). PadelwIArk ya tiene auto-liberación de ausencias → tiene la data para contarlas. Esfuerzo: medio.

9. **Retención de jugadores / jugadores nuevos vs recurrentes** [DIFERENCIADOR]. Membership retention 80%+ es KPI clave. Requiere más historia de uso. Esfuerzo: alto.

10. **Forecast/alerta "ocupación por debajo de lo normal"** [DIFERENCIADOR fuerte, atado a la marca IA]. "Hoy vas 30% abajo del promedio de martes → ¿lanzás promo?". Encaja perfecto con el posicionamiento PadelwIArk (IA embebida). Esfuerzo: alto. Fuente: forecast/seasonality overlays UX.

**Recomendación de secuencia para Luca:** 1+2+3 primero (mismo esfuerzo que tiene hoy, transforman el dashboard de pasado→presente y de números→acción). Luego 4 y 7. El heatmap (5) y utilización por cancha (6) como segunda ola visual. El #10 es la bandera "IA" cuando haya data.
