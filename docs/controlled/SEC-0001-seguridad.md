# SEC-0001 · Seguridad, permisos y auditoría

| Campo | Valor |
|-------|-------|
| **Código** | SEC-0001 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Dueño** | Seguridad / Ingeniería |
| **Fecha** | 2026-07-27 |

---

## 1. Alcance
Modelo de seguridad de FLOTA: autenticación, autorización, protección de datos, superficie de ataque, y el plan de endurecimiento. Amplía el [handbook 08](../08-security/README.md).

## 2. Identidad y autenticación
- **Contraseñas:** hash **bcrypt** (`bcryptjs`), nunca en claro (`apps/api/src/auth.ts`).
- **Sesión:** **JWT** firmado (`@fastify/jwt`), expiración 30 días, payload `{ id, name, email, role }`. Secreto en `JWT_SECRET`.
- **Tiempo real:** el mismo JWT valida el **handshake de Socket.IO**; sin token válido no hay conexión (`apps/api/src/sockets.ts`).

## 3. Autorización (RBAC)
- `authGuard(role?)` como `preHandler` (`apps/api/src/auth.ts`).
- Roles: `passenger`, `driver`, `admin`, `company` (portal de empresa, solo lectura).
- **`/api/company`:** todo el grupo protegido con `authGuard('company')` (hook de plugin); cada endpoint resuelve el `company_id` del usuario y filtra por él, de modo que un usuario de empresa solo ve los datos de SU empresa.
- En sockets, cada handler verifica el rol antes de actuar.
- **`/api/trips`:** guardas por rol en cada endpoint (`authGuard('passenger')` / `authGuard('driver')`).
- **`/api/admin`:** ✅ **todo el grupo** está protegido con `authGuard('admin')` mediante un hook a nivel de plugin (`apps/api/src/routes/admin.routes.ts:9`: `app.addHook('preHandler', authGuard('admin'))`), aplicado al registrarse con prefijo `/api/admin` (`index.ts:33`). En Fastify el hook queda encapsulado al scope del plugin, por lo que cubre cada ruta admin, presente y futura.

> Nota de revisión (2026-07-27): una versión previa de este documento marcaba `/api/admin` como "hallazgo abierto". Fue un **falso positivo**: los handlers no llevan `authGuard` individual porque la protección está en el hook de plugin. Verificado en código.

## 4. Protección de datos
- **En tránsito:** HTTPS (TLS del nginx del host, certbot).
- **En reposo:** credenciales hasheadas; datos en volumen de Docker.
- **Secretos:** en `.env.prod` (gitignored) y variables de Portainer; nunca en el repo. Notas privadas en `_privado/` (gitignored).
- **Google API key:** restringida por **IP del VPS** y a *Directions API*.

### Regla operativa
El asistente/operador **no** transmite secretos: al pegar salidas de comandos del VPS se omiten credenciales.

## 5. Validación e inyección
- Toda entrada validada con **zod** (`safeParse`) antes de tocar la base.
- **SQL siempre parametrizado** (`$1,$2,…`) — sin concatenación (previene SQLi).
- IDs y coordenadas tipados; enumeraciones acotadas por `CHECK` en BD.

## 6. Superficie de ataque
| Vector | Estado |
|--------|--------|
| Puertos expuestos | Solo `web` en `127.0.0.1:8095`; db/redis/api/osrm internos |
| CORS | ✅ En prod acotado a `https://flota.simarp.net` (`CORS_ORIGIN`, `docker-compose.prod.yml:56`). El reflejo abierto (`*`) solo se activa manualmente para túneles de prueba |
| Fuerza bruta login | ✅ **Rate limiting** activo: `@fastify/rate-limit` en `/api/auth/login` y `/register` (10 intentos/min por IP, store en Redis → vale entre instancias). Excedido → 429 |
| Enumeración de usuarios | Login devuelve error genérico (bien) |
| Tokens robados | Expiran a 30 días; sin revocación → evaluar refresh/blacklist |

## 7. Auditoría y trazabilidad
- ✅ **Bitácora de acciones admin** (`005_audit.sql`, tabla `audit_log`): registra actor, acción, entidad y detalle de cada mutación de administración (usuarios, tarifas, empresas, vehículos, facturación). Se consulta en `GET /api/admin/audit` y en la pestaña **Auditoría** del admin.
- Marcas de tiempo del ciclo de viaje (`requested/accepted/started/completed_at`) y `updated_at` en conductores.
- **Pendiente:** tabla `trip_events` (historial de cada cambio de estado de viaje, más granular).
- **Logs:** de contenedores vía Docker/Portainer (ver [OPS-0001](OPS-0001-operacion-despliegue.md)).

## 8. Privacidad
- Datos personales mínimos (nombre, email, teléfono).
- **Ubicaciones** de conductores persistidas + indexadas en Redis.
- **Pendiente:** política de retención/anonimización de ubicaciones históricas y viajes completados; base legal y consentimiento.

## 9. Modelo de amenazas (resumen STRIDE)
| Amenaza | Ejemplo | Control |
|---------|---------|---------|
| **S**poofing | Suplantar usuario | JWT firmado, bcrypt |
| **T**ampering | Alterar viaje ajeno | Autorización por rol/propietario (reforzar en admin) |
| **R**epudiation | Negar una acción | ✅ Bitácora `audit_log` de acciones admin + marcas de tiempo |
| **I**nfo disclosure | Fuga de datos/secretos | HTTPS, secretos fuera del repo, superficie mínima |
| **D**enial of service | Flood a login/ruteo | ✅ Rate limiting en auth (429); caché de ruteo ayuda |
| **E**levation | No-admin usa admin | ✅ Mitigado: `authGuard('admin')` a nivel de plugin (§3) |

## 10. Checklist de endurecimiento (H1)
- [x] `authGuard('admin')` en todo `/api/admin` — ✅ ya implementado (hook de plugin).
- [x] CORS restringido al dominio de producción — ✅ ya configurado en prod.
- [x] Rate limiting en `/api/auth/*` — ✅ implementado (`@fastify/rate-limit`, 10/min, Redis).
- [x] Log de auditoría de acciones admin — ✅ implementado (`audit_log` + pestaña Auditoría).
- [ ] `trip_events` (historial granular de estados de viaje).
- [ ] Política de retención de ubicaciones.
- [ ] Procedimiento documentado de rotación de `JWT_SECRET` y claves.
- [x] Que el seed **no** cree cuentas con clave conocida en producción — ✅ hecho: en prod el admin usa `SEED_ADMIN_PASSWORD` (o clave aleatoria impresa una vez); sin cuentas demo.
- [ ] Deshabilitar/borrar las cuentas demo (`pasajero@`, `conductor@`, `marta@`) que quedaron de un seed anterior en producción.
- [ ] Revisión de dependencias (`npm audit`) en CI.

## 11. Respuesta a incidentes
Procedimiento base y contactos en [OPS-0001 §Incidentes](OPS-0001-operacion-despliegue.md). Ante compromiso de `JWT_SECRET`: rotar secreto (invalida sesiones), revisar accesos, y comunicar.
