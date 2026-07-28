# UX-0001 · Sistema de diseño y UX

| Campo | Valor |
|-------|-------|
| **Código** | UX-0001 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Dueño** | Diseño / Frontend |
| **Fecha** | 2026-07-27 |
| **Fuente** | `apps/web/src/styles.css`, `components/`, `pages/` |

---

## 1. Principios

1. **El mapa es la interfaz.** Pantalla completa; controles flotan encima.
2. **Una acción principal a la vez.** Botón grande y claro por paso.
3. **Bottom sheet colapsable.** La info del viaje vive abajo y se puede minimizar.
4. **Neutro y sobrio.** Tinta casi negra, un acento morado, mucho blanco. Que "no parezca hecho por IA".
5. **Sin dependencias de UI pesadas.** Íconos y gráficos propios en SVG.

## 2. Tokens de diseño

Definidos como variables CSS en `apps/web/src/styles.css` (fuente de verdad).

### 2.1 Color
| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#f7f7f8` | Fondo de app |
| `--surface` | `#ffffff` | Tarjetas, sheets |
| `--ink` | `#0a0a0b` | Texto principal |
| `--muted` | `#71717a` | Texto secundario |
| `--faint` | `#a1a1aa` | Texto terciario/placeholder |
| `--line` | `#e7e7ea` | Bordes y divisores |
| `--primary` / `--primary-ink` | `#0a0a0b` / `#fff` | Botón principal |
| `--accent` / `--accent-soft` / `--accent-ink` | `#635bff` / `#efeefe` / `#4b45c6` | Acento (morado) |
| `--go` / `--go-soft` | `#10b981` | Éxito / **ruta de recogida (verde)** |
| `--warn` / `--warn-soft` | `#f59e0b` | Advertencia |
| `--danger` / `--danger-soft` | `#e5484d` | Error / cancelar |
| `--info` / `--info-soft` | `#3b82f6` | Info / **ruta de viaje (azul)** |

### 2.2 Radios
`--r-xs 8` · `--r-sm 10` · `--r 12` · `--r-lg 16` · `--r-xl 22` (px).

### 2.3 Sombras
`--sh-xs` … `--sh-lg` para elevación creciente; `--sh-sheet` específica para el bottom sheet (sombra hacia arriba).

### 2.4 Tipografía
`--font: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
Jerarquía por peso y tamaño; números tabulares para tarifas/tiempos.

## 3. Semántica de color de ruta
| Situación | Color | Token |
|-----------|-------|-------|
| Tramo de recogida (conductor→pasajero) | Verde | `--go` |
| Tramo de viaje (origen→destino) | Azul | `--info` |
| Ruta no resuelta por calle | Punteado | — |
| Ruta real por calle | Sólido | — |

## 4. Componentes

| Componente | Archivo | Función |
|------------|---------|---------|
| Íconos | `components/Icons.tsx` | Set SVG propio (Logo, Car, Wheel, Pin, Flag, Navigation, Building, Settings, Maneuver, Chevrons…) |
| Buscador | `components/SearchBox.tsx` | Autocompletado con sesgo al mapa |
| Navegación | `components/NavGuide.tsx` | Banner de maniobra + distancia + voz |
| Gráficos | `components/Charts.tsx` | `TrendChart` (área), `Bars`, `Donut` en SVG |
| Marcadores mapa | `divIcon` (emoji→SVG) | Origen, destino, taxi, "yo" |

## 5. Patrones de interacción
- **Seguir al vehículo** durante el viaje; al arrastrar el mapa se suelta el seguimiento y aparece FAB de **recentrar**.
- **Fijar puntos:** buscar, tocar el mapa o **arrastrar el pin** (origen/destino son `draggable`).
- **Colapsar mapa/sheet:** botón "Agrandar mapa".
- **Voz:** botón 🔊 OFF por defecto (iOS exige gesto); primer toque la activa.

## 6. Pantallas y estados
| Pantalla | Estados clave |
|----------|---------------|
| Pasajero | Sin viaje (buscar/estimar) · Buscando conductor · Conductor en camino (ETA) · En viaje · Finalizado (calificar) |
| Conductor | Offline · En línea (solicitudes) · Recogida · En viaje · Cierre |
| Admin | 8 pestañas: Dashboard, Mapa en vivo, Reportes, Conductores, Vehículos, Usuarios, Empresas, Tarifas |

## 7. Accesibilidad (estado y objetivos)
- Contraste alto por defecto (tinta casi negra sobre blanco).
- **Pendiente:** roles/labels ARIA en controles del mapa, foco visible consistente, tamaños táctiles mínimos auditados, modo oscuro.

## 8. Responsividad
Diseño **mobile-first** (PWA en celular). El admin es usable en escritorio; se debe validar el layout de tablas/gráficos en pantallas chicas.

## 9. Guía para nuevos componentes
1. Usar **tokens** (no colores/medidas mágicas).
2. SVG propio antes que dependencia externa.
3. Estados vacíos y de carga explícitos.
4. Texto en español (CL), tono directo.

## 10. Pendientes de sistema de diseño
- Documentar escala tipográfica exacta y espaciados como tokens.
- Modo oscuro.
- Biblioteca de componentes con ejemplos (Storybook u hoja viva).
