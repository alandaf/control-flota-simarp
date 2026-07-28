# OPS-0001 · Operación y despliegue

| Campo | Valor |
|-------|-------|
| **Código** | OPS-0001 |
| **Versión** | 1.0 |
| **Estado** | Aprobado |
| **Dueño** | Operaciones / Ingeniería |
| **Fecha** | 2026-07-27 |
| **Fuente** | `docker-compose.prod.yml`, `deploy/`, `scripts/`, `DEPLOY.md` |

---

## 1. Topología de despliegue

```
GitHub (alandaf/control-flota-simarp)
        │  push a main
        ▼
Portainer (VPS) ── Stack "control-flota" (docker-compose.prod.yml)
        │
   nginx del host (80/443, TLS certbot) ── flota.simarp.net ─▶ 127.0.0.1:8095 (web)
        │
   Red interna Docker: web ─ api ─ db ─ redis ─ (osrm)
```

- **VPS:** 91.99.175.78 = `flota.simarp.net`. 4 GB RAM, **compartido** con otras apps `*.simarp.net`.
- **Puertos:** solo `web` en loopback `127.0.0.1:8095` (8080/8090/8443 ocupados por otras apps).
- **OSRM:** contenedor `flota_osrm` (corre con `docker run`, fuera del stack) en la red `control-flota_default`, datos en `/opt/flota-osrm`.

## 2. Servicios (compose de producción)
| Servicio | Imagen | Notas |
|----------|--------|-------|
| db | `postgis/postgis:16-3.4` | healthcheck `pg_isready`, `start_period` amplio |
| redis | `redis:7-alpine` | healthcheck `redis-cli ping` |
| api | build `apps/api` | depende de db/redis healthy |
| web | build `apps/web` | `127.0.0.1:${WEB_BIND:-8095}:80` |
| osrm | perfil `routing` | extracto Valparaíso (o contenedor externo) |
| caddy | perfil `edge` | **no** usado en este VPS (ver [ADR-0001](../adr/0001-deploy-detras-de-nginx-host.md)) |

## 3. Procedimiento de despliegue
1. `git push` a `main`.
2. Portainer → Stack `control-flota` → **Pull and redeploy** (504 transitorio ~1–3 min es normal).
3. Cliente: **hard-refresh** o reabrir PWA (service worker).

Variables de entorno: Portainer → stack → Environment. Ver `.env.prod.example`. Claves: `POSTGRES_*`, `JWT_SECRET`, `WEB_BIND`, `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `OSRM_URL`.

## 4. TLS / dominio
- Certificado Let's Encrypt con **certbot snap** (el de apt estaba roto: "No module named 'can'").
- El nginx del host enruta el vhost con soporte WebSocket (`Upgrade`/`Connection`). Config en `deploy/nginx-flota.simarp.net.conf`.

## 5. OSRM (operación)
- Preprocesar datos: `scripts/osrm-prepare.sh` (workaround MSYS en Git Bash/Windows).
- En VPS chico: usar límites de memoria (`--memory`) al preprocesar; se añadió swap (`/swapfile2`) y se limpió build cache (`docker system prune`) cuando el disco llegó a 91%.

## 6. Observabilidad
- **Actual:** logs por contenedor (`docker logs`, Portainer), healthchecks de db/redis.
- **Pendiente:** métricas de negocio instrumentadas, alertas de caída/uso, monitoreo de costo de Google. Ver [ROADMAP-0001 H1](ROADMAP-0001-estrategico-3-anios.md).

## 6.1 Integración continua (CI)
- **GitHub Actions** (`.github/workflows/ci.yml`) corre en cada push/PR a `main`:
  - **api:** `npm install` → `npm test` (vitest) → `npm run build` (tsc).
  - **web:** `npm install` → `npm run build` (tsc + vite).
  - **openapi:** lint del contrato con `@redocly/cli` (informativo).
- **Tests:** `apps/api/src/*.test.ts` (vitest). Cubren la lógica pura crítica: cálculo de tarifa (`fare.ts`) y ruteo (`decodePolyline`, `googleManeuver`). Correr local: `cd apps/api && npm test`.

## 7. SLO objetivo (propuesto)
| Indicador | Objetivo |
|-----------|----------|
| Disponibilidad web | ≥ 99% mensual |
| Latencia ubicación | ≤ 3 s |
| Tiempo de recuperación (deploy) | < 5 min |

## 8. Backups y recuperación
```bash
# Backup diario (cron recomendado en el VPS)
docker exec flota_db pg_dump -U $POSTGRES_USER $POSTGRES_DB > /backups/flota_$(date +%F).sql
# Restore
cat /backups/flota_YYYY-MM-DD.sql | docker exec -i flota_db psql -U $POSTGRES_USER $POSTGRES_DB
```
- **Regla crítica:** nunca borrar el **volumen** de datos al recrear el stack (ya ocurrió una pérdida por nombre de DB equivocado).
- **Pendiente:** automatizar backups + retención + copia fuera del VPS.

## 9. Runbook de incidentes
| Síntoma | Diagnóstico | Acción |
|---------|-------------|--------|
| Web caída | `curl -o /dev/null -w '%{http_code}' https://flota.simarp.net/` | Revisar `flota_web`/nginx host |
| API caída | login devuelve error de red | `docker logs flota_api`; revisar db/redis healthy |
| DB unhealthy | Portainer marca unhealthy | Volumen/nombre DB; recrear con cuidado (backup antes) |
| Rutas en línea recta | Motor caído | Revisar `flota_osrm` / key Google; hay fallback |
| "No veo mi cambio" | SW cacheado | Hard-refresh / reabrir PWA |
| Puerto 8080 ocupado tras reinicio Docker | Contenedor colgado | `docker rm -f flota_web` y recrear |
| Búsqueda vacía | Photon `lang=es` (400) | Debe ser `lang=default` (corregido) |

## 10. Diagnóstico rápido
```bash
docker ps --format '{{.Names}}\t{{.Status}}'
docker logs --tail 100 flota_api
curl -s -X POST https://flota.simarp.net/api/auth/login -H 'Content-Type: application/json' -d '{"email":"x","password":"y"}'
```

## 11. Mejoras de operación (roadmap)
- Backups automáticos + off-site.
- VPS **dedicado** o aislamiento (reduce riesgo del entorno compartido).
- CI: build de imágenes + lint de OpenAPI + `npm audit`.
- Métricas/alertas.

Notas privadas de despliegue (credenciales): `_privado/NOTAS-DESPLIEGUE.md` (fuera del repo).
