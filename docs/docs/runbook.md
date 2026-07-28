# Runbook operativo

Guía práctica para operar Control Flota en producción (VPS + Portainer).

## Actualizar la app (deploy)

1. Push a `main` en GitHub (`alandaf/control-flota-simarp`).
2. En **Portainer** → *Stacks* → `control-flota` → **Pull and redeploy**.
   - Un **504** durante ~1–3 min es normal mientras se reconstruye.
3. En el celular: **hard-refresh** (Ctrl+Shift+R) o cerrar y reabrir la PWA (por el service worker).

## Cambiar variables de entorno

En Portainer → stack → **Environment variables** → editar → **Save** → **Pull and redeploy**.
Variables clave: `ROUTING_PROVIDER`, `GOOGLE_MAPS_API_KEY`, `POSTGRES_PASSWORD`, `JWT_SECRET`, `WEB_BIND`.

## Cambiar el motor de ruteo

- Google: `ROUTING_PROVIDER=google` + `GOOGLE_MAPS_API_KEY=<key>`.
- OSRM: `ROUTING_PROVIDER=osrm`.
- Redeploy. Si Google falla, cae solo a OSRM.

## Diagnóstico rápido

```bash
# ¿Responde la web?
curl -s -o /dev/null -w "%{http_code}\n" https://flota.simarp.net/

# ¿Responde la API? (400 con cuerpo inválido = viva)
curl -s -X POST https://flota.simarp.net/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"x","password":"y"}'

# Estado de contenedores (en el VPS)
docker ps --format '{{.Names}}\t{{.Status}}'

# Logs de la API
docker logs --tail 100 flota_api
```

## Problemas conocidos y solución

| Síntoma | Causa | Solución |
|---------|-------|----------|
| "No veo mi cambio" tras deploy | Service worker sirve JS viejo | Hard-refresh / reabrir PWA |
| DB *unhealthy* en Portainer | Volumen viejo con nombre de DB distinto | Recrear stack + volumen limpio (¡respaldar antes!) |
| Rutas en línea recta | Motor de ruteo caído | Revisar `flota_osrm` / key de Google; hay respaldo automático |
| Búsqueda de direcciones vacía | Photon con `lang=es` (400) | Debe ser `lang=default` (ya corregido) |
| Voz no suena en iPhone | Requiere gesto / switch de silencio | Tocar 🔊; revisar el switch físico |
| Puerto 8080 ocupado tras reinicio de Docker | Contenedor `flota_web` colgado | `docker rm -f flota_web` y recrear |

## OSRM (operación)

- Contenedor `flota_osrm` (fuera del stack), datos en `/opt/flota-osrm`, extracto de Valparaíso.
- Preprocesar/actualizar datos: `scripts/osrm-prepare.sh` (usar límites de memoria en VPS chico).
- El VPS es de 4 GB y estuvo ajustado: se añadió swap (`/swapfile2`) y se limpió build cache (`docker system prune`).

## Respaldo de base de datos

```bash
docker exec flota_db pg_dump -U $POSTGRES_USER $POSTGRES_DB > flota_$(date +%F).sql
```

## Contactos / notas privadas

Credenciales y notas de despliegue en `_privado/NOTAS-DESPLIEGUE.md` (gitignored, fuera del repo público).
