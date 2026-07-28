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
| **Endurecimiento de seguridad** | Rate limiting en login, log de auditoría (`authGuard('admin')` y CORS ✅ ya hechos) | [SEC-0001](SEC-0001-seguridad.md) |
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
