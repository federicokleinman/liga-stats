# Liga Universitaria Stats

Métricas históricas de la **Liga Universitaria de Deportes** (Uruguay) — Fútbol, torneo **Mayores Masculino**.

## Cómo correr

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

La primera vez no habrá datos. Hacer click en **"Refrescar Cache"** en el Dashboard para iniciar la ingesta.

## Configuración

Variables de entorno (opcionales, se pueden poner en `.env.local`):

| Variable | Default | Descripción |
|---|---|---|
| `TEMPORADA_MIN` | `80` | ID de temporada mínima a consultar |
| `TEMPORADA_MAX` | `120` | ID de temporada máxima a consultar |
| `DIVISIONALES` | `A,B,C,D,E,F,G` | Letras de divisionales separadas por coma |
| `MIN_CONSISTENCY_SEASONS` | `5` | Mínimo de temporadas para métrica de consistencia |

### Cambiar rango de temporadas

Crear un archivo `.env.local`:

```env
TEMPORADA_MIN=90
TEMPORADA_MAX=110
DIVISIONALES=A,B,C
```

Luego refrescar cache desde el Dashboard.

## Alias de equipos

Editar `aliases.json` en la raíz del proyecto para mapear variantes de nombres:

```json
{
  "NOMBRE ORIGINAL": "Nombre Canónico"
}
```

Los alias se aplican durante la ingesta.

## Arquitectura

```
src/
  app/
    page.tsx              # Dashboard con KPIs y rankings
    equipos/              # Buscador y detalle de equipos
    temporadas/           # Tablas de posiciones por temporada
    metodologia/          # Explicación de supuestos
    api/
      ingest/route.ts     # POST: trigger ingesta; GET: status
      data/route.ts       # GET: métricas y standings
  lib/
    types.ts              # Tipos TypeScript
    ingest.ts             # Fetch + rate limit + parse + normalize
    metrics.ts            # Cálculo de métricas
    storage.ts            # Cache en disco y memoria
    normalize.ts          # Normalización de nombres
    hooks.ts              # React hooks para fetch de datos
  components/
    Navigation.tsx        # Nav bar
    SortableTable.tsx     # Tabla ordenable
    Card.tsx              # Card de KPI
    RefreshButton.tsx     # Botón de ingesta
    TrajectoryChart.tsx   # Gráfico de trayectoria (Recharts)
```

## Rate Limiting

Se aplica un rate limit de **máximo 2 requests/segundo** al servidor de la Liga Universitaria.
La ingesta completa del rango default (41 temporadas × 7 divisionales = 287 combinaciones) tarda ~2.5 minutos.

## Advertencias

- Los datos se obtienen del endpoint público de la Liga Universitaria. Usá esta herramienta con responsabilidad.
- La definición de "campeón" es por puntos en tabla, lo cual puede no coincidir con el formato real (playoffs, etc.).
- Los ascensos se infieren por cambio de letra de divisional entre temporadas consecutivas.
- Ver la página **Metodología** en la app para más detalles.
