# Guía de contribución

## Estructura del repo

```
control_flota/
├── apps/
│   ├── api/            # Backend Node/Fastify (TS, ESM)
│   │   ├── src/
│   │   └── migrations/ # SQL idempotente que corre al arrancar
│   └── web/            # Front React/Vite (PWA)
│       └── src/
├── deploy/             # Config del nginx del host
├── scripts/            # osrm-prepare.sh, etc.
├── docs/               # Esta documentación
├── docker-compose.yml        # Desarrollo
└── docker-compose.prod.yml   # Producción
```

## Desarrollo local

```bash
docker compose up --build
```

Levanta `db`, `redis`, `api`, `web` (y `osrm` si el perfil está activo). Las migraciones y el seed corren solos.

## Convenciones de código

- **TypeScript estricto.** En el backend (ESM) los imports internos llevan extensión **`.js`** (ej. `import { env } from './env.js'`).
- **Validación** de toda entrada con **zod** antes de tocar la base.
- **SQL parametrizado** siempre (`$1, $2, …`), nunca concatenación.
- Respuestas API con forma `{ ok: true, ... }` / `{ ok: false, error }`.
- Comentarios en español, alineados al estilo del archivo.

## Base de datos

- Cambios de esquema = **nueva** migración `apps/api/migrations/NNN_*.sql`, idempotente. No editar migraciones ya aplicadas.

## Verificar antes de subir

```bash
# Compilar la web como lo hace producción (valida TypeScript)
docker build -f apps/web/Dockerfile -t flota-web-check apps/web

# Compilar la API
docker build -f apps/api/Dockerfile -t flota-api-check apps/api
```

## Commits y deploy

- Mensajes de commit descriptivos, en español, con prefijo tipo `feat:` / `fix:` / `docs:`.
- Push a `main` → deploy manual desde **Portainer** (Pull and redeploy). Ver [runbook](runbook.md).

## Decisiones de arquitectura

Si tu cambio altera una decisión de diseño (motor de ruteo, despliegue, navegación…), agrega un **[ADR](../adr/README.md)** nuevo describiendo contexto, decisión y consecuencias.

## Seguridad

- Nunca commitear secretos. Van en `.env.prod` (gitignored) y variables de Portainer.
- No incluir credenciales del VPS en el repo ni en salidas pegadas.
