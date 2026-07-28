# ROADMAP-0001 · Roadmap estratégico a 3 años

| Campo | Valor |
|-------|-------|
| **Código** | ROADMAP-0001 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Dueño** | Producto / Fundadores |
| **Fecha** | 2026-07-27 |
| **Horizonte** | 2026 H2 – 2029 |

### Historial
| Versión | Fecha | Cambio |
|---------|-------|--------|
| 1.0 | 2026-07-27 | Versión inicial |

---

## 1. Visión a 3 años

> De una operadora de flota digitalizada a la **plataforma de referencia para transporte corporativo** en Chile: servicio medible, facturación automática y datos que optimizan la operación.

## 2. Marco de horizontes

Usamos el modelo de 3 horizontes:

- **H1 — Consolidar (0–12 meses):** cerrar el ciclo comercial (facturación) y endurecer la base (seguridad, operación).
- **H2 — Escalar (12–24 meses):** multi-operadora, autoservicio del cliente, pagos.
- **H3 — Expandir (24–36 meses):** inteligencia operativa, integraciones y nuevos mercados/segmentos.

## 3. Estado base (punto de partida, 2026 H2)

✅ Producto en producción con 3 roles, ruteo real intercambiable, tiempo real, navegación con recálculo y voz, dashboard de negocio, tarifas y empresas, PWA. Ver [PRD-0001](PRD-0001-product-requirements.md).

Brechas conocidas: facturación no cerrada, sin rate limiting ni log de auditoría, sin instrumentación de métricas, backups no automatizados, VPS compartido.

## 4. Horizonte 1 — Consolidar (2026 H2 – 2027 H1)

### Épicas
| Épica | Resultado esperado | Referencia |
|-------|--------------------|-----------|
| **Facturación B2B** | Folio por servicio, estado pagado/pendiente, reporte por empresa/período | PRD §5.2 |
| **Portal empresa cliente** | Login del cliente para ver sus servicios y montos | PRD §4 |
| **Endurecimiento de seguridad** | ✅ **Hecho** — rate limiting en login (429) + bitácora de auditoría (`authGuard('admin')` y CORS ya estaban) | [SEC-0001](SEC-0001-seguridad.md) |
| **Observabilidad** | Instrumentar North Star y KPIs; alertas de salud | [OPS-0001](OPS-0001-operacion-despliegue.md) |
| **Backups y aislamiento** | Backups automáticos; plan de VPS dedicado | OPS |

### Hitos por trimestre
- **2026 Q3:** folio + estado de facturación; endurecer admin; backups automáticos.
- **2026 Q4:** reporte de facturación por empresa/período; instrumentación de métricas.
- **2027 Q1:** portal de empresa cliente (solo lectura de sus servicios).

### Métricas objetivo H1
- Tasa de finalización > 90%; tiempo de asignación < 60 s.
- Rate limiting activo en autenticación; log de auditoría de acciones admin.
- Cierre de facturación mensual sin planillas externas.

## 5. Horizonte 2 — Escalar (2027 H2 – 2028 H1)

| Épica | Resultado |
|-------|-----------|
| **Multi-operadora (multi-tenant)** | Varias operadoras aisladas en una instancia |
| **Pagos** | Pasarela y/o cobro programado a empresas |
| **Reservas programadas/recurrentes** | Turnos y traslados recurrentes |
| **Notificaciones push** | Web push para solicitudes y estados |
| **App-shell offline** | Operación tolerante a mala señal |

Métricas: > N operadoras activas; > X% de viajes reservados con antelación; churn de empresa cliente bajo.

## 6. Horizonte 3 — Expandir (2028 H2 – 2029)

| Épica | Resultado |
|-------|-----------|
| **Inteligencia operativa** | Predicción de demanda, sugerencia de turnos, optimización de flota |
| **Facturación electrónica (SII/DTE)** | Emisión automática de documentos tributarios |
| **Integraciones** | ERP/RRHH del cliente, exportación contable |
| **Nuevos segmentos** | Escolar, salud, logística ligera |
| **Expansión geográfica** | Otras ciudades/países con extractos de mapa propios |

## 7. Temas transversales (todo el horizonte)
- **Calidad de ruteo:** ajuste continuo de umbrales, evaluación de mapa Google/tráfico.
- **Escalabilidad:** ya diseñada con adapter Redis; validar bajo carga real.
- **Cumplimiento:** política de retención de ubicaciones; privacidad de datos.
- **Documentación viva:** mantener los documentos controlados al día.

## 8. Principios de priorización
1. Desbloquear **ingresos** (facturación, pagos).
2. Reducir **riesgo** (seguridad, backups, aislamiento).
3. Mejorar **experiencia** (navegación, offline, push).
4. Habilitar **escala** (multi-tenant, integraciones).

## 9. Dependencias y supuestos
- Disponibilidad de presupuesto para VPS dedicado y costos de Google.
- Al menos una operadora ancla como cliente de referencia.
- Equipo de desarrollo incremental (ver [INV-0001](INV-0001-inversionistas.md) §uso de fondos).

> Este roadmap es **direccional**, no un compromiso de fechas fijas. Se revisa cada trimestre.

## 10. Reconciliación con la propuesta de 8 fases

Se recibió una propuesta externa (`docs/FLOTA_Product_Roadmap_v1.0.md`, ahora marcada como reemplazada por este documento). Aporta buena visión de largo plazo, pero **subestima lo ya construido**. Mapeo de sus 8 fases al estado real:

| Fase propuesta (versión) | Estado real | Qué falta realmente |
|--------------------------|-------------|---------------------|
| **1 · MVP (v1.0)** | 🟢 ~90% hecho | Solo "asignación manual por admin" (hoy el conductor se auto-asigna del pool) |
| **2 · Operación pro (v1.5)** | 🟡 ~60% | Dashboard, mapa en vivo y **panel de alertas** ✅ (GPS sin señal, solicitud sin conductor, recogida demorada, viaje prolongado). Falta: puntualidad, timeline visual, alerta de desvío propagada |
| **3 · Gestión integral (v2.0)** | 🔴 ~15% | Mantenimiento, documentación vehicular (rev. técnica/seguro/vencimientos), **folio + facturación**, contratos/centros de costo |
| **4 · Inteligencia (v2.5)** | 🔴 ~5% | ETA existe pero no "inteligente"; optimización/predicción/asistente ❌ |
| **5 · Enterprise (v3.0)** | 🟡 ~25% | **API REST ✅** (documentada en [API-0001](API-0001-README.md)). Falta multi-tenant real, white-label, webhooks, **auditoría** |
| **6 · BI (v3.5)** | 🟡 ~40% | Cancelaciones, ranking conductores/clientes ✅. Falta **costo por viaje/km** (requiere datos de costos → depende de Fase 3), utilización de flota |
| **7 · ML (v4.0)** | 🔴 0% | Todo futuro |
| **8 · Ecosistema portales (v5.0)** | 🟡 | App pasajero/conductor ✅ (roles PWA). Faltan portales empresa/RRHH/mantención/gerencia |

### Aclaraciones críticas de la propuesta
1. **"Multiempresa" es ambiguo.** *Empresa cliente* (a quién se factura) **ya existe**; *multi-tenant / multi-operadora* (varias operadoras aisladas) **no existe** y es un cambio arquitectónico mayor. Definir cuál antes de priorizar.
2. **"Costo por viaje/km" depende de datos que aún no se capturan** (combustible, mantención, sueldos): requiere primero el módulo de Mantenimiento.
3. **Alertas (Fase 2) es quick win**: el *desvío de ruta* ya se detecta en el cliente ([ADR-0003](../adr/0003-navegacion-por-proyeccion-sobre-ruta.md)); solo falta propagarlo al panel del admin.

### Orden ejecutable (mapeado a horizontes de este documento)
- **H1:** Facturación B2B (folio + estado pagado/pendiente + reporte por empresa) = Fase 3 "Clientes" + Fase 8 "Portal Facturación". ✅ **Implementado** (`003_billing.sql` + pestaña "Facturación" admin) **incluido el portal de autoservicio del cliente** (rol `company`, `004_company_portal.sql`, `/api/company/*`, página `/company` solo lectura).
- **H1:** Panel de alertas (Fase 2). ✅ **Implementado** — centro de operaciones en el admin (`/api/admin/alerts` + pestaña "Alertas" con badge, polling 12 s + refresco por socket). Alertas: sin señal GPS, solicitud sin conductor, recogida demorada, viaje prolongado y **desvío de ruta** (propagado desde el navegador del conductor vía socket → Redis con TTL 90 s).
- **H1/H2:** Decisión y diseño de multi-tenant (Fase 5) si el negocio vende a varias operadoras.
- **H2+:** Mantenimiento y documentación vehicular (Fase 3) → habilita costos/BI (Fase 6).
- **H3:** Inteligencia/ML/gemelo digital (Fases 4/7), tras tener tracción y datos.
