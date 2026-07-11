import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapPin, Search } from 'lucide-react'

// Fix del ícono por defecto de Leaflet (con Vite/bundler las URLs internas se rompen).
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const DEFAULT = { lat: -34.6037, lng: -58.3816 } // Buenos Aires — solo si no hay coords guardadas

// Recentra el mapa cuando cambian las coords (ej. tras buscar la dirección).
function Recentrar({ lat, lng }) {
  const map = useMap()
  useEffect(() => { if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 15)) }, [lat, lng]) // eslint-disable-line
  return null
}

// Al hacer click en el mapa (modo edición), mueve el pin a ese punto.
function ClicParaMover({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng) } })
  return null
}

// Mapa de ubicación. editable=true (admin): pin arrastrable + click + buscar dirección.
// editable=false (landing): solo muestra el pin, read-only.
export default function MapaUbicacion({ lat, lng, onChange, direccion = '', editable = false, alto = 260 }) {
  const tieneCoords = lat != null && lng != null
  const centro = tieneCoords ? { lat, lng } : DEFAULT
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(direccion || '') // caja de búsqueda propia del mapa
  const markerRef = useRef(null)

  // Geocoding GRATIS con Nominatim (OpenStreetMap). Uso bajo (admin) → OK con su política.
  const buscarDireccion = async () => {
    const q = (query || '').trim()
    if (!q) { setError('Escribí una dirección o lugar para buscar.'); return }
    setBuscando(true); setError('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
      const r = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await r.json()
      if (Array.isArray(data) && data[0]) onChange(Number(data[0].lat), Number(data[0].lon))
      else setError('No encontré esa dirección. Movés el pin a mano igual.')
    } catch { setError('No se pudo buscar ahora. Movés el pin a mano.') }
    finally { setBuscando(false) }
  }

  return (
    <div className="flex flex-col gap-2">
      {editable && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarDireccion() } }}
              placeholder="Buscá una dirección o lugar…"
              className="flex-1 min-w-0 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-emerald-400"
            />
            <button type="button" onClick={buscarDireccion} disabled={buscando}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50 shrink-0">
              <Search size={14} /> {buscando ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin size={12} /> Buscá y después arrastrá el pin al punto exacto</span>
        </div>
      )}
      {error && <p className="text-xs text-amber-600">{error}</p>}
      <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: alto }}>
        <MapContainer center={[centro.lat, centro.lng]} zoom={tieneCoords ? 16 : 13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {tieneCoords && (
            <Marker
              position={[lat, lng]}
              draggable={editable}
              ref={markerRef}
              eventHandlers={editable ? { dragend: () => { const m = markerRef.current; if (m) { const p = m.getLatLng(); onChange(p.lat, p.lng) } } } : undefined}
            />
          )}
          {editable && <ClicParaMover onPick={onChange} />}
          <Recentrar lat={lat} lng={lng} />
        </MapContainer>
      </div>
    </div>
  )
}
