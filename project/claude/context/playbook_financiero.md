# WIARK Padel — Playbook de análisis financiero del club
### Todo lo que hay que mirar para mejorar el resultado

---

## 0. El modelo mental (leé esto antes de cualquier métrica)

Cuatro ideas que ordenan todo lo demás. Si las salteás, vas a medir mucho y mejorar poco.

- **Alto apalancamiento operativo.** Casi todos los costos son fijos. Por debajo del punto de equilibrio perdés; por encima, casi cada peso extra es ganancia. → La ocupación manda sobre casi todo.
- **Inventario perecedero.** La hora-cancha vacía no se recupera jamás. La urgencia no es "vender más barato", es "no dejar morir la hora".
- **Margen de contribución, no margen bruto.** Si no asignás los costos fijos a cada sector, los márgenes mienten. Siempre.
- **Términos reales, no nominales.** En Argentina, un P&L en pesos sin ajustar por inflación te miente cada mes. Todo comparado contra inflación.

---

## 1. La métrica reina: rendimiento de la hora-cancha

Es el corazón del negocio. Si solo pudieras mirar un área, es esta.

**Qué mirar:**
- **Tasa de ocupación** = horas-cancha vendidas / horas-cancha disponibles. Desglosada por: total, franja horaria, día de la semana, y cancha individual.
- **RevPACH** (ingreso por hora-cancha disponible) = ingreso total de canchas / horas-cancha disponibles. El número resumen: combina ocupación y precio. Subilo y todo mejora.
- **Yield / rendimiento de tarifa** = ingreso real / ingreso teórico si todo se vendiera a tarifa de lista. Mide cuánto perdés por huecos + descuentos.
- **Precio promedio realizado por hora** vs tarifa de lista (¿cuánto descontás de verdad?).
- **No-shows y cancelaciones tardías** (% y su costo: son horas perecidas).
- **Lead time de reserva** (con cuánta anticipación reservan; afecta cómo manejás los huecos de último momento).

**La trampa:** mirar el ingreso total de canchas en vez del ingreso por hora *disponible*. Dos clubes con el mismo ingreso pueden tener rentabilidad opuesta según cuántas horas tuvieron disponibles para generarlo.

---

## 2. Estructura de costos y punto de equilibrio

Acá se decide cuánta ocupación necesitás para no perder, y cuál es el único costo que vale la pena perseguir.

**Qué mirar:**
- **Split fijo vs variable** (% de cada uno). En este negocio el fijo domina; tenerlo claro define toda la estrategia.
- **Costo fijo por hora-cancha disponible** = (alquiler + amortización + personal base + energía base) / horas-cancha disponibles. Es "el piso" que cada hora tiene que cubrir antes de dar ganancia.
- **Punto de equilibrio en horas-cancha/mes**: cuántas horas tenés que vender para cubrir los fijos. Convertido a ocupación %, es tu número de supervivencia.
- **Energía** (el costo a vigilar en Argentina): costo por hora de iluminación encendida, ratio energía/ingreso, y modelado de tarifa (cambios, quita de subsidios, horario pico). Es semi-variable y volátil; merece su propio seguimiento.
- **Costo laboral vs curva de demanda**: % del ingreso, y sobre todo ¿hay gente cobrando sueldo en horas muertas? El staffing tiene que seguir la demanda, no ser plano.
- **Mantenimiento y reposición**: amortización de césped, cristales, redes, iluminación. Es un costo real aunque no salga todos los meses.

**La trampa:** obsesionarse con recortes chicos (proveedores, insumos del bar) mientras una hora-cancha vacía sangra costo fijo sin recuperar. El ahorro grande está en llenar la hora, no en recortar el café.

---

## 3. Márgenes por sector (con asignación real de costos)

El método importa más que el número. **Asigná los costos fijos por un driver** (metros² ocupados, horas de uso, % de personal dedicado) antes de declarar a un sector "rentable".

**Canchas (alquiler libre)** → el core.
- Qué mirar: margen de contribución por hora, ocupación, RevPACH.
- La trampa: ninguna grande; es el sector más honesto. Es la base contra la que se mide todo lo demás.

**Academia / clases.**
- Qué mirar: ¿una hora de cancha usada en clase rinde más o menos que alquilarla libre? (ingreso de la clase − costo del profe, vs lo que sacarías alquilando esa hora). Ocupación de horarios de clase.
- La trampa: la academia suele ser el "subsidio oculto" → ocupa horas que parecen llenas pero rinden menos que el alquiler, o el costo del profe se come el margen. Medila contra el costo de oportunidad de la cancha.

**Bar / cantina.**
- Qué mirar: margen de contribución (no bruto) después de cargar espacio, personal y merma; rotación de stock; merma/robo; margen por producto; ticket promedio por jugador.
- La trampa: el clásico. Parece rentable por margen bruto y pierde por contribución. Pregunta dura: ¿ese espacio rinde más como bar, o convertido en otra cosa (más cancha, tienda, coworking)?

**Pro shop / venta (paletas, grips, ropa).**
- Qué mirar: rotación, margen por categoría, capital inmovilizado en stock, % de ventas sobre tráfico.
- La trampa: stock muerto. Capital atado en paletas que no rotan es plata que no trabaja, peor aún con inflación.

**Alquiler de equipo (paletas, pelotas).**
- Qué mirar: ingreso vs costo de reposición. Marginal en volumen pero alto margen.

---

## 4. Análisis de turnos (la curva de demanda)

Acá está la palanca de ingresos más grande y la que casi nadie en el interior usa.

**Qué mirar:**
- **Mapa de calor día × hora** de ocupación. Identificá tres zonas: **pico** (lleno, podrías cobrar más), **hombro** (medio), **valle** (vacío, perdés fijo).
- **Pricing por franja (dinámico):** tarifa alta en pico, tarifa baja o promo en valle para llenarlo. Como hoteles y aerolíneas.
- **Estrategias de relleno de valle:** clases en horario muerto, ligas internas, happy-hour, abonos diurnos para jubilados/desempleados/turno mañana, convenios con empresas.
- **Costo de la hora vacía:** cuantificá en pesos lo que cuesta cada hora-cancha sin vender en valle. Eso es la urgencia, hecha número.

**La trampa:** tarifa plana todo el día. Estás regalando margen en el pico (donde pagarían más) y dejando morir el valle (donde algo es mejor que nada). El techo: en pueblo chico el pricing dinámico tiene límite social → no podés tarifar como aerolínea a tus vecinos. Subí el pico con tacto, atacá el valle con promos.

---

## 5. Torneos (medirlos como corresponde, no por ingreso bruto)

Un torneo casi nunca se entiende mirando lo que entra. Hay que separar su rol.

**Qué mirar:**
- **Contribución incremental** = inscripciones − premios − costos directos (pelotas, arbitraje, premios, extras de personal).
- **Costo de oportunidad de las horas-cancha:** ¿el torneo ocupa horas pico que habrías vendido más caro al alquiler libre? Esa diferencia es un costo real aunque no aparezca en ninguna factura.
- **Uplift de bar/cantina** durante el torneo (suele ser donde el torneo "gana" de verdad).
- **Adquisición de jugadores nuevos** y su valor de vida (LTV): ¿cuántos vuelven después?
- **Efecto comunidad / retención**: difícil de medir, real igual.

**La trampa:** tratar todos los torneos igual. Definí el rol primero: ¿es **producto rentable** (tiene que dar contribución positiva) o **herramienta de marketing** (puede perder en P&L directo si gana en adquisición + bar)? Se miden distinto. Un torneo que "pierde" puede ser tu mejor canal de adquisición; uno que "gana" poco puede estar comiéndote horas pico carísimas.

---

## 6. Flujo de caja y mirada hacia adelante

El P&L te dice si ganás; el flujo de caja te dice si llegás a fin de mes. En un negocio chico, lo segundo es lo que te mata.

**Qué mirar:**
- **Proyección de flujo de caja** (no P&L): timing real de cobros (abonos mensuales vs pago por uso) contra pagos (alquiler, sueldos, energía bimestral, aguinaldo).
- **Estacionalidad:** el pádel tiene valles (vacaciones, calor extremo, frío). Proyectala y prepará la caja para los meses flacos.
- **Break-even del mes en tiempo real:** "¿voy arriba o abajo del equilibrio este mes?", actualizado día a día. Es el tablero que cambia decisiones sobre la marcha.
- **Inflación:** todo en términos reales; política explícita de ajuste de tarifas (¿cada cuánto subís?, ¿atado a qué — inflación pasada, esperada, dólar, CER?).

---

## 7. Capa Argentina (lo que ningún software extranjero entiende)

Esto es tu foso. Un producto español o brasilero no modela nada de esto.

- **Inflación:** reexpresión de todo a términos reales; regla de ajuste de tarifas (frecuencia + índice). Comparar meses en nominal es engañarte solo.
- **Energía:** tarifa volátil, quita de subsidios, horario pico. Modelá escenarios — un salto de tarifa puede dar vuelta el resultado de un mes.
- **Mix de cobro y su costo financiero:** efectivo (riesgo de fuga, informalidad), transferencia (gratis e inmediato), tarjeta (comisión + plazo de acreditación + costo brutal en cuotas con alta inflación), MEP/dólar. El *cómo* te pagan afecta el margen real tanto como el *cuánto*.
- **Impuestos:** monotributo/IVA/IIBB/AFIP. El margen "real" es después de impuestos, no antes.
- **Costos dolarizados:** cristales, paletas, repuestos, algunas partes importadas. Suben con el dólar aunque cobres en pesos. Seguilos aparte.

---

## 8. La cadencia (qué mirar y cuándo)

Medir todo, todos los días, es ruido. Esta es la frecuencia útil:

- **Diario:** caja conciliada (lo operativo, lo aburrido y lo más importante), ocupación del día, no-shows.
- **Semanal:** ocupación por franja, RevPACH, margen del bar, avance del relleno de valle.
- **Mensual:** P&L por sector con margen de contribución, break-even alcanzado, flujo de caja proyectado a 90 días, ajuste de tarifas por inflación.
- **Trimestral:** decisiones de inversión, revisión de política de pricing, preparación de estacionalidad.

---

## 9. Las decisiones que esto habilita (el output, lo que vale)

El análisis no es para tener tableros lindos. Es para tomar estas decisiones:

- **Pricing:** subir el pico, armar promos de valle, ajustar por inflación.
- **Relleno de valle:** qué horas atacar y con qué (clases, abonos, ligas).
- **Staffing:** cortar horas de personal en franjas muertas.
- **Matar o potenciar líneas:** ¿el bar sigue, se achica o se reconvierte?
- **Inversión:** ¿conviene otra cancha? (payback según ocupación actual). ¿Iluminación LED para bajar energía?
- **Torneos:** cuáles repetir según su rol real (rentable vs adquisición).

---

## 10. Si tuvieras que arrancar con 5 métricas

Para no morir en la sopa de números, el mínimo viable:

1. **RevPACH** (ingreso por hora-cancha disponible) → el resumen.
2. **Ocupación por franja horaria** → dónde está el valle a atacar.
3. **Margen de contribución por sector** (con costos asignados) → qué gana y qué pierde de verdad.
4. **Break-even del mes en tiempo real** → ¿estoy arriba o abajo hoy?
5. **Flujo de caja proyectado a 90 días** → ¿llego?

Todo lo demás se construye sobre estas cinco.

---

*Este playbook es el esqueleto de la capa financiera del producto y, a la vez, el manual de operación de un club. Cada métrica de acá es una feature potencial del módulo financiero de WIARK Padel — y cada insight que le entrega al dueño es un paso hacia que ese dueño sea cliente de asesoría.*
