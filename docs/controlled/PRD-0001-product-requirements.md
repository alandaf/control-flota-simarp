# PRD-0001 · Product Requirements Document

| Campo | Valor |
|-------|-------|
| **Código** | PRD-0001 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Dueño** | Producto (SIMARP) |
| **Fecha** | 2026-07-27 |
| **Relacionados** | [ARCH-0001](ARCH-0001-arquitectura.md), [DB-0001](DB-0001-modelo-datos.md), [API-0001](API-0001-README.md), [UX-0001](UX-0001-design-system.md), [ROADMAP-0001](ROADMAP-0001-estrategico-3-anios.md) |

### Historial de cambios
| Versión | Fecha | Autor | Cambio |
|---------|-------|-------|--------|
| 1.0 | 2026-07-27 | Producto | Versión inicial consolidada desde el producto en producción |

---

## 1. Resumen ejecutivo

FLOTA es una plataforma tipo Uber/Cabify **orientada a operadoras de transporte que dan servicio a empresas cliente** (traslado de personal, ejecutivos, turnos). Digitaliza el ciclo completo del servicio —solicitud, asignación, navegación en vivo, cierre y facturación— con tres roles (pasajero, conductor, administrador), rutas reales por calle y un panel de negocio con KPIs.

Está **en producción** (https://flota.simarp.net) como PWA instalable, autohospedada en infraestructura propia. Este PRD define el producto: su alcance, usuarios, requisitos y criterios de aceptación, y sirve de contrato entre producto, ingeniería y negocio.

## 2. Contexto y problema

### 2.1 Situación actual del mercado objetivo
Las operadoras que trasladan personal de empresas suelen coordinar por teléfono, WhatsApp y planillas. Consecuencias:
- **Sin visibilidad en vivo** de la flota → clientes ansiosos, llamadas de "¿dónde va?".
- **Rutas y tiempos poco confiables** → retrasos y sobrecostos.
- **Registro débil del servicio** → facturar a la empresa cliente es lento y disputable.
- **Sin datos del negocio** → no se puede optimizar flota, tarifas ni turnos.

### 2.2 Oportunidad
Ofrecer la experiencia moderna que los pasajeros ya conocen (mapa, ETA, seguimiento) pero con el modelo **B2B2C**: la operadora factura a la empresa cliente, no al pasajero. Ver dimensionamiento en [INV-0001](INV-0001-inversionistas.md).

## 3. Objetivos y métricas de éxito

### 3.1 Objetivos de producto
1. Que un viaje se solicite, asigne, ejecute y cierre **sin llamadas telefónicas**.
2. Que el pasajero tenga **ETA y seguimiento en vivo** confiables.
3. Que la operadora pueda **facturar por empresa** con datos íntegros.
4. Que la administración vea el **estado del negocio** en un panel.

### 3.2 Métricas (North Star y de apoyo)
| Métrica | Definición | Meta inicial |
|---------|-----------|--------------|
| **North Star: viajes completados/semana** | `trips` en `completed` por semana | Crecimiento sostenido |
| Tasa de finalización | completados / solicitados | > 90% |
| Precisión de ETA | |ETA − real| en minutos | < 3 min mediana |
| Tiempo de asignación | request → accepted | < 60 s mediana |
| Rutas "reales" | rutas con `routed=true` | > 98% |
| Adopción admin | uso semanal del dashboard | Semanal |

> Nota: la instrumentación de estas métricas es un pendiente del [ROADMAP-0001](ROADMAP-0001-estrategico-3-anios.md); hoy se derivan de consultas al panel de analítica.

## 4. Usuarios y personas

| Persona | Rol | Necesidad principal | Dolor que resolvemos |
|---------|-----|---------------------|----------------------|
| **Paula, pasajera** | `passenger` | Llegar puntual, saber cuándo llega su auto | Incertidumbre, llamadas |
| **Diego, conductor** | `driver` | Recibir viajes y navegar sin apps externas | Coordinación manual, navegación aparte |
| **Andrés, administrador** | `admin` | Controlar flota, tarifas y facturar | Planillas, falta de datos |
| **Empresa cliente** | (facturación) | Servicio medible y reportes | Opacidad del servicio |

## 5. Alcance

### 5.1 Dentro de alcance (v1, en producción)
- Autenticación por rol y sesión (JWT).
- Solicitud de viaje con estimación de distancia/tiempo/tarifa.
- Ruteo real por calle (motor intercambiable OSRM/Google).
- Asignación y ciclo de estados del viaje en tiempo real.
- Navegación giro a giro con voz y recálculo por desvío.
- Seguimiento en vivo del conductor por el pasajero (con ETA).
- Panel admin: dashboard, mapa en vivo, reportes con export, CRUD de usuarios/vehículos/empresas, tarifas global y por empresa.
- PWA instalable.

### 5.2 Fuera de alcance (v1)
- Pasarela de pagos y cobro al pasajero.
- Facturación electrónica (folio/DTE/SII).
- Portal de autoservicio para la empresa cliente.
- App nativa en tiendas.
- Reservas programadas / recurrentes.

Estos ítems se priorizan en [ROADMAP-0001](ROADMAP-0001-estrategico-3-anios.md).

## 6. Requisitos funcionales

Nomenclatura: **RF-área-n**. Cada uno con criterio de aceptación (CA).

### 6.1 Autenticación (RF-AUTH)
- **RF-AUTH-1** Registro de pasajero/conductor.
  - *CA:* email único; contraseña ≥ 6; devuelve token válido 30 días. (`POST /api/auth/register`)
- **RF-AUTH-2** Login por email/clave.
  - *CA:* credenciales válidas → token + datos de usuario; inválidas → 401/400 sin filtrar cuál campo falló.
- **RF-AUTH-3** Enrutado por rol tras iniciar sesión.
  - *CA:* pasajero→`/`, conductor→`/driver`, admin→`/admin`.

### 6.2 Viaje — pasajero (RF-PAX)
- **RF-PAX-1** Fijar origen y destino (buscador, tocar mapa o arrastrar pin).
  - *CA:* el pin refleja la coordenada elegida; el reverse-geocoding muestra dirección legible.
- **RF-PAX-2** Estimar viaje antes de pedir.
  - *CA:* muestra distancia, minutos y tarifa; la ruta se dibuja sólida si `routed=true`. (`POST /api/trips/estimate`)
- **RF-PAX-3** Solicitar viaje.
  - *CA:* crea `trip` en `requested`, calcula tarifa, notifica a conductores en línea. (`POST /api/trips/request`)
- **RF-PAX-4** Ver conductor en vivo con ETA.
  - *CA:* la posición del conductor se actualiza en el mapa; se muestra "llega en ~X min".
- **RF-PAX-5** Cancelar viaje activo.
  - *CA:* pasa a `cancelled`, libera al conductor. (`POST /api/trips/cancel`)
- **RF-PAX-6** Calificar al finalizar.
  - *CA:* score 1–5 persistido. (`POST /api/trips/rate`)
- **RF-PAX-7** Ver historial.
  - *CA:* lista viajes con estado, fecha, tarifa. (`GET /api/trips/history`)

### 6.3 Viaje — conductor (RF-DRV)
- **RF-DRV-1** Ponerse en línea/fuera de línea.
  - *CA:* no puede pasar a offline con viaje activo; refleja `available`/`busy`/`offline`. (`driver:online`)
- **RF-DRV-2** Ver y aceptar solicitudes cercanas.
  - *CA:* lista viajes `requested`; aceptar asigna y avisa al pasajero. (`GET /api/trips/pending`, `POST /api/trips/accept`)
- **RF-DRV-3** Navegar hacia el pasajero (recogida).
  - *CA:* ruta verde conductor→origen, guía giro a giro y voz opcional.
- **RF-DRV-4** Avanzar estados: llegué → iniciar → finalizar.
  - *CA:* transiciones válidas `accepted→arrived→in_progress→completed`. (`POST /api/trips/status`)
- **RF-DRV-5** Navegar al destino (viaje).
  - *CA:* ruta azul origen→destino tras iniciar.
- **RF-DRV-6** Recálculo por desvío.
  - *CA:* si el conductor se aleja > umbral de la ruta, se recalcula (ver [ADR-0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md)).

### 6.4 Tiempo real (RF-RT)
- **RF-RT-1** Ubicación del conductor propagada al pasajero y al admin.
  - *CA:* `driver:location` persiste (PostGIS) + indexa (Redis GEO) + reenvía a sala del viaje y a admins.
- **RF-RT-2** Cambios de estado notificados al usuario correspondiente.
  - *CA:* `trip:update {trip_id,status}` llega a `user:{id}`.
- **RF-RT-3** Respaldo por polling si el socket cae.
  - *CA:* pasajero/conductor refrescan por API periódicamente.

### 6.5 Administración (RF-ADM)
- **RF-ADM-1** Dashboard con KPIs y gráficos. (`GET /api/admin/analytics`)
- **RF-ADM-2** Mapa en vivo de conductores. (`GET /api/admin/drivers_map`)
- **RF-ADM-3** Reporte de viajes con filtros (fecha/estado/conductor/empresa) + export CSV/imprimir. (`GET /api/admin/trips`)
- **RF-ADM-4** CRUD de usuarios (con empresa) y activar/desactivar.
- **RF-ADM-5** CRUD de vehículos y asignación a conductor.
- **RF-ADM-6** CRUD de empresas cliente con tarifas por contrato.
- **RF-ADM-7** Tarifas globales configurables.
  - *CA:* al guardar, se recarga la caché de tarifas.

### 6.6 Geolocalización de direcciones (RF-GEO)
- **RF-GEO-1** Autocompletado de direcciones sesgado al mapa. (`GET /api/geo/search`)
- **RF-GEO-2** Reverse geocoding coordenada→dirección. (`GET /api/geo/reverse`)

### 6.7 Tarificación (RF-FARE)
- **RF-FARE-1** Cálculo `max(mínimo, base + km·per_km + min·per_min)` redondeado a 50 CLP.
- **RF-FARE-2** Tarifa por empresa sobrescribe la global.
- **RF-FARE-3** El viaje guarda `company_id` para historial estable.

## 7. Requisitos no funcionales (RNF)

| Código | Requisito | Objetivo |
|--------|-----------|----------|
| RNF-PERF-1 | Latencia de actualización de ubicación | ≤ 3 s |
| RNF-PERF-2 | Estimación de ruta (con caché) | ≤ 1 s típico |
| RNF-DISP-1 | Disponibilidad del servicio web | ≥ 99% mensual (objetivo) |
| RNF-SEC-1 | Contraseñas con bcrypt, sesión JWT | Obligatorio |
| RNF-SEC-2 | Autorización por rol en endpoints sensibles | Ver [SEC-0001](SEC-0001-seguridad.md) |
| RNF-MOV-1 | PWA instalable, HTTPS, geolocalización | Obligatorio |
| RNF-MOV-2 | Pantalla encendida durante viaje (Wake Lock) | Obligatorio |
| RNF-I18N-1 | Español (CL); reportes en `America/Santiago` | Obligatorio |
| RNF-OBS-1 | Logs de contenedores accesibles | Ver [OPS-0001](OPS-0001-operacion-despliegue.md) |
| RNF-ESC-1 | API escalable horizontalmente (adapter Redis) | Diseñado |

## 8. Flujos y estados

Ciclo de vida del viaje (constraint en BD):
```
requested → accepted → arrived → in_progress → completed
     └────────────── cancelled
```
Diagramas de secuencia y detalle en [ARCH-0001 §Flujos](ARCH-0001-arquitectura.md).

## 9. Reglas de negocio

1. Un conductor **no** puede quedar offline con viaje activo.
2. La tarifa se **congela** al crear el viaje (con la tarifa vigente del pasajero/empresa).
3. Un pasajero pertenece a **una** empresa (opcional); el viaje factura a esa empresa.
4. Un usuario admin **no** puede auto-eliminarse.
5. Rutas fuera de cobertura degradan a línea recta (`routed=false`) y se marcan visualmente.

## 10. Dependencias externas
- **Ruteo:** OSRM self-hosted / Google Directions API ([ADR-0002](../adr/0002-motor-de-ruteo-intercambiable.md)).
- **Geocoding:** Photon (Komoot).
- **Mapa:** Leaflet + OSM/CARTO.
Detalle y riesgos en [09 · Integrations](../09-integrations/README.md).

## 11. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Calidad de datos OSM en zonas específicas | Rutas subóptimas | Motor Google + arrastrar pin |
| Costo de Google Directions al escalar | Costo variable | Caché + fallback OSRM + monitoreo de uso |
| Falta de rate limiting en login | Seguridad | Agregar rate limiting en `/api/auth/*` (SEC/roadmap) |
| Sin log de auditoría de acciones admin | Trazabilidad | Agregar `trip_events` + log de admin (SEC/roadmap) |
| Dependencia de un VPS compartido | Disponibilidad | Backups + plan de aislamiento (OPS/roadmap) |
| Pérdida de datos por volumen mal manejado | Alto | Procedimiento de backup y cuidado con volúmenes |

## 12. Criterios de lanzamiento (Definition of Done a nivel producto)
- Los tres roles completan su flujo principal sin errores en dispositivo real.
- ETA y recálculo verificados en calle.
- Tarifas y facturación por empresa reflejadas en reportes.
- Documentación controlada actualizada.

## 13. Preguntas abiertas
- ¿El cobro será a empresa por período o por viaje?
- ¿Se requiere facturación electrónica (SII) desde v2?
- ¿Reservas programadas entran en el alcance 2026?

## 14. Anexos
- Glosario: [handbook/glosario](../docs/glosario.md).
- Referencia de API: [API-0001](API-0001-README.md).
- Este PRD está pensado para **crecer**: cada RF puede expandirse a su propia especificación de detalle (wireframes, edge cases, criterios de prueba) manteniendo el código `RF-*`.
