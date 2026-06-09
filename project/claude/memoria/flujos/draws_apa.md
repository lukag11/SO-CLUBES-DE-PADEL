# Draws APA — Reglamento oficial de llaves por cantidad de parejas

Fuente: Reglamento Deportivo Amateur APA (padel.org.ar).  
Implementación: `src/services/torneoService.js` → `APA_DRAWS` + `generateAPAEliminationBracket(grupos)`.

---

## Reglas generales

- Eliminación simple (pierde = afuera)
- Todos los partidos al **mejor de 3 sets**
- El ganador se calcula por sets — nunca se elige manualmente
- El bracket se genera cuando la fase de grupos está **100% terminada**
- Las **previas** (play-ins) son partidos previos al cuadro principal; el ganador entra al slot indicado

---

## Distribución de zonas por cantidad de parejas

```
totalParejas % 3 === 0  →  todas las zonas de 3
totalParejas % 3 === 1  →  zonas de 3 + 1 zona de 4
totalParejas % 3 === 2  →  zonas de 3 + 1 zona de 2
                           EXCEPCIÓN 32 parejas → 8 zonas de 3 + 2 zonas de 4 (para quedar en 10 zonas)
```

Clasifican siempre **1° y 2° de cada zona**.

---

## Draws por cantidad de zonas

### 2 zonas → 4 clasificados → Semifinal

```
SF1:  1°A  vs  2°B
SF2:  2°A  vs  1°B
```

---

### 3 zonas → 6 clasificados → Previa + Semifinal

```
Previas:
  PI1:  2°B  vs  2°C
  PI2:  1°C  vs  2°A

Semis:
  SF1:  1°A  vs  [PI1]
  SF2:  [PI2] vs  1°B
```

---

### 4 zonas → 8 clasificados → Cuartos

```
QF1:  1°A  vs  2°C
QF2:  2°B  vs  1°D
QF3:  1°C  vs  2°A
QF4:  2°D  vs  1°B
```

---

### 5 zonas → 10 clasificados → Previa + Cuartos

```
Previas:
  PI1:  2°B  vs  2°C
  PI2:  2°A  vs  2°D

Cuartos:
  QF1:  1°A  vs  [PI1]
  QF2:  1°E  vs  1°D
  QF3:  1°C  vs  2°E
  QF4:  [PI2] vs  1°B
```

---

### 6 zonas → 12 clasificados → 4 Previas + Cuartos

```
Previas:
  PI1:  2°F  vs  2°C
  PI2:  1°E  vs  2°B
  PI3:  2°A  vs  1°F
  PI4:  2°E  vs  2°D

Cuartos:
  QF1:  1°A  vs  [PI1]
  QF2:  [PI2] vs  1°D
  QF3:  1°C  vs  [PI3]
  QF4:  [PI4] vs  1°B
```

---

### 7 zonas → 14 clasificados → Octavos (1°A y 1°B con BYE a Cuartos)

```
Octavos:
  R1:   2°F  vs  2°G
  R2:   1°E  vs  2°C
  R3:   2°B  vs  1°D
  R4:   1°C  vs  2°A
  R5:   2°D  vs  1°F
  R6:   1°G  vs  2°E

Cuartos:
  QF1:  1°A (BYE) vs  [R1]
  QF2:  [R2]      vs  [R3]
  QF3:  [R4]      vs  [R5]
  QF4:  [R6]      vs  1°B (BYE)
```

---

### 8 zonas → 16 clasificados → Octavos (todos juegan)

```
Octavos:
  R1:   1°A  vs  2°H
  R2:   2°F  vs  2°G
  R3:   1°E  vs  2°C
  R4:   2°B  vs  1°D
  R5:   1°C  vs  2°A
  R6:   2°D  vs  1°F
  R7:   1°G  vs  2°E
  R8:   1°H  vs  1°B
```

---

### 9 zonas → 18 clasificados → 2 Previas + 16avos

```
Previas:
  PI1:  2°B  vs  2°C
  PI2:  2°D  vs  2°A

16avos:
  R1:   1°A  vs  [PI1]
  R2:   1°I  vs  1°H
  R3:   1°E  vs  2°G
  R4:   2°F  vs  1°D
  R5:   1°C  vs  2°E
  R6:   2°H  vs  1°F
  R7:   1°G  vs  2°I
  R8:   [PI2] vs  1°B
```

---

### 10 zonas → 20 clasificados → 4 Previas + 16avos  ← cubre 30, 31 y 32 parejas

```
Previas:
  PI1:  2°C  vs  2°F
  PI2:  2°G  vs  2°B
  PI3:  2°A  vs  2°H
  PI4:  2°E  vs  2°D

16avos:
  R1:   1°A  vs  [PI1]
  R2:   1°I  vs  1°H
  R3:   1°E  vs  2°J
  R4:   [PI2] vs  1°D
  R5:   1°C  vs  [PI3]
  R6:   1°G  vs  1°F
  R7:   [PI4] vs  1°B
  R8:   2°I  vs  2°J
```

---

## Casos borde

| Parejas | Zonas | Draw | Nota |
|---------|-------|------|------|
| 30 | 10 × z3 = 10 zonas | APA_DRAWS[10] | Normal |
| 31 | 9×z3 + 1×z4 = 10 zonas | APA_DRAWS[10] | Normal |
| 32 | 8×z3 + 2×z4 = 10 zonas | APA_DRAWS[10] | Fix especial en `calcularDistribucionZonas` |
| 33+ | 11+ zonas | — | Error: APA no contempla >10 zonas. Dividir en más categorías. |

---

## Implementación en código

```
src/services/torneoService.js
  ├── APA_DRAWS             — tabla de draws indexada por cantidad de zonas (2–10)
  ├── calcularDistribucionZonas(totalParejas) — devuelve array con tamaño de cada zona
  ├── generateAPAEliminationBracket(grupos)   — genera bracket + previas + links nextMatchId
  └── _propagarGanador(rondas, partido)       — propaga ganador al siguiente partido
```
