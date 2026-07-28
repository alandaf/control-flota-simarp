# API-0001 · Especificación de API (guía)

| Campo | Valor |
|-------|-------|
| **Código** | API-0001 |
| **Versión** | 1.0 |
| **Estado** | Aprobado |
| **Dueño** | Ingeniería |
| **Fecha** | 2026-07-27 |
| **Contrato** | [`API-0001-openapi.yaml`](API-0001-openapi.yaml) |

---

## 1. Qué es esto
La especificación **formal** de la API REST de FLOTA en **OpenAPI 3.0** (`API-0001-openapi.yaml`). Es el contrato entre backend y cualquier consumidor (frontend, integraciones de clientes grandes, pruebas automatizadas).

La referencia narrativa (tablas, ejemplos, eventos de socket) está en el [handbook 06 · API](../06-api/README.md); aquí manda el **YAML**.

## 2. Cómo verlo / usarlo

- **Swagger UI / Redoc:** abre el YAML en https://editor.swagger.io (pegar contenido) para navegación interactiva.
- **Postman / Insomnia:** importar el YAML genera la colección.
- **Generación de clientes/SDK:** `openapi-generator` produce clientes TS, Kotlin, etc.
- **Validación en CI (recomendado):**
  ```bash
  npx @redocly/cli lint docs/controlled/API-0001-openapi.yaml
  ```

## 3. Autenticación
`Authorization: Bearer <jwt>`. El token se obtiene en `/api/auth/login` (válido 30 días). Los endpoints con `security: []` son públicos (registro/login).

## 4. Cobertura
El contrato cubre `/api/auth`, `/api/trips`, `/api/geo` y `/api/admin`. Los endpoints de `admin` están declarados con su firma; sus **respuestas detalladas** (analítica) se documentarán a medida que se estabilicen los esquemas de KPIs.

## 5. Tiempo real (fuera de OpenAPI)
OpenAPI no modela WebSocket. El contrato de **Socket.IO** (eventos `driver:location`, `trip:update`, etc.) está en [06 · API — Eventos Socket.IO](../06-api/README.md#eventos-socketio). A futuro se puede formalizar con **AsyncAPI** como documento `API-0002`.

## 6. Versionado del contrato
- Cambios compatibles → subir `info.version` menor.
- Cambios rompientes → nuevo `API-000N` y período de convivencia.

## 7. Pendientes
- Esquemas de respuesta detallados para `/api/admin/analytics`.
- Documento AsyncAPI para el canal de tiempo real.
- Validación del YAML en el pipeline de CI.
