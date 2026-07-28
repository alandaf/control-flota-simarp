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

## Navegación giro a giro + voz (`components/NavGuide.tsx`)

Componente que convierte la ruta en indicaciones:

- Pide la ruta con maniobras (`POST /api/trips/route` con `{ steps: true }`) → obtiene **geometría** + **pasos**.
- **Seguimiento por proyección sobre la ruta** (no distancia en línea recta):
  - **Distancia perpendicular** a la línea → si supera **45 m** de forma sostenida, **recalcula** (con anti-rebote de 6 s).
  - **Avance a lo largo de la ruta** → determina qué maniobra sigue y su distancia real; así el banner y la voz van al día aunque el GPS derive.
- **Voz (Web Speech API):**
  - **OFF por defecto** — iOS exige un gesto del usuario para desbloquear `speechSynthesis`; el primer toque en 🔊 lo activa.
  - Anuncia "En X metros, {maniobra}" al acercarse y la instrucción corta al llegar al giro.
  - Idioma `es-ES`.

Historia de la decisión: [ADR-0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md).

## Consideraciones iOS/Safari conocidas

- El **switch de silencio** físico del iPhone puede silenciar `speechSynthesis`.
- La voz solo funciona tras el primer toque (por eso el botón 🔊).
- La geolocalización de alta precisión consume batería: el Wake Lock ayuda a mantener el viaje activo, pero conviene enchufar el teléfono en jornadas largas.

## Pruebas en dispositivo

- Local: la PWA se puede instalar desde el navegador del celular apuntando al front local (con túnel si hace falta).
- Producción: https://flota.simarp.net (HTTPS válido, requisito para PWA + geolocalización).
