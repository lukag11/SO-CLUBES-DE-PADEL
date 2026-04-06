# 💡 Ideas

- Ranking automático de jugadores
- Sistema de matchmaking por nivel
- Integración con WhatsApp
- Panel de estadísticas del club

---

## 🎨 White-label / Personalización por club (pendiente)

Cada club debe poder personalizar su instancia desde el panel de administrador:

- **Logo del club** — subir imagen (avatar + banner)
- **Colores de marca** — color primario, secundario (aplicados via CSS variables dinámicas)
- **Modo oscuro** — toggle por club o por usuario

### Implicancias técnicas a tener en cuenta desde ya:
- Los colores del design system deben venir de CSS variables (ya está así con Tailwind v4 `@theme`) — facilitará el override dinámico por tenant
- El store de Zustand necesitará un `clubStore` con la config de branding
- Backend: tabla `club_config` con `primary_color`, `logo_url`, `dark_mode_default`, etc.
- El `DashboardLayout` deberá aplicar las variables CSS del club al montar

> Prioridad: post-MVP (Etapa 3-4 del roadmap)
