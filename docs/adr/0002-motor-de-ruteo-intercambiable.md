# ADR-0002 · Motor de ruteo intercambiable OSRM/Google

- **Estado:** Aceptado
- **Fecha:** 2026-07-27

## Contexto

El ruteo por calle es el núcleo del producto. Se implementó **OSRM self-hosted** (extracto de Valparaíso) por ser gratis y sin límites. Sin embargo, en zonas con **datos deficientes de OpenStreetMap** (caso concreto: Levarte 66 → Escuela Naval Arturo Prat, Playa Ancha) OSRM devolvía rutas más largas de lo real (2.88 km vs ~1.4 km que da Google Maps), por calles mal etiquetadas (sentido/uso). Se confirmó que no era un problema de configuración: el OSRM público daba el mismo resultado.

## Decisión

Hacer el motor de ruteo **intercambiable** por variable de entorno `ROUTING_PROVIDER` (`osrm` | `google`), detrás de una interfaz única `getRoute()` que devuelve `RouteResult` normalizado (`apps/api/src/routing.ts`):

- `tryOsrm()` y `tryGoogle()` como adaptadores que devuelven la misma forma.
- **Cadena de respaldo:** si el proveedor elegido falla, se intenta el otro; si ambos fallan, línea recta.
- **Caché** en memoria (TTL 10 min) por coordenadas redondeadas.
- En **producción**: `ROUTING_PROVIDER=google` (mejores datos en Valparaíso). La key está restringida por IP y a Directions API.

## Consecuencias

**Positivas**
- Se elige el mejor motor por entorno sin tocar código.
- Resiliencia: un motor caído no rompe la app (respaldo + línea recta).
- La misma abstracción sirve para maniobras de navegación (`steps`).

**Negativas / costos**
- Google **cobra** por uso (mitigado por la capa gratuita mensual y la caché).
- Dos adaptadores que mantener (decodificador de *polyline*, mapeo de maniobras, limpieza de HTML en Google).
- El problema de **geocoding** de POIs mal ubicados persiste (independiente del motor): se mitiga con la dirección de entrada o arrastrando el pin.
