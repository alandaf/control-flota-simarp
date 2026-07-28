# ADR-0001 · Decisiones de arquitectura (registro maestro)

| Campo | Valor |
|-------|-------|
| **Código** | ADR-0001 |
| **Versión** | 1.0 |
| **Estado** | Aprobado |
| **Dueño** | Ingeniería |
| **Fecha** | 2026-07-27 |

Este documento es el **registro maestro** de decisiones de arquitectura. Cada decisión concreta vive como un ADR individual e inmutable en [`docs/adr/`](../adr/README.md). Aquí se listan, se explica el proceso y se resumen.

## Proceso ADR

1. Se detecta una decisión con impacto estructural (fuerzas en conflicto, trade-off relevante).
2. Se redacta un ADR con: **Contexto → Decisión → Consecuencias**.
3. Estado: `Propuesto` → `Aceptado`. Si cambia, se crea uno nuevo con `Reemplaza a: ADR-XXXX` (no se reescribe el anterior).
4. Se enlaza desde el documento afectado (PRD/ARCH/etc.).

## Registro

| ADR | Título | Estado | Resumen de la decisión |
|-----|--------|--------|------------------------|
| [0001](../adr/0001-deploy-detras-de-nginx-host.md) | Despliegue detrás del nginx del host | Aceptado | Web en `127.0.0.1:8095` tras el nginx del host compartido; sin Caddy; TLS con certbot snap |
| [0002](../adr/0002-motor-de-ruteo-intercambiable.md) | Motor de ruteo intercambiable | Aceptado | `getRoute()` con adaptadores OSRM/Google por `ROUTING_PROVIDER`, caché y respaldo; Google en prod |
| [0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md) | Navegación por proyección sobre la ruta | Aceptado | Seguimiento por proyección sobre la geometría (desvío + avance real) en vez de distancia en línea recta |

## Decisiones implícitas relevantes (candidatas a ADR formal)

Decisiones ya tomadas en el código que conviene formalizar como ADR cuando se revisen:

- **Stack Node/Fastify + Socket.IO + PostGIS + Redis + React/Vite PWA.** Elegido por rendimiento, tiempo real y autohospedaje.
- **PostGIS como fuente de verdad geoespacial + Redis GEO como índice efímero.** Persistencia confiable + consultas "cerca de" rápidas.
- **Migraciones idempotentes al arranque.** Deploy = migrar, sin paso manual.
- **Geocoding con Photon en vez de Nominatim.** Tolerancia a carga en servidor compartido.
- **Gráficos SVG propios en vez de librería de charts.** Bundle liviano y estilo consistente.

## Referencias
- Arquitectura completa: [ARCH-0001](ARCH-0001-arquitectura.md).
- Plantilla y detalle: [docs/adr/README.md](../adr/README.md).
