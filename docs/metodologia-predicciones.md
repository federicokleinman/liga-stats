# Metodología de Predicciones — Liga Universitaria Stats

## Resumen

El modelo estima la probabilidad de cada equipo de la Divisional A de Mayores Masculino
de ser **campeón** (1°), **clasificar en el Top 4**, o **descender** (últimos 4) en la
próxima temporada. Utiliza datos históricos de 23 temporadas (T90–T112, años 2003–2025)
y pondera con mayor fuerza las temporadas más recientes.

---

## Paso 1 — Determinar el plantel de la Divisional A

El roster de la próxima temporada se calcula a partir de la última temporada completada:

- **Se mantienen:** los equipos de Div A que NO terminaron en los últimos 4 puestos.
- **Ascienden:** los 4 primeros de Div B.

Esto da un total de **16 equipos** (12 que permanecen + 4 ascendidos).

---

## Paso 2 — Power Rating (calificación de fuerza)

Para cada equipo se calcula un rating compuesto basado en su historial.

### 2.1 Métricas por temporada

De cada temporada en la que el equipo participó, se extraen tres métricas:

| Métrica | Fórmula | Qué mide |
|---------|---------|----------|
| **Puntos por partido** | `puntos / PJ` | Rendimiento general |
| **Diferencia de gol por partido** | `(GF - GC) / PJ` | Dominio sobre rivales |
| **Tasa de victorias** | `PG / PJ` | Consistencia |

### 2.2 Normalización (z-score)

Las métricas se normalizan **dentro de cada temporada** usando z-scores:

```
z = (valor - media_temporada) / desviación_estándar_temporada
```

Esto permite comparar rendimientos entre temporadas con distinta cantidad de equipos o
niveles de competitividad. Un z-score de +1.0 significa que el equipo estuvo una desviación
estándar por encima del promedio de esa temporada.

El z-score compuesto de una temporada es el promedio de los tres z-scores individuales:

```
z_compuesto = (z_puntos_pp + z_dif_gol_pp + z_victorias) / 3
```

### 2.3 Ponderación exponencial

Las temporadas más recientes pesan más mediante un decay exponencial:

```
peso(temporada) = 0.7 ^ (última_temporada - temporada)
```

| Temporada | Peso |
|-----------|------|
| T112 (última) | 1.000 |
| T111 | 0.700 |
| T110 | 0.490 |
| T109 | 0.343 |
| T108 | 0.240 |
| T105 | 0.082 |
| T100 | 0.014 |
| T95 | 0.002 |

Esto significa que las **últimas 3 temporadas concentran ~75% del peso total**, mientras
que temporadas de hace 10+ años aportan menos del 2%.

### 2.4 Rating final

```
rating = Σ(z_compuesto_i × peso_i) / Σ(peso_i)
```

Es decir, un promedio ponderado de los z-scores compuestos a lo largo de toda la historia
del equipo en Div A.

### 2.5 Equipos ascendidos (sin historial en Div A)

Para equipos que suben de Div B, se usa su historial en Div B pero con un **factor de
descuento del 40%** (multiplicador 0.6). Esto refleja que históricamente los equipos
recién ascendidos tienden a rendir peor que en su divisional anterior, ya que enfrentan
rivales más fuertes.

### 2.6 Desviación estándar (incertidumbre)

Cada equipo tiene una desviación estándar individual que refleja qué tan variable ha sido
su rendimiento históricamente:

- Si tiene **3 o más temporadas** de historial: se calcula la desviación estándar real
  de sus z-scores.
- Si tiene **menos de 3 temporadas**: se usa un valor default de **0.8** (incertidumbre
  alta).

Un equipo con stdDev alta es más impredecible — puede terminar tanto arriba como abajo.

---

## Paso 3 — Simulación Monte Carlo

Se ejecutan **10,000 temporadas simuladas**. En cada simulación:

1. **Muestreo:** Para cada equipo se genera un rendimiento aleatorio a partir de una
   distribución normal:
   ```
   rendimiento = rating + stdDev × N(0, 1)
   ```
   donde N(0,1) es un número aleatorio con distribución normal estándar (media 0,
   desviación 1).

2. **Ranking:** Se ordenan los 16 equipos por rendimiento simulado, de mayor a menor.

3. **Registro:** Se anota para cada equipo:
   - Si quedó 1° → +1 al contador de campeón
   - Si quedó en los primeros 4 → +1 al contador de Top 4
   - Si quedó en los últimos 4 → +1 al contador de descenso
   - Se acumula su posición para calcular la posición esperada promedio

### Generador de números aleatorios

Se usa el algoritmo **Mulberry32** con una semilla fija (`2026`), lo que garantiza que
los resultados sean **reproducibles** entre distintas cargas de la página.

Para generar la distribución normal se usa la **transformada de Box-Muller**:
```
z = √(-2 × ln(u₁)) × cos(2π × u₂)
```
donde u₁ y u₂ son números uniformes del generador Mulberry32.

---

## Paso 4 — Cálculo de probabilidades

Las probabilidades finales son simplemente los conteos divididos por el total de
simulaciones:

```
P(campeón)  = veces_campeón / 10,000
P(top 4)    = veces_top_4 / 10,000
P(descenso) = veces_bottom_4 / 10,000
Pos. esperada = suma_posiciones / 10,000
```

---

## Parámetros del modelo

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `DECAY` | 0.7 | Factor de decaimiento exponencial por temporada |
| `SIMULATIONS` | 10,000 | Cantidad de temporadas simuladas |
| `DIV_B_PENALTY` | 0.6 | Descuento para equipos ascendidos de Div B |
| `DEFAULT_STD_DEV` | 0.8 | Desviación estándar para equipos con poco historial |
| `MIN_SEASONS_FOR_VARIANCE` | 3 | Mínimo de temporadas para calcular varianza propia |
| `PROMOTION_SLOTS` | 4 | Cantidad de equipos que ascienden (Top 4) |
| `RELEGATION_SLOTS` | 4 | Cantidad de equipos que descienden (últimos 4) |
| Seed RNG | 2026 | Semilla fija para reproducibilidad |

---

## Limitaciones

- **No considera refuerzos ni bajas:** El modelo no sabe qué jugadores se fueron o
  llegaron entre temporadas.
- **Asume estabilidad estructural:** Si la liga cambia reglas (ej. cantidad de equipos
  por divisional, puntos por victoria), el modelo no lo captura.
- **Equipos ascendidos tienen más incertidumbre:** Al no tener historial en Div A, sus
  predicciones son menos confiables.
- **Es un modelo estadístico simplificado:** No es machine learning ni tiene variables
  externas (presupuesto, infraestructura, etc.).

---

## Ejemplo interpretativo

Si un equipo tiene:
- **Campeón: 25%** → En 1 de cada 4 simulaciones terminó primero
- **Top 4: 60%** → En 6 de cada 10 simulaciones terminó entre los primeros 4
- **Descenso: 5%** → Solo en 1 de cada 20 simulaciones terminó en los últimos 4
- **Pos. Esperada: 4.2** → En promedio terminó alrededor del 4° puesto

---

*Implementación: [`src/lib/predictions.ts`](../src/lib/predictions.ts)*
