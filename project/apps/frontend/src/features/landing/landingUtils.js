// Helpers puros de la landing (sin dependencias pesadas como Leaflet), para poder importarlos
// desde el navbar u otras páginas sin arrastrar el mapa.

// ¿Hay algo para mostrar en la sección Contacto? (para no renderizarla vacía y ocultar el link del navbar).
export const hayContacto = (club) =>
  !!(club?.direccion || club?.telefono || club?.whatsapp || club?.instagram || club?.facebook || (club?.lat != null && club?.lng != null))
