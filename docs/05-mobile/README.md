# 05 · Mobile (PWA)

No hay app nativa: **Control Flota es una PWA instalable** que se comporta como app en el celular. Front en `apps/web`.

## PWA

- Configurada con **`vite-plugin-pwa`** (`apps/web/vite.config.ts`), modo `autoUpdate`, workbox `generateSW`.
- Instalable desde el navegador ("Agregar a pantalla de inicio").
- Service worker precachea la SPA para arranque rápido.

> ⚠️ **Gotcha del service worker.** Tras cada rebuild del contenedor web, el SW puede servir el **JS viejo cacheado**. Solución: **hard-refresh** (Ctrl+Shift+R) o cerrar y reabrir la PWA. Es la causa #1 de "no veo mi cambio". Ver [runbook](../docs/README.md).

## Geolocalización

- El conductor usa `navigator.geolocation.watchPosition` con `enableHighAccuracy: true` (`pages/Driver.tsx`).
- Emite `driver:location` por socket como máximo cada ~3 s (throttle) cuando está **en línea** o **en un viaje**.
- El pasajero centra el mapa en su ubicación al abrir y puede reubicar el origen tocando/arrastrando.

## Pantalla siempre encendida (Wake Lock)

- Hook `useWakeLock(active)` en `apps/web/src/lib/wakeLock.ts`.
- Se activa mientras haya un viaje (`useWakeLock(!!trip)`), y **re-adquiere** el lock al volver a foco (`visibilitychange`).
- Evita que la pantalla se apague durante la navegación.

## Navegación (`components/NavGuide.tsx` + botones Waze/Google)

La **navegación real se delega a Waze o Google Maps**; la app aporta el
despacho y una guía visual ligera. Para la guía del usuario final ver
[guia-conductor.md](guia-conductor.md).

- **Botones Waze / Google Maps** (panel del conductor, `pages/Driver.tsx`):
  abren navegación giro-a-giro real hacia el punto de la fase actual
  (recogida antes de "Iniciar viaje", destino durante el viaje). **No pasan
  origen**: cada app usa el GPS del teléfono (más preciso que el GPS web).
  - Google: `.../maps/dir/?api=1&destination=LAT,LNG&travelmode=driving&dir_action=navigate`
  - Waze: `https://www.waze.com/ul?ll=LAT,LNG&navigate=yes`
- **`NavGuide` = guía SOLO visual (sin voz):** muestra en pantalla la próxima
  maniobra y la distancia.
  - Pide la ruta con maniobras (`POST /api/trips/route` con `{ steps: true }`) → **geometría** + **pasos**.
  - **Seguimiento por proyección sobre la ruta:** distancia **perpendicular**
    (desvío) + **avance** a lo largo. Bucle cada **1 s**; GPS del conductor con
    `maximumAge: 800ms`.
  - **Desvío → alerta al panel de operaciones** (`onOffRoute`) cuando la
    perpendicular supera **60 m** por **3 lecturas** seguidas (anti-rebote 8 s).
    **No recalcula en los últimos ~300 m** al destino (en zona urbana el GPS
    "salta" entre calles y daba falsos positivos que proponían otra ruta).
  - **La voz interna se eliminó:** calculaba su propia ruta (aparte de la del
    mapa) y se desincronizaba a mitad de camino. La voz la ponen Waze/Google.

Historia de la decisión: [ADR-0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md)
(la parte de **voz interna** quedó **superada**: hoy es guía visual + Waze/Google).

## Consideraciones iOS/Safari conocidas

- La **navegación por voz la aportan Waze/Google** (apps nativas), no la PWA.
  Así evitamos las limitaciones de `speechSynthesis` en iOS (switch de silencio
  físico, requisito de gesto del usuario, etc.).
- La geolocalización de alta precisión consume batería: el Wake Lock ayuda a mantener el viaje activo, pero conviene enchufar el teléfono en jornadas largas.

## Pruebas en dispositivo

- Local: la PWA se puede instalar desde el navegador del celular apuntando al front local (con túnel si hace falta).
- Producción: https://flota.simarp.net (HTTPS válido, requisito para PWA + geolocalización).
