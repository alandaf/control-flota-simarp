# ADR-0001 · Despliegue detrás del nginx del host (sin Caddy)

- **Estado:** Aceptado
- **Fecha:** 2026-07-26

## Contexto

El VPS (91.99.175.78) es **compartido** con varias apps en producción (`*.simarp.net`) y ya tiene un **nginx en el host** ocupando 80/443 como proxy TLS de todas. Los puertos 8080/8090/8443 también están usados. El `docker-compose` original traía un servicio **Caddy** que quería tomar 80/443 para gestionar TLS por su cuenta.

## Decisión

- **No** usar Caddy en este VPS (queda como perfil `edge` opcional para entornos donde no haya proxy).
- El servicio **web** publica solo en **loopback**: `127.0.0.1:8095` (puerto libre verificado en la auditoría del VPS).
- El **nginx del host** enruta `flota.simarp.net` → `127.0.0.1:8095`, con soporte de WebSocket (`Upgrade`/`Connection`).
- TLS con **certbot snap** (el `certbot` de apt estaba roto: "No module named 'can'").

## Consecuencias

**Positivas**
- Convive con las demás apps del VPS sin conflicto de puertos.
- Un único punto de gestión TLS (el nginx del host).
- Menos superficie: `db`/`redis`/`api`/`osrm` sin puertos al host.

**Negativas / costos**
- El despliegue depende de la config del host (`deploy/nginx-flota.simarp.net.conf`), no es 100% autocontenido en el compose.
- Cambiar `WEB_BIND` exige actualizar también el nginx del host.
