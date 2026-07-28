# 08 · Seguridad

## Autenticación

- Contraseñas con **bcrypt** (`bcryptjs`), nunca en texto plano (`apps/api/src/auth.ts`).
- Sesión con **JWT** firmado (`@fastify/jwt`), expiración 30 días, secreto en `JWT_SECRET`.
- El mismo JWT autentica el **handshake de Socket.IO** (`apps/api/src/sockets.ts`); sin token válido, no hay conexión en vivo.

## Autorización por rol

- `authGuard(role?)` protege endpoints (`apps/api/src/auth.ts`).
- Ejemplos: `authGuard('passenger')` en pedir viaje, `authGuard('driver')` en aceptar.
- En sockets, cada handler valida el rol (`if (user.role !== 'driver') return`).

- **`/api/admin`:** todo el grupo está protegido con `authGuard('admin')` mediante un hook de plugin (`apps/api/src/routes/admin.routes.ts:9`), no con guardas por handler. Cubre cada ruta admin.

## Superficie expuesta

- Solo el servicio **web** publica puerto al host, y **atado a loopback** (`127.0.0.1:8095`); el nginx del host es el único que habla con él.
- `db`, `redis`, `api` y `osrm` viven en la red interna de Docker, **sin** puertos al host.
- TLS lo termina el **nginx del host** con certificado de Let's Encrypt (**certbot snap**).

## Secretos

- Viven en `.env.prod` (gitignored) y en las variables de entorno del stack en **Portainer**. Nunca en el repo.
- Notas y credenciales operativas del despliegue en `_privado/` (gitignored).
- Variables sensibles: `POSTGRES_PASSWORD`, `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`.
- La **API key de Google** está **restringida por IP** del VPS y limitada a *Directions API* en Google Cloud.

### Regla de operación
Al pegar salida de comandos del VPS, **omitir** cualquier secreto. El asistente **no** recibe ni gestiona credenciales del VPS; el operador ejecuta los comandos.

## Validación de entrada

- Todo endpoint valida el cuerpo con **zod** antes de tocar la base.
- Las consultas usan **parámetros** (`$1, $2, …`) — sin concatenar SQL (previene inyección).

## Datos personales

- Se guardan nombre, email y teléfono de usuarios. Mínimo necesario para operar.
- Las posiciones de conductores se persisten (`drivers.location`) y se indexan efímeramente en Redis.
- Recomendación futura: política de retención para ubicaciones históricas y viajes completados.

## Checklist de endurecimiento (siguiente iteración)

- [x] `authGuard('admin')` en todo `/api/admin` — ya implementado (hook de plugin).
- [x] CORS acotado al dominio de producción — ya configurado (`CORS_ORIGIN=https://flota.simarp.net`).
- [ ] Rate limiting en `/api/auth/login` y `/api/auth/register`.
- [ ] Rotación del `JWT_SECRET` documentada.
- [ ] Política de retención/anonimización de ubicaciones.
