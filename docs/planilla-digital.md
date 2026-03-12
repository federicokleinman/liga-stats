# Planilla Digital de Partido

Sistema de planillas digitales para la Liga Universitaria de Deportes. Permite a los equipos cargar sus planillas de partido de forma digital y a la Liga validar y publicar los resultados oficiales.

**Alcance actual:** Divisional A — Mayores Masculino.

---

## Guía para Equipos

### Acceso

1. Ingresá a la web de la Liga y hacé clic en **"Planilla Digital"** en la barra de navegación.
2. En la pantalla de login, seleccioná la pestaña **"Equipo"**.
3. Elegí tu equipo del desplegable e ingresá la contraseña proporcionada por la Liga.

### Mis Partidos

Después de loguearte vas a ver la lista de partidos asignados a tu equipo. Cada partido muestra:

- Equipos enfrentados, fecha, hora y cancha
- Estado actual (pendiente, borrador guardado, enviada)

Hacé clic en un partido para abrir el formulario de planilla.

### Llenado de la Planilla

El formulario tiene las siguientes secciones:

#### 1. Resultado

Ingresá los goles de tu equipo y los del rival.

#### 2. Cuerpo Técnico

- **Nombre del DT** y **CI del DT**: datos del director técnico.

#### 3. Titulares (11 jugadores)

- Hacé clic en **"+ Agregar jugador"** para agregar un titular.
- Escribí el nombre o carné del jugador en el buscador — el sistema autocompleta con los jugadores registrados en el plantel.
- Asigná el **número de camiseta**.
- Marcá al **capitán** con el botón "C".

#### 4. Suplentes

Mismo procedimiento que titulares. No hay límite estricto de suplentes.

#### 5. Firma con Foto

Cada jugador presente en el partido debe "firmar" con una foto:

- Hacé clic en el ícono de cámara junto al jugador.
- En celulares se abre la cámara frontal directamente para tomar una selfie.
- En computadora podés seleccionar un archivo de imagen.
- La foto se comprime automáticamente antes de subirse.
- Una vez subida, aparece la miniatura del jugador y el texto "Firmado con foto".

#### 6. Eventos del Partido

Usá las pestañas para registrar eventos:

- **Gol**: seleccioná el goleador del desplegable y el minuto. Marcá "En contra" si corresponde.
- **Amarilla / Roja**: seleccioná el jugador amonestado/expulsado y el minuto.
- **Cambio**: seleccioná el jugador que sale, el que entra (del banco), su camiseta, y el minuto.

#### 7. Observaciones

Campo de texto libre para notas adicionales (incidentes, aclaraciones, etc.).

#### 8. Guardado y Envío

- **Auto-guardado**: el borrador se guarda automáticamente cada 30 segundos.
- **Guardar Borrador**: podés guardar manualmente en cualquier momento y volver más tarde.
- **Enviar Planilla**: una vez que todo esté completo, hacé clic en "Enviar Planilla". Se muestra un resumen de confirmación antes de enviar.

> **Importante:** Una vez enviada, la planilla no se puede modificar. Asegurate de que todo esté correcto antes de enviar.

### Avisos y Validaciones

El sistema muestra avisos (no bloquean el envío) cuando detecta:

- Menos o más de 11 titulares
- Jugadores duplicados en la nómina
- Números de camiseta repetidos
- Capitán que no está entre los titulares
- Minutos de eventos fuera de rango (0-130)
- Cambios con jugadores que no están en cancha o en el banco

---

## Guía para Administradores (Liga)

### Acceso

1. En la pantalla de login, seleccioná la pestaña **"Administrador"**.
2. Ingresá la contraseña de administrador.

### Panel de Administración

El dashboard muestra todos los partidos organizados por estado:

| Estado | Significado |
|--------|-------------|
| Pendiente | Partido creado, ningún equipo envió planilla |
| Parcial | Un equipo envió, falta el otro |
| Listo | Ambos equipos enviaron, listo para validar |
| Validado | Validado por la Liga, pendiente de publicación |
| Publicado | Publicado, visible en el resumen público |

### Crear Partido

1. Hacé clic en **"Crear Partido"** en el panel admin.
2. Completá: fecha, hora, cancha, equipos (local y visitante), divisional y torneo.
3. Al crear el partido, queda disponible para que ambos equipos carguen sus planillas.

### Validación de Partido

Cuando ambos equipos enviaron sus planillas:

1. Hacé clic en el partido en el panel admin.
2. Se muestra la **comparación lado a lado**:
   - Resultado según cada equipo
   - Nóminas de titulares y suplentes (con fotos)
   - Eventos registrados por cada equipo
   - Datos del cuerpo técnico

3. **Discrepancias**: el sistema detecta automáticamente diferencias entre ambas planillas:
   - Resultados cruzados que no coinciden
   - Goles reportados por un equipo pero no por el otro
   - Tarjetas que no coinciden
   - Diferencias en cambios

4. Para cada discrepancia, elegí la versión correcta (local o visitante) haciendo clic en el botón correspondiente.

5. Una vez resueltas todas las discrepancias, hacé clic en **"Validar Partido"**.

### Publicación

Después de validar:

1. Hacé clic en **"Publicar Partido"**.
2. El partido pasa a estado "Publicado".
3. Se genera automáticamente el **resumen público** accesible en `/planilla/resumen/[matchId]`.

### Resumen Público

La página de resumen público muestra:

- Resultado oficial
- Nóminas oficiales con fotos de los jugadores firmantes
- Línea de tiempo de eventos (goles, tarjetas, cambios)
- Fecha de validación y publicación

Esta página es accesible sin login.

---

## Configuración Técnica

### Variables de Entorno

Estas variables deben configurarse en el entorno de deploy (Render, Vercel, etc.):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `PLANILLA_JWT_SECRET` | Clave secreta para firmar tokens JWT. Debe ser un string largo y aleatorio. | `mi-clave-secreta-muy-larga-2025` |
| `PLANILLA_ADMIN_PASSWORD` | Contraseña de acceso para administradores de la Liga. | `admin123` |
| `PLANILLA_TEAMS` | Lista de equipos habilitados con sus contraseñas. Formato: `teamId:password` separados por comas. | `ofc:ofc2025,sayago:sayago2025` |

### Agregar un Nuevo Equipo

1. Identificá el `teamId` del equipo. Este ID debe coincidir con el ID que usa el sistema de estadísticas (el campo `equipo` de los jugadores en el cache).

2. Elegí una contraseña para el equipo.

3. Agregá la entrada al env var `PLANILLA_TEAMS`:
   ```
   # Antes
   PLANILLA_TEAMS=ofc:ofc2025,sayago:sayago2025

   # Después (agregando "nacional")
   PLANILLA_TEAMS=ofc:ofc2025,sayago:sayago2025,nacional:nacional2025
   ```

4. Reiniciá el servidor / redeploy.

5. El equipo ya aparece en el selector de login y puede acceder con su contraseña.

### Cambiar Contraseña de un Equipo

Modificá el valor después de los `:` en `PLANILLA_TEAMS` para ese equipo y redeployá.

### Cambiar Contraseña de Admin

Modificá el valor de `PLANILLA_ADMIN_PASSWORD` y redeployá.

### Habilitar Todos los Equipos de Divisional A

Para habilitar todos los equipos de la Divisional A, agregá una entrada por cada equipo en `PLANILLA_TEAMS`. Los IDs de equipo se obtienen del cache de jugadores (`players-t112-a.json`, campo `equipo`).

### Almacenamiento de Datos

Los datos se guardan en archivos JSON en el directorio `data/planillas/`:

```
data/planillas/
├── matches.json                              # Lista de partidos
├── submissions/
│   └── {matchId}-{teamId}.json              # Planilla de cada equipo
├── validations/
│   └── {matchId}.json                        # Validación oficial
└── photos/
    └── {matchId}--{teamId}--{carne}.jpg     # Fotos de firma
```

> En Render, el directorio `data/` debe estar en un **Persistent Disk** para que los datos persistan entre deploys.

### Datos de Prueba (Seed)

Para generar datos de demostración, ejecutá:

```bash
curl -X POST https://tu-dominio.com/api/planilla/seed
```

Esto crea:
- Un partido de ejemplo entre dos equipos reales (con jugadores del cache)
- Dos planillas enviadas con pequeñas discrepancias
- Un segundo partido pendiente para probar el flujo completo

---

## Flujo Completo

```
Admin crea partido
       │
       ▼
Equipo Local llena planilla ──────── Equipo Visitante llena planilla
       │                                        │
       ▼                                        ▼
   Envía planilla                          Envía planilla
       │                                        │
       └──────────── Ambas enviadas ────────────┘
                          │
                          ▼
              Comparación automática
              (detecta discrepancias)
                          │
                          ▼
              Admin resuelve discrepancias
                          │
                          ▼
                 Admin valida partido
                          │
                          ▼
                Admin publica partido
                          │
                          ▼
              Resumen público disponible
```
