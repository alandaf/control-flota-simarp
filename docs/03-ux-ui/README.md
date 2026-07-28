# 03 · UX / UI

## Principios de diseño

El objetivo declarado fue que **no pareciera "hecho por IA"**, sino un producto real estilo Silicon Valley:

1. **El mapa es la interfaz.** La pantalla principal de pasajero y conductor es el mapa a pantalla completa; los controles flotan encima.
2. **Una acción principal a la vez.** Botón grande y claro para el siguiente paso (Pedir, Aceptar, Llegué, Iniciar, Finalizar).
3. **Hoja inferior (bottom sheet).** La información del viaje vive en un panel inferior que se puede **colapsar** ("Agrandar mapa").
4. **Tipografía Inter**, jerarquía limpia, esquinas redondeadas, sombras suaves.
5. **Íconos propios en SVG** (`apps/web/src/components/Icons.tsx`), no dependencias de icon packs.

## Pantallas

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/login` | `pages/Login.tsx` | Ingreso; enruta según rol |
| `/` (pasajero) | `pages/Passenger.tsx` | Mapa, buscador origen/destino, estimación, seguimiento en vivo con ETA |
| `/driver` | `pages/Driver.tsx` | Mapa navegación, solicitudes, control de estado del viaje |
| `/admin` | `pages/Admin.tsx` | 8 pestañas: Dashboard, Mapa en vivo, Reportes, Conductores, Vehículos, Usuarios, Empresas, Tarifas |
| `/history` | `pages/History.tsx` | Historial de viajes del pasajero |

Enrutado en `apps/web/src/App.tsx`; sesión y guardas de rol en `apps/web/src/lib/auth.tsx`.

## Patrones móviles

- **Mapa que sigue al vehículo** durante el viaje; si el usuario arrastra el mapa, deja de seguir y aparece un FAB de **recentrar**.
- **Marcadores como `divIcon`** con emoji→SVG para origen, destino, taxi y "yo".
- **Buscador con autocompletado** (`components/SearchBox.tsx`) sesgado a la vista del mapa.
- **Banner de navegación** (`components/NavGuide.tsx`): flecha de maniobra, distancia al giro, instrucción y botón de voz.

## Navegación giro a giro

El banner de navegación proyecta la posición del conductor **sobre la geometría de la ruta** para:

- Saber **qué maniobra sigue** y a qué distancia real (no en línea recta).
- Detectar **desvío** (distancia perpendicular a la ruta) y **recalcular**.

Ver detalle en [05 · Mobile](../05-mobile/README.md) y [ADR-0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md).

## Colores de ruta (semántica)

| Color | Significado |
|-------|-------------|
| 🟢 Verde | Tramo de **recogida** (conductor → pasajero) |
| 🔵 Azul | Tramo de **viaje** (origen → destino) |
| Punteado | Ruta **no** resuelta por calle (línea recta de respaldo) |
| Sólido | Ruta real por calle (OSRM o Google) |

## Gráficos del dashboard

Sin librerías externas: componentes SVG propios en `apps/web/src/components/Charts.tsx` (`TrendChart` de área, `Bars`, `Donut`). Esto mantiene el bundle liviano y el estilo consistente.
