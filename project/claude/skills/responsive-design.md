# Skill: Responsive Design

Guía de referencia para implementar responsive design en este proyecto.
Basada en los patrones reales del codebase. Leer antes de tocar cualquier layout.

---

## Breakpoints Tailwind activos

| Prefijo | px   | Dispositivo típico       |
|---------|------|--------------------------|
| (base)  | 0px  | Mobile portrait          |
| `sm:`   | 640px| Mobile landscape / tablet pequeña |
| `md:`   | 768px| Tablet                   |
| `lg:`   | 1024px| Desktop pequeño         |
| `xl:`   | 1280px| Desktop estándar        |

Estrategia del proyecto: **mobile-first**. Escribir la clase base para mobile, luego agregar `md:` o `lg:` para pantallas más grandes.

```jsx
// Correcto — mobile first
<div className="flex flex-col md:flex-row gap-4">

// Incorrecto — desktop first con override
<div className="flex flex-row max-md:flex-col gap-4">
```

---

## Sidebar — Patrón hamburger (mobile)

### Problema actual
Ambos layouts fijan el sidebar con `w-60` y el contenido con `ml-60`. En mobile el sidebar tapa todo.

### Solución estándar del proyecto

**En el Layout** (`AdminDashboardLayout.jsx` / `PlayerLayout.jsx`):

```jsx
const [sidebarOpen, setSidebarOpen] = useState(false)

// Overlay oscuro (solo mobile)
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}

<Sidebar
  collapsed={collapsed}
  onToggle={handleToggle}
  mobileOpen={sidebarOpen}
  onMobileClose={() => setSidebarOpen(false)}
/>

// Contenido: sin ml-60 en mobile
<div className={`flex-1 flex flex-col transition-all duration-300 lg:${collapsed ? 'ml-16' : 'ml-60'}`}>
  <Navbar title={title} onMenuClick={() => setSidebarOpen(true)} />
```

**En Sidebar.jsx**:
```jsx
// aside: oculto en mobile, visible en desktop
// En mobile: se desliza desde la izquierda cuando mobileOpen=true
<aside className={`
  fixed top-0 left-0 h-screen bg-dark-900 flex flex-col z-40 transition-all duration-300
  ${collapsed ? 'lg:w-16' : 'lg:w-60'}
  w-60
  ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
`}>
```

**En Navbar.jsx** — agregar botón hamburger:
```jsx
// Botón hamburger (solo mobile)
<button
  onClick={onMenuClick}
  className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
>
  <Menu size={18} />
</button>
```

### PlayerLayout — mismo patrón, sidebar oscuro
```jsx
// aside jugador
<aside className={`
  fixed top-0 left-0 h-screen w-60 bg-[#0d1117] border-r border-white/5 flex flex-col z-40
  transition-transform duration-300
  ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
`}>
```

---

## Grilla de reservas (tabla horaria)

La tabla tiene muchas columnas (canchas) y filas (franjas). En mobile no cabe.

**Solución: scroll horizontal contenido, header fijo**

```jsx
// Wrapper con scroll horizontal
<div className="overflow-x-auto -mx-6 px-6">
  <div className="min-w-[640px]">  {/* ancho mínimo para que se vea bien */}
    {/* tabla */}
  </div>
</div>
```

En mobile mostrar un selector de cancha (tabs o dropdown) en vez de todas las columnas juntas es mejor UX, pero el scroll es aceptable para MVP.

---

## Cards grid — patrón estándar

```jsx
// De 1 columna en mobile a N en desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Para cards de torneo (más anchas)
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
```

---

## Formularios

Los formularios de este proyecto usan `grid-cols-2` en desktop.

```jsx
// Siempre col completo en mobile, 2 columnas en desktop
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>...</div>
  <div>...</div>
  {/* Elemento que ocupa toda la fila */}
  <div className="sm:col-span-2">...</div>
</div>
```

---

## Modales

Los modales grandes (formulario nuevo torneo, detalle torneo) necesen adaptarse.

```jsx
// Panel lateral → full-screen en mobile
<div className={`
  fixed inset-0 z-50 flex
  items-end sm:items-center justify-center
  bg-black/50
`}>
  <div className={`
    bg-white w-full sm:max-w-lg sm:rounded-2xl
    rounded-t-2xl max-h-[90vh] overflow-y-auto
  `}>
```

Para modales que en desktop son paneles laterales (drawer):
```jsx
// En mobile: panel desde abajo (bottom sheet)
// En desktop: panel lateral fijo
<div className={`
  fixed z-50 bg-white shadow-xl transition-transform duration-300
  inset-x-0 bottom-0 rounded-t-2xl max-h-[90vh] overflow-y-auto   {/* mobile */}
  sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] sm:rounded-none sm:max-h-screen  {/* desktop */}
  ${open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-x-full'}
`}>
```

---

## Navbar altura y padding

En mobile reducir padding del Navbar y del `<main>`:

```jsx
// Navbar
<header className="h-14 md:h-16 px-4 md:px-6 ...">

// Main content
<main className="flex-1 p-4 md:p-6 overflow-y-auto">
```

---

## Tipografía responsiva

```jsx
// Títulos de página
<h1 className="text-xl md:text-2xl font-bold">

// Títulos de sección
<h2 className="text-base md:text-lg font-semibold">

// Subtítulos de card
<p className="text-sm text-slate-500">  {/* no necesita responsive */}
```

---

## Bracket / BracketView

El bracket de eliminación es el componente más difícil de hacer responsive.

**Estrategia recomendada:** scroll horizontal + zoom out en mobile.

```jsx
<div className="overflow-x-auto pb-4">
  <div className="min-w-[900px]">  {/* bracket no se comprime, se scrollea */}
    <BracketView ... />
  </div>
</div>
```

Para la vista pública/compartida del bracket, permitir pinch-to-zoom nativo del browser (no bloquear con `user-scalable=no`).

---

## Colores y tokens del design system

No inventar colores. Usar siempre los tokens del proyecto:

| Token Tailwind | Uso |
|----------------|-----|
| `bg-dark-900` | Sidebar admin (fondo oscuro) |
| `bg-[#0d1117]` | Sidebar jugador (fondo oscuro) |
| `bg-[#0a0e1a]` | Fondo global área jugador |
| `brand-500` | Color acento admin |
| `#afca0b` | Color acento jugador |
| `slate-50` | Fondo área admin |
| `white/5`, `white/10` | Bordes sobre fondos oscuros |

---

## Checklist antes de dar por completo un componente responsive

- [ ] Mobile portrait (375px): nada se corta, nada se superpone
- [ ] Mobile landscape (667px): sidebar oculto/hamburger funciona
- [ ] Tablet (768px): layout intermedio coherente
- [ ] Desktop (1280px): igual que antes del cambio

Herramienta: DevTools → Toggle device toolbar → probar en 375px, 768px, 1280px.

---

## Orden de trabajo recomendado

1. **Sidebar admin** — `Sidebar.jsx` + `AdminDashboardLayout.jsx` + `Navbar.jsx`
2. **Sidebar jugador** — `PlayerLayout.jsx`
3. **Sidebar profesor** — `ProfesorLayout.jsx`
4. Grilla de reservas (admin)
5. TorneoDetallePage (tabs + bracket)
6. Formularios (crear/editar torneo)
7. Landing pública (ya tiene algo de responsive, revisar)
