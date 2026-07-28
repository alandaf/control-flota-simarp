# 📚 Documentación — Control Flota

Documentación viva del proyecto **Control Flota**: plataforma tipo Uber/Cabify para gestión de flota de transporte, con tres roles (pasajero, conductor, administrador), rutas reales por calle y facturación a empresas cliente.

> **En producción:** https://flota.simarp.net

## Dos capas de documentación

- 📗 **[Documentos controlados](controlled/README.md)** — la capa **formal y canónica** (PRD, ROADMAP, ADR, ARCH, DB, API/OpenAPI, UX, SEC, OPS, INV). Para incorporar equipo, presentar a clientes grandes y respaldar inversión. **Cuando ambos hablen del mismo tema, manda el documento controlado.**
- 📘 **Handbook (abajo, 00–10)** — la capa **operativa/rápida** que alimenta a los controlados.

## Cómo está organizada

Cada carpeta es una vista distinta del mismo producto. Empieza por **00 → 02** para entender el "qué" y el "cómo" a alto nivel; baja a **04 → 09** para el detalle técnico.

| # | Carpeta | Para qué sirve | Audiencia |
|---|---------|----------------|-----------|
| 00 | [Vision](00-vision/README.md) | Propósito, problema, propuesta de valor | Todos |
| 01 | [Product](01-product/README.md) | Roles, casos de uso, flujos, requisitos | Producto / negocio |
| 02 | [Architecture](02-architecture/README.md) | Diagrama de sistema, componentes, datos en vivo | Ingeniería |
| 03 | [UX-UI](03-ux-ui/README.md) | Principios de diseño, pantallas, patrones móviles | Diseño / front |
| 04 | [Backend](04-backend/README.md) | API Node/Fastify, sockets, dominio, tareas | Backend |
| 05 | [Mobile](05-mobile/README.md) | PWA, geolocalización, wake lock, voz, offline | Front / QA |
| 06 | [API](06-api/README.md) | Referencia de endpoints REST + eventos Socket.IO | Integradores |
| 07 | [Database](07-database/README.md) | Esquema PostgreSQL/PostGIS, migraciones | Backend / DBA |
| 08 | [Security](08-security/README.md) | Auth JWT, roles, secretos, superficie expuesta | Seguridad |
| 09 | [Integrations](09-integrations/README.md) | Ruteo (OSRM/Google), geocoding, Redis GEO | Ingeniería |
| 10 | [Roadmap](10-roadmap/README.md) | Estado actual y próximos pasos | Todos |
| — | [ADR](adr/README.md) | Decisiones de arquitectura registradas | Ingeniería |
| — | [Docs](docs/README.md) | Runbook operativo, glosario, guía de contribución | Operaciones |

## Documentos de referencia rápida en la raíz del repo

- [`README.md`](../README.md) — arranque local
- [`DEPLOY.md`](../DEPLOY.md) — despliegue en el VPS
- [`docker-compose.yml`](../docker-compose.yml) / [`docker-compose.prod.yml`](../docker-compose.prod.yml)

## Convenciones

- Los documentos referencian archivos reales con su ruta (ej. `apps/api/src/routing.ts`) para que la doc y el código no se separen.
- Al cambiar una decisión de arquitectura, se agrega un **ADR** nuevo (no se reescribe el anterior).
- Fechas en formato absoluto. Última revisión general: **julio 2026**.
