# Guía de Responsive (mobile) — PadelwIArk

Documento vivo. Vamos pantalla por pantalla: auditar → proponer fix → Luca prueba en DevTools → iterar → marcar hecho.

## Regla de oro (INNEGOCIABLE)
**Responsive = solo mobile. El desktop NO se toca.** Este código está construido desktop-first con overrides `md:`/`lg:`. Los cambios van en el **base** (mobile) o en `sm:`, SIN alterar lo que ya hay en `md:` en adelante. Después de cada cambio, verificar que desktop quedó pixel-idéntico. Ver [[feedback_responsive_solo_mobile]] y [[project_retomar_responsive_wiarky]].

## Método
- **Testeo:** Chrome/Edge DevTools → device mode. Anchos de referencia: **360** (Android chico), **390** (iPhone 12/13/14), y **768** (tablet / borde `md`).
- **Loop:** una pantalla a la vez. Auditoría marca los problemas con `file:line` + severidad. Se corrige, se prueba, se marca.
- **Severidad:** 🔴 rompe layout (overflow, ilegible, inusable) · 🟡 feo/apretado · 🟢 menor/pulido.

## Orden de superficies (por impacto en mobile)
1. **Landing pública** — ✅ auditada + fixes aplicados (1🔴 + 3🟡). Queda sólida.
2. **Área jugadores** — ✅ auditada + fixes aplicados. Estaba MUY bien preparada (cero 🔴; `PlayerLayout` tiene `overflow-x-hidden`). Solo 4 🟡 apretado: dashboard hero (`p-5 sm:p-8` + `grid-cols-2 sm:grid-cols-4`), fila turnos fijos (`px-4 sm:px-6`+`gap-3 sm:gap-4`), MiniStat stats (`text-2xl sm:text-3xl break-words`), header mis-reservas (`flex-wrap`). **La grilla de reservas, login, registro y stats/charts ya estaban OK — no se tocaron.**
3. **Dashboard admin** — ✅ auditado + fixes. Shell SÓLIDO (sidebar off-canvas + bottom-nav + `main overflow-x-hidden`). 2 🔴 = barras de tabs `w-fit` sin scroll (Pagos `:958` y Reservas `:3371`) que RECORTABAN pestañas (no llegabas a Gastos/Caja ni a Clases) → `max-w-full overflow-x-auto no-scrollbar` + `shrink-0 whitespace-nowrap`. 🟡 hechos: leyenda heatmap Dirección, picker templates TorneoDetalle (`grid-cols-2 sm:grid-cols-4`), fila pagada Pagos (`flex-wrap`), modal mapa Club (`max-h-[90vh] overflow-y-auto`). 🟡 menores PENDIENTES (opcionales, "apretado" no rotura): JugadoresAdmin filtros, TorneosPage `TorneoAlertRow`, AdminSponsors LogoPicker, AdminReservasEstadisticas valor ingresos. La **grilla de reservas** ya tenía vista mobile dedicada (`GrillaMobile`) — no se tocó.
4. **Sección TORNEOS del dash admin** ← PRÓXIMO (mañana 2026-07-12): `TorneosPage` + `TorneoDetallePage` (fixture, grupos, brackets, scheduling) a fondo en mobile.
5. WIarky (barra de input apretada — [[project_retomar_responsive_wiarky]])
6. Profesor (más de escritorio)

**Fixes sueltos ya aplicados (fuera de auditoría):** BottomNav mobile eliminada; Sidebar drawer abre expandido (`expanded = hovered || mobileOpen`); GrillaMobile flex→CSS Grid (columnas idénticas) + fonts horarios; drawer jugador (nombre `break-words`, hero `shrink-0` por el clip del `overflow-hidden`); Club→Información ancho de campos + rediseño cargo cancelación; toggle modo oscuro admin quitado.

---

## 1. Landing pública

Archivos: `features/landing/Template1..5.jsx`, `features/landing/LandingSections.jsx`, `components/ui/PublicNavbar.jsx`, `pages/LandingPage.jsx`.

### Estado por pantalla/sección (auditoría 2026-07-11)

| # | Sección | Sev | Problema | Estado |
|---|---|---|---|---|
| 1 | Reservas — selector de 7 días (variante `columns`, Templates 2/3/4/5) | 🔴 | 7 botones `w-10` + 2 chevrones `shrink-0` ≈ 370px → desborda y da **scroll horizontal de toda la página** en 360/390. `LandingSections.jsx` ~1908-1951 | ✅ hecho — mobile: chevrones ocultos + 7 días en `grid-cols-7` full-width; desktop `sm:flex` igual |
| 2 | Hero Template 2 | 🟡 | `h-screen` + `overflow-hidden` recorta el hero en viewports cortos. `Template2.jsx:29` | ✅ hecho — `min-h-screen` + `py-24 md:py-0` |
| 3 | Navbar — nombre del club | 🟡 | `whitespace-nowrap` sin `max-w`/`truncate` → nombre largo desborda / tapa la hamburguesa. `PublicNavbar.jsx:103` | ✅ hecho — `truncate max-w-[55vw] md:max-w-none` + `min-w-0` + `px-4 md:px-8` |
| 4 | Template 4 — todas las secciones | 🟡 | `pl-8`/`pl-14` sin variante mobile → 56px de sangría izq, contenido descentrado. `Template4.jsx` 107/131/144/163/173/183/193/202/229 | ✅ hecho — `pl-0 md:pl-8` + footer `px-6 md:pl-14` |
| — | Template 1, 3, 5 hero / galería / lightbox / servicios / staff / faq / contacto | 🟢 | Bien preparados (colapsan a 1 col, escalones `sm:`/`md:`). Sin roturas | ✅ |

**Regla aplicada en los fixes:** mobile-only, `md:` intacto (desktop pixel-idéntico).
