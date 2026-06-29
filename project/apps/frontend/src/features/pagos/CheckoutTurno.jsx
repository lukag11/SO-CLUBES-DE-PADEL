import { useState, useEffect } from 'react'
import { X, Plus, Minus, UserPlus, Search, Users, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { METODO_MAP, metodosDelClub } from '../../lib/metodosPago'
import useClubStore from '../../store/clubStore'
import ModalBusquedaJugadores from '../../components/jugadores/ModalBusquedaJugadores'
import { useConfirm } from '../../components/ui/ConfirmProvider'

const money = (n) => `$${(n ?? 0).toLocaleString('es-AR')}`

let _uid = 0
const uid = () => `l${Date.now()}_${_uid++}`

// Reparte un monto en n partes enteras (el resto se suma a la primera) → suma exacta.
const repartir = (monto, n) => {
  if (n <= 0) return []
  const base = Math.floor(monto / n)
  const resto = monto - base * n
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0))
}

const inputCls = 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 outline-none focus:border-brand-400'

// ─── Cuenta del turno (Fase 2): uno paga todo o se divide por persona ───────────
// reserva: { _backendId, monto(precio), pagadoTurno, saldoTurno, jugadorId, jugadores[], canchaNombre, inicio, fin, pago }
const CheckoutTurno = ({ reserva, token, onClose, onDone }) => {
  const metodos = metodosDelClub(useClubStore((s) => s.club))
  const auth = { Authorization: `Bearer ${token}` }
  const metodoDefault = metodos[0] ?? 'efectivo'

  const precio = reserva.monto || 0
  const titularNombre = reserva.jugadores?.[0] || 'Titular'
  const hayTitular = !!reserva.jugadorId

  // Líneas ya registradas del turno (porciones + consumos) en estado LOCAL → el ticket se
  // corrige (anular/cobrar/quitar) sin cerrar el modal y los totales se recalculan en vivo.
  const [cuenta, setCuenta] = useState(Array.isArray(reserva.cargosCuenta) ? reserva.cargosCuenta : [])
  const cargosTurno = cuenta.filter((c) => c.tipo === 'reserva')
  const pagadoTurno = (reserva.pagadoSimple ? precio : 0) + cargosTurno.filter((c) => c.estado === 'pagado').reduce((s, c) => s + c.monto, 0)
  const aCuentaTurno = cargosTurno.filter((c) => c.estado === 'pendiente').reduce((s, c) => s + c.monto, 0)
  // Monto del turno que todavía se puede asignar/cobrar acá (descuenta lo cobrado y lo ya a cuenta)
  const saldoTurno = Math.max(0, precio - pagadoTurno - aCuentaTurno)
  const turnoSaldado = saldoTurno <= 0 && (pagadoTurno + aCuentaTurno) > 0
  const yaEnCuenta = cuenta

  const [productos, setProductos] = useState([])
  // Reapertura: si ya hay consumos cargados por jugador, abro directo en "Dividir" (no en el ticket plano).
  const [mode, setMode] = useState(() => {
    const cgs = Array.isArray(reserva.cargosCuenta) ? reserva.cargosCuenta : []
    const resueltos = new Set(cgs.filter((c) => c.jugadorId && c.tipo === 'reserva').map((c) => c.jugadorId))
    return cgs.some((c) => c.jugadorId && c.tipo === 'producto' && !resueltos.has(c.jugadorId)) ? 'split' : 'simple'
  })
  // El bloque "Ya en la cuenta" muestra SOLO las porciones del turno (los consumos se ven por persona / por pagador, no acá → no se duplica).
  const ticketArriba = yaEnCuenta.filter((c) => c.tipo === 'reserva')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [rosterPartido, setRosterPartido] = useState(null) // { jugadores:[{jugadorId,nombre,titular}] } si el turno es un partido abierto
  const [rosterCargado, setRosterCargado] = useState(false)

  useEffect(() => {
    api.get('/productos', auth).then((d) => setProductos(Array.isArray(d) ? d : [])).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Si el turno es un partido abierto (matching), traigo su roster para OFRECER pre-poblar el split.
  useEffect(() => {
    if (!reserva._backendId) return
    api.get(`/solicitudes/por-reserva/${reserva._backendId}`, auth)
      .then((d) => { if (d?.partido && d.jugadores?.length) setRosterPartido(d) })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const activos = productos.filter((p) => p.activo)

  // ── Estado modo SIMPLE ──
  const [cobrarTurno, setCobrarTurno] = useState(saldoTurno > 0)
  const [lineas, setLineas] = useState([])           // consumos del único pagador
  const [pagador, setPagador] = useState(hayTitular ? 'titular' : 'casual') // 'titular' | 'casual'
  const [cobrar, setCobrar] = useState(true)         // cobrar ahora vs a cuenta
  const [metodoPago, setMetodoPago] = useState(metodoDefault)

  // ── Estado modo SPLIT ──
  // Turno nuevo → precargo al titular. Reapertura (ya hay movimientos) → arranca vacío:
  // el titular pudo haber pagado y haberse ido; agregás a los que pagan ahora.
  const [personas, setPersonas] = useState(() => {
    // Reapertura: reconstruyo las personas desde los consumos ya persistidos (agrupados por jugador),
    // así al volver a entrar ves la carga como la dejaste (cada uno con lo suyo), no un ticket plano.
    const cgs = Array.isArray(reserva.cargosCuenta) ? reserva.cargosCuenta : []
    // Ya resueltos = los que ya tienen su porción del turno registrada → NO reaparecen en el split.
    const idsResueltos = new Set(cgs.filter((c) => c.jugadorId && c.tipo === 'reserva').map((c) => c.jugadorId))
    const idsConConsumo = [...new Set(cgs.filter((c) => c.jugadorId && c.tipo === 'producto').map((c) => c.jugadorId))].filter((jid) => !idsResueltos.has(jid))
    if (idsConConsumo.length) {
      return idsConConsumo.map((jid) => {
        const cc = cgs.find((c) => c.jugadorId === jid && c.jugador)
        return { key: uid(), tipo: 'jugador', jugadorId: jid, nombre: cc?.jugador ? `${cc.jugador.nombre} ${cc.jugador.apellido}` : 'Jugador', jugo: true, turnoMonto: 0, consumos: [], modo: 'cobrar', metodoPago: metodoDefault }
      })
    }
    return (hayTitular && yaEnCuenta.length === 0) ? [nuevaPersona({ tipo: 'titular', jugadorId: reserva.jugadorId, nombre: titularNombre })] : []
  })
  // Auto-reparto: activo hasta que el admin edite un monto a mano (ahí respeta su edición).
  const [autoSplit, setAutoSplit] = useState(true)

  function nuevaPersona({ tipo, jugadorId = null, nombre, jugo = true }) {
    return { key: uid(), tipo, jugadorId, nombre, jugo, turnoMonto: 0, consumos: [], modo: 'cobrar', metodoPago: metodoDefault }
  }

  // Divide el saldo del turno en partes iguales SOLO entre los que jugaron.
  // Los acompañantes (jugó = false) quedan en $0 de turno (pagan solo consumo).
  const dividirTurno = (lista = personas) => {
    const jugadores = lista.filter((p) => p.jugo)
    if (jugadores.length === 0) return lista
    const partes = repartir(saldoTurno, jugadores.length)
    let i = 0
    return lista.map((p) => p.jugo ? { ...p, turnoMonto: partes[i++] } : { ...p, turnoMonto: 0 })
  }

  // Firma del set de jugadores (los que cuentan para el turno). Cambia al sumar/quitar/togglear.
  const jugadoresKey = personas.filter((p) => p.jugo).map((p) => p.key).join(',')
  // Mientras autoSplit esté activo, redivide automáticamente cuando cambia el set de jugadores.
  // No entra en loop: solo modifica turnoMonto (no las keys), así que jugadoresKey no cambia.
  useEffect(() => {
    if (!autoSplit || saldoTurno <= 0) return
    setPersonas((prev) => dividirTurno(prev))
  }, [jugadoresKey, autoSplit, saldoTurno]) // eslint-disable-line react-hooks/exhaustive-deps

  // Híbrido matching→caja: el admin confirma y pre-poblamos el split con los jugadores del partido.
  // Merge por jugadorId → no duplica al titular ni pisa lo que el admin ya haya cargado a mano.
  const cargarRoster = () => {
    if (!rosterPartido) return
    setMode('split')
    setAutoSplit(true)
    setPersonas((prev) => {
      const existentes = new Set(prev.map((p) => p.jugadorId).filter(Boolean))
      const nuevos = rosterPartido.jugadores
        .filter((j) => !existentes.has(j.jugadorId))
        .map((j) => nuevaPersona({ tipo: j.jugadorId === reserva.jugadorId ? 'titular' : 'jugador', jugadorId: j.jugadorId, nombre: j.nombre, jugo: true }))
      return dividirTurno([...prev, ...nuevos])
    })
    setRosterCargado(true)
  }

  // ── Totales SIMPLE ──
  const totalConsumosSimple = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0)
  const totalSimple = (cobrarTurno ? saldoTurno : 0) + totalConsumosSimple
  const esACuentaSimple = pagador === 'titular' && !cobrar

  // ── Totales SPLIT ──
  const subtotalPersona = (p) => (p.turnoMonto || 0) + p.consumos.reduce((s, l) => s + l.precio * l.cantidad, 0)
  const totalSplit = personas.reduce((s, p) => s + subtotalPersona(p), 0)
  const turnoAsignado = personas.reduce((s, p) => s + (p.turnoMonto || 0), 0)
  const restoTurno = Math.max(0, saldoTurno - turnoAsignado)

  // ── Acciones consumos (genérico) ──
  const addProducto = (id, setter) => {
    const p = activos.find((x) => x.id === id); if (!p) return
    setter((prev) => {
      const ex = prev.find((l) => l.prodId === p.id)
      if (ex) return prev.map((l) => l.prodId === p.id ? { ...l, cantidad: l.cantidad + 1 } : l)
      return [...prev, { id: uid(), prodId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }]
    })
  }
  const addOtro = (nombre, precio, setter) => {
    setter((prev) => [...prev, { id: uid(), prodId: null, nombre: nombre.trim(), precio: Number(precio), cantidad: 1 }])
  }
  const cambiarCant = (lid, d, setter) => setter((prev) => prev.map((l) => l.id === lid ? { ...l, cantidad: Math.max(1, l.cantidad + d) } : l))
  const quitarLinea = (lid, setter) => setter((prev) => prev.filter((l) => l.id !== lid))

  // ── Acciones del ticket (corregir líneas ya registradas) ──
  const accionTicket = async (req, optimista) => {
    setError(''); setSaving(true)
    try { await req(); optimista() }
    catch (e) { setError(e?.message || 'No se pudo aplicar el cambio') }
    finally { setSaving(false) }
  }
  const anularLinea = (c) => accionTicket(
    () => api.patch(`/cargos/${c.id}/estado`, { estado: 'pendiente' }, auth),
    () => setCuenta((prev) => prev.map((x) => x.id === c.id ? { ...x, estado: 'pendiente', metodoPago: null } : x)),
  )
  const cobrarLinea = (c, metodo) => accionTicket(
    () => api.patch(`/cargos/${c.id}/estado`, { estado: 'pagado', metodoPago: metodo }, auth),
    () => setCuenta((prev) => prev.map((x) => x.id === c.id ? { ...x, estado: 'pagado', metodoPago: metodo } : x)),
  )
  const eliminarLineaTicket = (c) => accionTicket(
    () => api.delete(`/cargos/${c.id}`, auth),
    () => setCuenta((prev) => prev.filter((x) => x.id !== c.id)),
  )

  // ── Persistencia instantánea (estilo comanda): cada consumo se guarda al toque ──
  // Re-lee la cuenta del backend (cargos reales) para refrescar el ticket sin recargar la grilla.
  const refrescarCuenta = async () => {
    if (!reserva._backendId) return
    try {
      const d = await api.get(`/reservas/${reserva._backendId}/cuenta`, auth)
      if (Array.isArray(d?.cargosCuenta)) setCuenta(d.cargosCuenta)
    } catch { /* el cambio optimista ya quedó reflejado */ }
  }
  // Agrega un consumo y lo PERSISTE al instante. Jugador con cuenta → queda a cuenta (pendiente).
  // Casual (sin jugadorId) → se cobra en el acto (no puede quedar a cuenta).
  const persistirConsumo = async ({ jugadorId = null, prodId = null, nombre, precio, cantidad = 1 }) => {
    if (!reserva._backendId || saving) return
    if (!nombre || !(precio > 0)) return
    setError(''); setSaving(true)
    try {
      await api.post(`/reservas/${reserva._backendId}/cuenta`, {
        pagos: [{
          jugadorId: jugadorId || null,
          metodoPago: jugadorId ? null : metodoDefault, // jugador → a cuenta · casual → cobrado al instante
          turnoMonto: 0,
          consumos: [{ concepto: cantidad > 1 ? `${cantidad}× ${nombre}` : nombre, monto: precio * cantidad, productoId: prodId, cantidad }],
        }],
      }, auth)
      await refrescarCuenta()
    } catch (e) { setError(e?.message || 'No se pudo agregar el consumo') }
    finally { setSaving(false) }
  }

  // Reparte un consumo compartido entre varias personas y PERSISTE la parte de cada una (1 sola llamada).
  // Jugador → su parte a cuenta · casual → su parte cobrada al instante.
  const persistirCompartido = async (concepto, repartos) => {
    if (!reserva._backendId || saving) return
    const pagos = (repartos || []).filter((r) => r.monto > 0).map((r) => ({
      jugadorId: r.jugadorId || null,
      metodoPago: r.jugadorId ? null : metodoDefault,
      turnoMonto: 0,
      consumos: [{ concepto, monto: r.monto, productoId: null, cantidad: 1 }],
    }))
    if (!pagos.length) return
    setError(''); setSaving(true)
    try {
      await api.post(`/reservas/${reserva._backendId}/cuenta`, { pagos }, auth)
      await refrescarCuenta()
    } catch (e) { setError(e?.message || 'No se pudo agregar el consumo compartido') }
    finally { setSaving(false) }
  }

  // Cobro rápido por persona: registra su porción del turno + cobra sus consumos pendientes al instante,
  // y la saca del split (queda en el ticket). Jugador puede quedar a cuenta; casual debe cobrarse.
  const resolverPersona = async (p) => {
    if (!reserva._backendId || saving) return
    const esCobrar = p.modo === 'cobrar'
    if (p.tipo === 'casual' && !esCobrar) { setError('Un casual no puede quedar a cuenta'); return }
    const metodo = esCobrar ? p.metodoPago : null
    const jid = p.tipo === 'casual' ? null : p.jugadorId
    setError(''); setSaving(true)
    try {
      // Porción del turno de esta persona (cobrada o a cuenta)
      if ((p.turnoMonto || 0) > 0) {
        await api.post(`/reservas/${reserva._backendId}/cuenta`, { pagos: [{ jugadorId: jid, metodoPago: metodo, turnoMonto: p.turnoMonto, consumos: [] }] }, auth)
      }
      // Si se cobra: marcar pagados sus consumos pendientes
      if (esCobrar) {
        const pendientes = (cuenta || []).filter((c) => c.tipo === 'producto' && c.estado === 'pendiente' && (p.tipo === 'casual' ? !c.jugadorId : c.jugadorId === p.jugadorId))
        for (const c of pendientes) {
          await api.patch(`/cargos/${c.id}/estado`, { estado: 'pagado', metodoPago: metodo }, auth)
        }
      }
      await refrescarCuenta()
      setPersonas((prev) => prev.filter((x) => x.key !== p.key)) // ya quedó registrada
    } catch (e) { setError(e?.message || 'No se pudo cobrar a esta persona') }
    finally { setSaving(false) }
  }

  // ── Submit ──
  const submit = async () => {
    setError('')
    let pagos = []
    if (mode === 'simple') {
      if (totalSimple <= 0) return setError('No hay nada para cobrar')
      if (pagador === 'casual' && esACuentaSimple) return setError('Un casual no puede quedar a cuenta')
      pagos = [{
        jugadorId: pagador === 'titular' ? reserva.jugadorId : null,
        metodoPago: esACuenta(pagador, cobrar) ? null : metodoPago,
        turnoMonto: cobrarTurno ? saldoTurno : 0,
        consumos: lineas.map(serializarLinea),
      }]
    } else {
      const conAlgo = personas.filter((p) => subtotalPersona(p) > 0)
      if (conAlgo.length === 0) return setError('No hay nada para cobrar')
      if (turnoAsignado > saldoTurno) return setError('La suma del turno supera lo que falta cobrar')
      for (const p of conAlgo) {
        if (p.tipo === 'casual' && p.modo === 'cuenta') return setError(`${p.nombre || 'Casual'} no puede quedar a cuenta`)
      }
      pagos = conAlgo.map((p) => ({
        jugadorId: p.tipo === 'casual' ? null : p.jugadorId,
        metodoPago: p.modo === 'cuenta' ? null : p.metodoPago,
        turnoMonto: p.turnoMonto || 0,
        consumos: p.consumos.map(serializarLinea),
      }))
    }
    setSaving(true)
    try {
      await api.post(`/reservas/${reserva._backendId}/cuenta`, { pagos }, auth)
      const algoCobrado = pagos.some((p) => p.metodoPago)
      onDone(algoCobrado)
    } catch (e) {
      setError(e?.message || 'No se pudo procesar la cuenta')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className={`relative w-full ${mode === 'split' ? 'max-w-4xl' : 'max-w-lg'} bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] transition-[max-width] duration-200`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-slate-800 font-bold">Cuenta del turno</p>
            <p className="text-slate-400 text-xs mt-0.5">{reserva.canchaNombre} · {reserva.inicio}–{reserva.fin}</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        {/* Resumen del turno */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center justify-between text-sm rounded-xl bg-slate-50 border border-slate-100 px-4 py-2.5">
            <span className="text-slate-500">Turno {money(precio)}</span>
            {(pagadoTurno > 0 || aCuentaTurno > 0)
              ? <span className="text-violet-600 font-medium">
                  {pagadoTurno > 0 && `Cobrado ${money(pagadoTurno)}`}
                  {aCuentaTurno > 0 && `${pagadoTurno > 0 ? ' · ' : ''}A cuenta ${money(aCuentaTurno)}`}
                  {` · falta ${money(saldoTurno)}`}
                </span>
              : <span className="text-slate-400">sin cobrar</span>}
          </div>

          {/* Ticket de lo ya registrado (reapertura) — accionable: anular / cobrar / quitar */}
          {ticketArriba.length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-100 divide-y divide-slate-50 max-h-52 overflow-y-auto">
              <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide bg-white sticky top-0 z-10">Ya en la cuenta</p>
              {ticketArriba.map((c) => (
                <TicketLinea key={c.id} c={c} metodos={metodos} saving={saving} onAnular={anularLinea} onCobrar={cobrarLinea} onQuitar={eliminarLineaTicket} />
              ))}
            </div>
          )}

          {turnoSaldado && <p className="mt-2 text-[11px] text-slate-400">El turno ya está saldado. Podés agregar consumiciones.</p>}
        </div>

        {/* Híbrido matching→caja: si el turno es un partido abierto, ofrecer cargar el roster */}
        {rosterPartido && !rosterCargado && (
          <div className="px-6 pt-3 shrink-0">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
              <span className="text-lg shrink-0">🎾</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Este turno es un partido abierto</p>
                <p className="text-xs text-emerald-600 truncate">{rosterPartido.jugadores.length} anotado{rosterPartido.jugadores.length !== 1 ? 's' : ''} · {rosterPartido.jugadores.map((j) => j.nombre.split(' ')[0]).join(', ')}</p>
              </div>
              <button onClick={cargarRoster} className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold whitespace-nowrap shrink-0">+ Cargar al split</button>
            </div>
          </div>
        )}
        {rosterCargado && (
          <div className="px-6 pt-3 shrink-0">
            <p className="text-[11px] text-emerald-600">✓ Jugadores del partido cargados en «Dividir»</p>
          </div>
        )}

        {/* Tabs de modo */}
        <div className="px-6 pt-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setMode('simple')} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'simple' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Uno paga todo</button>
            <button onClick={() => { setMode('split'); setPersonas((l) => dividirTurno(l)) }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${mode === 'split' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Dividir</button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-3 flex flex-col gap-3">
          {mode === 'simple'
            ? <ModoSimple {...{ saldoTurno, cobrarTurno, setCobrarTurno, lineas, setLineas, activos, pagador, setPagador, hayTitular, titularNombre, cobrar, setCobrar, metodoPago, setMetodoPago, metodos, addProducto, addOtro, cambiarCant, quitarLinea, persistirConsumo, reservaJugadorId: reserva.jugadorId, saving, cuenta, eliminarLineaTicket }} />
            : <ModoSplit {...{ personas, setPersonas, saldoTurno, restoTurno, turnoAsignado, activos, metodos, metodoDefault, dividirTurno, setAutoSplit, addProducto, addOtro, cambiarCant, quitarLinea, subtotalPersona, nuevaPersona, auth, token, persistirConsumo, saving, cuenta, eliminarLineaTicket, persistirCompartido, resolverPersona }} />
          }

          {error && <p className="text-rose-500 text-xs">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {mode === 'split' ? (
            // En "Dividir" cada persona se cobra individual con su botón "Cobrar $X" → acá solo cerrar.
            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm transition-colors">
              Listo
            </button>
          ) : (
            <button onClick={submit} disabled={saving || totalSimple <= 0} className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? 'Procesando…' : esACuentaSimple ? `Anotar ${money(totalSimple)} a la cuenta` : `Cobrar ${money(totalSimple)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helpers de serialización compartidos
const esACuenta = (pagador, cobrar) => pagador === 'titular' && !cobrar
const serializarLinea = (l) => ({ concepto: l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre, monto: l.precio * l.cantidad, productoId: l.prodId ?? null, cantidad: l.cantidad })

// ─── Adder de consumiciones reutilizable ───────────────────────────────────────
// ─── Línea del ticket (ya registrada) con acciones: anular / cobrar / quitar / cambiar método ──
const TicketLinea = ({ c, metodos, saving, onAnular, onCobrar, onQuitar }) => {
  const [picker, setPicker] = useState(null) // null | 'cobrar' | 'metodo'
  const nombre = c.jugador ? `${c.jugador.nombre} ${c.jugador.apellido}` : 'Casual'
  return (
    <div className="px-3 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-slate-500 w-24 truncate shrink-0">{nombre}</span>
        <span className="flex-1 text-slate-600 truncate">{c.tipo === 'reserva' ? 'Turno' : c.concepto}</span>
        <span className="text-slate-700 font-medium shrink-0">{money(c.monto)}</span>
      </div>
      <div className="flex items-center gap-2.5 mt-1 justify-end">
        {c.estado === 'pagado' ? (
          <>
            <button onClick={() => setPicker(picker === 'metodo' ? null : 'metodo')} disabled={saving} className="text-emerald-600 hover:underline">{METODO_MAP[c.metodoPago]?.label ?? 'cobrado'} ✎</button>
            <button onClick={() => onAnular(c)} disabled={saving} className="text-amber-600 hover:underline">Anular</button>
          </>
        ) : (
          <>
            <span className="text-blue-600">a cuenta</span>
            <button onClick={() => setPicker(picker === 'cobrar' ? null : 'cobrar')} disabled={saving} className="text-emerald-600 hover:underline">Cobrar</button>
            <button onClick={() => onQuitar(c)} disabled={saving} className="text-rose-500 hover:underline">Quitar</button>
          </>
        )}
      </div>
      {picker && (
        <div className="flex flex-wrap gap-1.5 mt-1 justify-end">
          {metodos.map((id) => (
            <button key={id} onClick={() => { onCobrar(c, id); setPicker(null) }} disabled={saving} className="px-2 py-0.5 rounded-md border border-slate-200 text-slate-600 hover:border-brand-400 hover:bg-brand-50">
              {METODO_MAP[id]?.label ?? id}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ConsumoAdder = ({ activos, onAdd, onAddOtro }) => {
  const [sel, setSel] = useState('')
  const [otroNombre, setOtroNombre] = useState('')
  const [otroPrecio, setOtroPrecio] = useState('')
  return (
    <div>
      <div className="flex gap-2">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className={`flex-1 ${inputCls}`}>
          <option value="">Agregar consumición…</option>
          {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {money(p.precio)}</option>)}
          {activos.length > 0 && <option disabled>──────────</option>}
          <option value="__otro__">✏️ Otro (escribir)</option>
        </select>
        {sel !== '__otro__' && <button onClick={() => { onAdd(sel); setSel('') }} disabled={!sel} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-40"><Plus size={16} /></button>}
      </div>
      {sel === '__otro__' && (
        <div className="flex gap-2 mt-2">
          <input value={otroNombre} onChange={(e) => setOtroNombre(e.target.value)} placeholder="Concepto" className={`flex-1 ${inputCls}`} />
          <input type="number" value={otroPrecio} onChange={(e) => setOtroPrecio(e.target.value)} placeholder="$" className={`w-24 ${inputCls}`} />
          <button onClick={() => { if (otroNombre.trim() && Number(otroPrecio) > 0) { onAddOtro(otroNombre, otroPrecio); setOtroNombre(''); setOtroPrecio(''); setSel('') } }} className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={16} /></button>
        </div>
      )}
    </div>
  )
}

const LineasList = ({ lineas, onCant, onQuitar }) => (
  lineas.length > 0 && (
    <div className="flex flex-col gap-1.5 mt-2">
      {lineas.map((l) => (
        <div key={l.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-100">
          <p className="flex-1 min-w-0 text-sm text-slate-700 truncate">{l.nombre}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onCant(l.id, -1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Minus size={12} /></button>
            <span className="text-sm font-medium w-5 text-center">{l.cantidad}</span>
            <button onClick={() => onCant(l.id, +1)} className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center"><Plus size={12} /></button>
          </div>
          <p className="text-sm font-semibold text-slate-700 w-20 text-right shrink-0">{money(l.precio * l.cantidad)}</p>
          <button onClick={() => onQuitar(l.id)} className="text-slate-300 hover:text-rose-500 shrink-0"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
)

// ─── Modo simple (un pagador) ───────────────────────────────────────────────────
const ModoSimple = ({ saldoTurno, cobrarTurno, setCobrarTurno, lineas, setLineas, activos, pagador, setPagador, hayTitular, titularNombre, cobrar, setCobrar, metodoPago, setMetodoPago, metodos, addProducto, addOtro, cambiarCant, quitarLinea, persistirConsumo, reservaJugadorId, saving, cuenta, eliminarLineaTicket }) => (
  <>
    {saldoTurno > 0 && (
      <button onClick={() => setCobrarTurno((v) => !v)} className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${cobrarTurno ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200'}`}>
        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${cobrarTurno ? 'bg-brand-500 text-white' : 'border border-slate-300'}`}>{cobrarTurno ? '✓' : ''}</div>
        <p className="flex-1 text-sm font-medium text-slate-700">Turno</p>
        <p className="text-sm font-semibold text-slate-700">{money(saldoTurno)}</p>
      </button>
    )}

    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Consumiciones</p>
      {/* Persistencia instantánea: el consumo se guarda al toque y aparece arriba en "Ya en la cuenta". */}
      <ConsumoAdder activos={activos}
        onAdd={(id) => { const pr = activos.find((x) => x.id === id); if (pr) persistirConsumo({ jugadorId: pagador === 'titular' ? reservaJugadorId : null, prodId: pr.id, nombre: pr.nombre, precio: pr.precio }) }}
        onAddOtro={(n, p) => persistirConsumo({ jugadorId: pagador === 'titular' ? reservaJugadorId : null, nombre: n.trim(), precio: Number(p) })}
      />
      {/* Lo que cargó el pagador (persistido), para tenerlo a la vista sin un ticket duplicado */}
      {(() => {
        const jid = pagador === 'titular' ? reservaJugadorId : null
        const mis = (cuenta || []).filter((c) => c.tipo === 'producto' && (pagador === 'casual' ? !c.jugadorId : c.jugadorId === jid))
        return mis.length > 0 ? (
          <div className="flex flex-col gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 mt-2">
            {mis.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[12px]">
                <span className="flex-1 text-slate-600 truncate">{c.concepto}</span>
                <span className="text-slate-700 font-medium shrink-0">{money(c.monto)}</span>
                <span className={`text-[10px] shrink-0 ${c.estado === 'pagado' ? 'text-emerald-600' : 'text-blue-600'}`}>{c.estado === 'pagado' ? 'cobrado' : 'a cuenta'}</span>
                <button onClick={() => eliminarLineaTicket(c)} disabled={saving} className="text-slate-300 hover:text-rose-500 shrink-0" title="Quitar"><X size={13} /></button>
              </div>
            ))}
          </div>
        ) : null
      })()}
      {saving && <p className="text-[11px] text-slate-400 mt-1">Guardando…</p>}
    </div>

    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">¿Quién paga?</p>
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setPagador('titular')} disabled={!hayTitular} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${pagador === 'titular' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>{titularNombre}</button>
        <button onClick={() => { setPagador('casual'); setCobrar(true) }} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${pagador === 'casual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Casual / contado</button>
      </div>
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setCobrar(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${cobrar ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Cobrar ahora</button>
        <button onClick={() => setCobrar(false)} disabled={pagador === 'casual'} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${!cobrar ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Anotar a cuenta</button>
      </div>
      {cobrar
        ? (
          <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className={`w-full ${inputCls}`}>
            {metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}
          </select>
        )
        : pagador === 'titular' && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Se anota <b>todo el saldo ({money((cobrarTurno ? saldoTurno : 0) + lineas.reduce((s, l) => s + l.precio * l.cantidad, 0))})</b> a la cuenta de <b>{titularNombre}</b>. Si el saldo es de varias personas, usá <b>Dividir</b>.
          </p>
        )}
    </div>
  </>
)

// ─── Modo split (cuenta por persona) ────────────────────────────────────────────
const ModoSplit = ({ personas, setPersonas, saldoTurno, restoTurno, turnoAsignado, activos, metodos, metodoDefault, dividirTurno, setAutoSplit, addProducto, addOtro, cambiarCant, quitarLinea, subtotalPersona, nuevaPersona, auth, token, persistirConsumo, saving, cuenta, eliminarLineaTicket, persistirCompartido, resolverPersona }) => {
  const [buscando, setBuscando] = useState(false)
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState([])
  const [compartidoOpen, setCompartidoOpen] = useState(false)

  const setPersona = (key, patch) => setPersonas((prev) => prev.map((p) => p.key === key ? { ...p, ...patch } : p))
  const setConsumosPersona = (key, updater) => setPersonas((prev) => prev.map((p) => p.key === key ? { ...p, consumos: typeof updater === 'function' ? updater(p.consumos) : updater } : p))
  const confirmar = useConfirm()
  const quitarPersona = async (key) => {
    const persona = personas.find((p) => p.key === key)
    // Sus consumos YA persistidos: hay que borrarlos también, sino la persona reaparece al reabrir.
    const sus = (cuenta || []).filter((c) => c.tipo === 'producto' && (persona?.tipo === 'casual' ? !c.jugadorId : c.jugadorId === persona?.jugadorId))
    const msg = sus.length
      ? `¿Quitar a ${persona?.nombre || 'esta persona'}? Se borran sus ${sus.length} consumo${sus.length !== 1 ? 's' : ''} cargado${sus.length !== 1 ? 's' : ''}.`
      : `¿Quitar a ${persona?.nombre || 'esta persona'} del cobro?`
    if (!(await confirmar({ titulo: 'Quitar del cobro', mensaje: msg, confirmText: 'Quitar', danger: true }))) return
    for (const c of sus) { await eliminarLineaTicket(c) }
    setPersonas((prev) => prev.filter((p) => p.key !== key))
  }

  // Consumos PERSISTIDOS de una persona (del ticket real, agrupados por jugador).
  // Casual (sin jugadorId): comparten los cargos sin jugador — impreciso con varios casuales, pero el casual se cobra al toque.
  const consumosDe = (p) => (cuenta || []).filter((c) => c.tipo === 'producto' && (p.tipo === 'casual' ? !c.jugadorId : c.jugadorId === p.jugadorId))
  // Subtotal de la persona = su porción del turno + lo que consumió (persistido).
  const subPersona = (p) => (p.turnoMonto || 0) + consumosDe(p).reduce((s, c) => s + c.monto, 0)

  const buscar = async (texto) => {
    setQ(texto)
    if (texto.trim().length < 2) return setResultados([])
    try { setResultados(await api.get(`/jugadores/buscar?q=${encodeURIComponent(texto.trim())}`, auth)) } catch { setResultados([]) }
  }
  const agregarJugador = (j) => {
    if (personas.some((p) => p.jugadorId === j.id)) { setBuscando(false); setQ(''); setResultados([]); return }
    setPersonas((prev) => [...prev, nuevaPersona({ tipo: 'jugador', jugadorId: j.id, nombre: `${j.nombre} ${j.apellido}` })])
    setBuscando(false); setQ(''); setResultados([])
  }
  const agregarCasual = () => setPersonas((prev) => [...prev, nuevaPersona({ tipo: 'casual', nombre: `Casual ${prev.filter((p) => p.tipo === 'casual').length + 1}` })])

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Personas</p>
        {saldoTurno > 0 && <button onClick={() => { setAutoSplit(true); setPersonas((l) => dividirTurno(l)) }} className="text-[11px] text-brand-600 hover:text-brand-700 font-medium">Dividir en partes iguales</button>}
      </div>

      {personas.length === 0 && <p className="text-xs text-slate-400">Agregá las personas que van a pagar.</p>}
      {personas.filter((p) => p.jugo).length > 4 && saldoTurno > 0 && (
        <p className="text-[11px] text-amber-600">Marcaste más de 4 jugadores. Un turno de pádel suele ser de 4 — los demás podrían ser acompañantes.</p>
      )}

      {/* Grilla 2 columnas en desktop (1 en mobile) → se ven más personas sin scrollear tanto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {personas.map((p) => (
          <div key={p.key} className="rounded-2xl border border-slate-200 p-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-semibold text-slate-700 truncate">{p.nombre}{p.tipo === 'casual' && <span className="text-[10px] text-slate-400 ml-1">(contado)</span>}</p>
              {saldoTurno > 0 && (
                <button
                  onClick={() => setPersona(p.key, p.jugo ? { jugo: false, turnoMonto: 0 } : { jugo: true })}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${p.jugo ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                  title={p.jugo ? 'Jugó el turno (paga parte)' : 'Acompañante (solo consumo)'}
                >
                  {p.jugo ? '🎾 Jugó' : 'Acompañante'}
                </button>
              )}
              <button onClick={() => quitarPersona(p.key)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
            </div>

            {/* Porción del turno (solo jugadores, y solo si queda turno por asignar) */}
            {saldoTurno > 0 && p.jugo && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 flex-1">Turno</span>
                <input type="number" value={p.turnoMonto || ''} onChange={(e) => { setAutoSplit(false); setPersona(p.key, { turnoMonto: Math.max(0, Math.round(Number(e.target.value) || 0)) }) }} placeholder="$0" className={`w-24 ${inputCls} text-right`} />
              </div>
            )}

            {/* Consumos de la persona */}
            {/* Persistencia instantánea: el consumo de esta persona se guarda al toque y va a "Ya en la cuenta" (arriba). */}
            <ConsumoAdder activos={activos}
              onAdd={(id) => { const prod = activos.find((x) => x.id === id); if (prod) persistirConsumo({ jugadorId: p.tipo === 'casual' ? null : p.jugadorId, prodId: prod.id, nombre: prod.nombre, precio: prod.precio }) }}
              onAddOtro={(n, pr) => persistirConsumo({ jugadorId: p.tipo === 'casual' ? null : p.jugadorId, nombre: n.trim(), precio: Number(pr) })}
            />
            {/* Lo que consumió esta persona (persistido y agrupado debajo de ella) */}
            {consumosDe(p).length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5">
                {consumosDe(p).map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-[12px]">
                    <span className="flex-1 text-slate-600 truncate">{c.concepto}</span>
                    <span className="text-slate-700 font-medium shrink-0">{money(c.monto)}</span>
                    <span className={`text-[10px] shrink-0 ${c.estado === 'pagado' ? 'text-emerald-600' : 'text-blue-600'}`}>{c.estado === 'pagado' ? 'cobrado' : 'a cuenta'}</span>
                    <button onClick={() => eliminarLineaTicket(c)} disabled={saving} className="text-slate-300 hover:text-rose-500 shrink-0" title="Quitar"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}

            {/* Cómo paga — apilado para entrar cómodo en la grilla de 2 columnas */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button onClick={() => setPersona(p.key, { modo: 'cobrar' })} className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all ${p.modo === 'cobrar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Cobrar</button>
                <button onClick={() => setPersona(p.key, { modo: 'cuenta' })} disabled={p.tipo === 'casual'} className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all disabled:opacity-40 ${p.modo === 'cuenta' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>A cuenta</button>
              </div>
              <div className="flex items-center gap-2">
                {p.modo === 'cobrar' && (
                  <select value={p.metodoPago} onChange={(e) => setPersona(p.key, { metodoPago: e.target.value })} className={`flex-1 min-w-0 ${inputCls} py-1.5`}>
                    {metodos.map((id) => <option key={id} value={id}>{METODO_MAP[id]?.label ?? id}</option>)}
                  </select>
                )}
                {/* Cobro rápido: registra a esta persona (turno + sus consumos) al instante */}
                <button onClick={() => resolverPersona(p)} disabled={saving || subPersona(p) <= 0}
                  className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold disabled:opacity-40 whitespace-nowrap">
                  {p.modo === 'cobrar' ? 'Cobrar' : 'A cuenta'} {money(subPersona(p))}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agregar persona: "Jugador" abre el modal de búsqueda completo (el mismo de la reserva manual) */}
      <div className="flex gap-2">
        <button onClick={() => setBuscando(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"><UserPlus size={14} /> Jugador</button>
        <button onClick={agregarCasual} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium"><Plus size={14} /> Casual</button>
      </div>
      {buscando && (
        <ModalBusquedaJugadores
          adminToken={token}
          onSelect={(j) => agregarJugador(j)}
          onClose={() => setBuscando(false)}
        />
      )}

      {/* Consumo compartido */}
      {personas.length >= 2 && (
        compartidoOpen
          ? <CompartidoForm activos={activos} personas={personas} onCancel={() => setCompartidoOpen(false)} onApply={async (asignaciones) => {
              // Persiste la parte de cada persona (con su jugador) → aparece debajo de cada una.
              const concepto = Object.values(asignaciones)[0]?.nombre || 'Compartido'
              const repartos = Object.entries(asignaciones).map(([key, val]) => {
                const persona = personas.find((pp) => pp.key === key)
                return { jugadorId: persona?.tipo === 'casual' ? null : persona?.jugadorId, monto: val.precio }
              })
              await persistirCompartido(concepto, repartos)
              setCompartidoOpen(false)
            }} />
          : <button onClick={() => setCompartidoOpen(true)} className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 text-xs font-medium"><Users size={14} /> Consumo compartido</button>
      )}
    </>
  )
}

// ─── Form de consumo compartido (reparte un ítem entre las personas elegidas) ────
const CompartidoForm = ({ activos, personas, onCancel, onApply }) => {
  const [sel, setSel] = useState('')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [entre, setEntre] = useState(() => personas.map((p) => p.key)) // todas por defecto

  const prod = activos.find((p) => p.id === sel)
  const nombreFinal = prod ? prod.nombre : nombre.trim()
  const precioFinal = prod ? prod.precio : Number(precio) || 0
  const toggle = (key) => setEntre((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])

  const aplicar = () => {
    if (!nombreFinal || precioFinal <= 0 || entre.length === 0) return
    const partes = repartir(precioFinal, entre.length)
    const asign = {}
    entre.forEach((key, i) => { asign[key] = { id: uid(), prodId: null, nombre: `${nombreFinal} (compartido)`, precio: partes[i], cantidad: 1 } })
    onApply(asign)
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Consumo compartido</p>
        <button onClick={onCancel} className="text-slate-300 hover:text-slate-600"><X size={15} /></button>
      </div>
      <select value={sel} onChange={(e) => { setSel(e.target.value); setNombre(''); setPrecio('') }} className={inputCls}>
        <option value="">Elegir producto…</option>
        {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {money(p.precio)}</option>)}
        <option value="">✏️ Escribir otro abajo</option>
      </select>
      {!sel && (
        <div className="flex gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Concepto" className={`flex-1 ${inputCls}`} />
          <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="$ total" className={`w-28 ${inputCls}`} />
        </div>
      )}
      <p className="text-[11px] text-slate-500">Repartir entre:</p>
      <div className="flex flex-wrap gap-1.5">
        {personas.map((p) => (
          <button key={p.key} onClick={() => toggle(p.key)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${entre.includes(p.key) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-400'}`}>{p.nombre}</button>
        ))}
      </div>
      {precioFinal > 0 && entre.length > 0 && <p className="text-[11px] text-slate-400">{money(precioFinal)} ÷ {entre.length} = {money(Math.floor(precioFinal / entre.length))} c/u aprox.</p>}
      <button onClick={aplicar} disabled={!nombreFinal || precioFinal <= 0 || entre.length === 0} className="py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold disabled:opacity-40">Agregar a {entre.length} persona{entre.length !== 1 ? 's' : ''}</button>
    </div>
  )
}

export default CheckoutTurno
