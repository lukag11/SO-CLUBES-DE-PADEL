import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Swords, UserPlus, Users, CalendarDays, Clock, Loader2, Check } from 'lucide-react'
import usePlayerStore from '../store/playerStore'
import { api } from '../lib/api'
import InfoBlock from '../components/InfoBlock'
import { useToast } from '../components/ui/ToastProvider'

const fmtFecha = (f) => {
  if (!f) return ''
  const [y, m, d] = f.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

// "Partidos": feed de descubrimiento de los partidos abiertos PÚBLICOS de tu categoría (armados por
// otros jugadores). Pedís tu lugar con "¡Voy!" → queda pendiente de aprobación del organizador.
// Reusa GET /solicitudes/abiertas (ya filtra: mi categoría, públicos, no los míos, no donde ya pedí).
export default function PlayerPartidosPage() {
  const token = usePlayerStore((s) => s.token)
  const toast = useToast()
  const [abiertos, setAbiertos] = useState(null)
  const [accion, setAccion] = useState(null)

  const cargar = () => {
    if (!token) return
    api.get('/solicitudes/abiertas', { Authorization: `Bearer ${token}` })
      .then((d) => setAbiertos(Array.isArray(d) ? d : [])).catch(() => setAbiertos([]))
  }
  useEffect(() => { cargar() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const sumarme = (id) => {
    if (accion) return
    setAccion(id)
    api.post(`/solicitudes/${id}/voy`, {}, { Authorization: `Bearer ${token}` })
      .then(() => { toast.success('Pediste sumarte. El organizador tiene que aceptarte. 🎾'); cargar() })
      .catch((e) => toast.error(e?.message || 'No se pudo sumar'))
      .finally(() => setAccion(null))
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Swords size={22} className="text-club" /> Partidos abiertos</h1>
        <p className="text-white/40 text-sm mt-1">Sumate a un partido de tu categoría. El organizador confirma tu lugar.</p>
        <InfoBlock label="¿Cómo funciona?" variant="dark">
          <p>Acá ves los partidos abiertos de tu categoría que otros jugadores armaron y a los que les falta gente.</p>
          <p>Tocá <strong className="text-club">¡Voy!</strong> para pedir tu lugar. El organizador te acepta o rechaza, y te avisamos por la app (🔔 campana).</p>
          <p>¿Querés armar el tuyo? Reservá una cancha y buscá los que te faltan desde <strong>Reservar cancha</strong>.</p>
        </InfoBlock>
      </div>

      {abiertos === null ? (
        <p className="text-white/30 text-sm">Cargando…</p>
      ) : abiertos.length === 0 ? (
        <div className="rounded-2xl border border-white/8 bg-[#0d1117] p-8 text-center flex flex-col items-center gap-3">
          <Swords size={30} className="text-white/20" />
          <p className="text-white/60 text-sm">Todavía no hay partidos abiertos de tu categoría.</p>
          <p className="text-white/35 text-xs -mt-1">Cuando alguien arme uno, lo vas a ver acá. Mientras, podés crear el tuyo.</p>
          <Link to="/dashboardJugadores/reservas" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all mt-1">
            <UserPlus size={15} /> Armá el tuyo
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {abiertos.map((s) => {
            const esPareja = s.busco === 'pareja'
            return (
              <div key={s.id} className="rounded-2xl border border-club/25 bg-club/5 p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-club/15 grid place-items-center shrink-0">{esPareja ? <Users size={18} className="text-club" /> : <UserPlus size={18} className="text-club" />}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{esPareja ? 'Buscan una pareja rival' : `Faltan ${s.faltan ?? 1} jugador${(s.faltan ?? 1) !== 1 ? 'es' : ''}`}{s.categoria ? ` · ${s.categoria}` : ''}</p>
                  <p className="text-white/40 text-xs flex items-center gap-2 mt-0.5 capitalize">
                    <span className="flex items-center gap-1"><CalendarDays size={11} /> {fmtFecha(s.fecha)}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {s.horaInicio}</span>
                  </p>
                  <p className="text-white/30 text-[11px] mt-0.5 truncate">Organiza {s.solicitante}{s.nota ? ` · ${s.nota}` : ''}</p>
                </div>
                <button onClick={() => sumarme(s.id)} disabled={accion === s.id}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-club text-dark-900 text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
                  {accion === s.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {esPareja ? '¡Vamos!' : '¡Voy!'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
