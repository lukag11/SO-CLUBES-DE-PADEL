# Hallazgos de investigación — bibliotecario

> Bitácora de investigación de mercado. El agente agrega entradas fechadas al terminar cada exploración. Las más nuevas van arriba.
> Formato: fecha · eje investigado · qué se encontró (con fuentes) · implicancia para PadelwIArk.

<!-- Las entradas nuevas se agregan acá abajo, la más reciente primero. -->

---

## 2026-06-21 · Dashboard / panel principal del admin — qué muestran los líderes y qué KPIs valoran los dueños

**Contexto:** Luca quiere rediseñar el dashboard admin de PadelwIArk (hoy: 6 tarjetas estáticas — canchas en uso, reservas hoy, jugadores activos, torneos activos, ingresos día/mes — + feed de actividad). Lo quiere "dinámico, reflejo del club en tiempo real".

### Qué muestran los competidores en su home/dashboard

- **Playtomic Manager** [Verificado]: Single & Multi-Club Dashboards. Reportes de Revenues, Occupancy, Players & Payment Collection, Payout Summary. "Total Revenues" = Online + Offline. Analytics en tiempo real para "increase occupancy, reduce cancellations". Multi-club: análisis por ubicación, de club a país.
  - https://playtomic.com/playtomic-manager
  - https://helpmanager.playtomic.com/hc/en-gb/articles/20535028898449-New-Single-and-Multi-Club-Dashboards
  - https://helpmanager.playtomic.com/hc/en-gb/articles/20534995597841-Revenues-reports

- **Cortclub** [Verificado] — el más alineado a lo que quiere Luca. Dashboard mobile-first que muestra: "expected funds, court-by-court occupancy and free slots in real time", daily revenue at a glance, peak-hour analytics, booking pipeline, **agenda diaria del coach con estado pagado/impago/confirmado**, historial de pago por jugador y **saldo pendiente para seguimiento**. Tesis de venta: "most club owners can't see which courts underperform, when demand drops or which coaches drive retention".
  - https://cortclub.com/

- **Doinsport** [Verificado]: "track your real-time occupancy rate, identify low-performing time slots and act on live data — not end-of-month reports". KPIs: Revenue, Occupancy rate, Ticket Z, Stock levels, Comparisons, Custom exports. KPIs consolidados + performance por sede + base de socios en un dashboard.
  - https://doinsport.com/en/club-padel-management-software
  - https://doinsport.com/en/blog/how-to-choose-a-reservation-app-for-padel-club-in-2026

- **CourtReserve** [Verificado]: "real-time dashboards con top-line metrics", identifica peak hours, popularidad de programas, uso de espacio. Reportes: court utilization, revenue, attendance, members, online payments. Para clubes grandes: dashboards multi-sede en Power BI/Tableau y live KPIs (member count, booking volume, revenue) embebidos en Notion/Coda.
  - https://courtreserve.com/features/

- **TPC Matchpoint** [Verificado]: seguimiento de occupancy rates e income streams con filtros para precisar data points.
  - https://tpcmatchpoint.com/en/padel-club-management-software.html

- **PadelOS** (competidor real, ojo con el nombre — homónimo del nombre viejo del proyecto) [Verificado]: tiene una sección dedicada "Reports & Analytics".
  - https://www.padelos.co/features/reports

### KPIs que de verdad importan al dueño (con benchmarks)
Fuente principal: financialmodelslab.com — "7 Padel Center KPIs" [Verificado]
https://financialmodelslab.com/blogs/kpi-metrics/padel-center

- **Court Utilization Rate (ocupación)**: horas reservadas / horas disponibles × 100. Target **50%+**. Revisión diaria/semanal. → EL KPI rey del rubro.
- **Average Revenue Per Booking (ARPB)**: revenue / nº de reservas. Semanal/mensual.
- **Ancillary Revenue %** (bar, pro-shop, alquileres): 10–15% del total. → cruza con módulo Finanzas/POS que ya tiene PadelwIArk.
- **Gross Margin %**: target 85%+.
- **Staff Cost / Revenue**: < 40%.
- **Membership Retention Rate**: 80%+ mensual.
- **Breakeven Occupancy**: ocupación mínima para cubrir costos fijos, < 40%.
- Cortclub agrega de facto: **no-shows/demand drop**, **saldo pendiente por cobrar**, **coach retention**.

### Patrones de UX de dashboard moderno "tiempo real" [Verificado]
- "Show what matters now", no "show everything". https://f1studioz.com/blog/smart-saas-dashboard-design/
- **Sparklines** al lado de cada KPI (tendencia up/down sin ejes ni leyendas). https://www.gitnexa.com/blogs/saas-dashboard-ux-patterns
- **Alertas/condicional formatting** → bloque "necesita tu atención" (pasa de reporte pasivo a monitoreo activo).
- **Heatmap** para patrones (ocupación por día×hora).
- **Forecast/seasonality overlays**: si la ocupación sube pero por debajo del forecast, lo marca y sugiere acción (promo).
- **Agenda del día** conectada a la data, "para arrancar bien el día". https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/

### Cruce contra PadelwIArk (huecos)
PadelwIArk HOY tiene: canchas en uso, reservas hoy, jugadores activos, torneos activos, ingresos día/mes, feed actividad, badge "deuda por cobrar". Le **falta** (todos son higiene del rubro, no diferenciadores): **occupancy rate %** (no solo "3/6 ahora"), **agenda/timeline del día**, **bloque "necesita atención"** (impagos, ausencias, turnos por aprobar), **horas pico/heatmap**, **tendencias/sparklines** (todo hoy es número estático sin comparación vs ayer/semana pasada), **utilización por cancha** (qué cancha rinde). El feed de actividad es mirar al pasado; falta mirar el AHORA y el HOY-que-viene.

