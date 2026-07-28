# INV-0001 · Inversionistas y valorización

| Campo | Valor |
|-------|-------|
| **Código** | INV-0001 |
| **Versión** | 1.0 |
| **Estado** | Borrador |
| **Dueño** | Fundadores |
| **Fecha** | 2026-07-27 |

> ⚠️ **Descargo importante.** Este documento contiene proyecciones de mercado y de valorización **ilustrativas**, construidas sobre **supuestos que deben reemplazarse por datos reales** y validarse con un asesor financiero/legal. **No constituye asesoría de inversión** ni una oferta de valores. Todos los números marcados como *(ilustrativo)* o `[COMPLETAR]` son marcadores de posición.

---

## 1. Resumen ejecutivo (elevator pitch)
FLOTA es una plataforma B2B2C que digitaliza el transporte corporativo: una operadora de flota atiende a **empresas cliente** (traslado de personal/ejecutivos) con experiencia tipo Uber —solicitud, ETA, seguimiento en vivo— y cierra el ciclo con **facturación por empresa**. Producto **funcional en producción**, autohospedado, listo para escalar.

**Por qué ahora:** las empresas exigen puntualidad medible y trazabilidad; las operadoras siguen con planillas y WhatsApp. FLOTA convierte esa operación en software.

## 2. El problema
Ver [PRD-0001 §2](PRD-0001-product-requirements.md): sin visibilidad en vivo, rutas poco confiables, registro débil para facturar, cero datos del negocio.

## 3. La solución y su diferenciación
- Experiencia moderna (mapa, ETA, navegación con voz) **específica para el modelo corporativo** (factura a la empresa, no al pasajero).
- **Autohospedable** → control de costos y datos; sin comisión de un tercero por viaje.
- **Ruteo intercambiable** (OSRM propio / Google) → calidad sin atarse a un único proveedor.
- Tarifas por empresa y reportes → **listo para contratos B2B**.

## 4. Producto y estado (tracción de producto)
✅ En producción: 3 roles, tiempo real, navegación con recálculo, dashboard de negocio, tarifas/empresas, PWA. Detalle en [PRD-0001](PRD-0001-product-requirements.md) y [ARCH-0001](ARCH-0001-arquitectura.md).

> **Tracción comercial:** `[COMPLETAR con datos reales]` — operadoras/empresas piloto, viajes/mes, ingresos, retención. Sin esto, la valorización es solo teórica.

## 5. Mercado (dimensionamiento — *ilustrativo*)
Metodología TAM/SAM/SOM. **Reemplazar supuestos por fuentes reales** (INE, gremios de transporte, estudios sectoriales).

| Nivel | Definición | Supuesto *(ilustrativo)* | Estimación |
|-------|-----------|--------------------------|-----------|
| **TAM** | Gasto anual en transporte corporativo en Chile | `[COMPLETAR]` empresas × gasto medio | `[COMPLETAR]` |
| **SAM** | Operadoras que podrían usar un SaaS como FLOTA | % del TAM alcanzable por software | `[COMPLETAR]` |
| **SOM** | Cuota realista a 3 años | penetración objetivo | `[COMPLETAR]` |

> Cómo completarlo bien: partir de nº de operadoras de transporte de personal en las regiones objetivo × ticket medio de un SaaS por operadora (o por vehículo/mes).

## 6. Modelo de negocio
Opciones (elegir/combinar):
- **SaaS por operadora** (suscripción mensual por plan/asientos).
- **Por vehículo activo/mes.**
- **Fee por viaje** o por GMV procesado.
- **Módulos premium** (facturación electrónica, analítica avanzada, integraciones).

Parámetros base del producto (reales, de `settings`): tarifa al pasajero `base 800 + 550/km + 90/min`, mínimo `1500 CLP`. El **ingreso de FLOTA** proviene del modelo SaaS/fee, no de la tarifa del pasajero.

## 7. Proyección financiera (*ilustrativa* — plantilla)
Modelo simple para completar con supuestos propios:

```
Ingresos_mensuales = operadoras_activas × ARPU_operadora
                   (+ vehículos × precio_vehículo, si aplica)
Margen_bruto      = Ingresos − (infra + Google Directions + soporte)
```

| Concepto | Año 1 | Año 2 | Año 3 |
|----------|-------|-------|-------|
| Operadoras activas | `[COMPLETAR]` | `[COMPLETAR]` | `[COMPLETAR]` |
| ARPU/operadora (CLP/mes) | `[COMPLETAR]` | `[COMPLETAR]` | `[COMPLETAR]` |
| Ingresos anuales | `[COMPLETAR]` | `[COMPLETAR]` | `[COMPLETAR]` |
| Costos (infra+API+equipo) | `[COMPLETAR]` | `[COMPLETAR]` | `[COMPLETAR]` |
| Resultado | `[COMPLETAR]` | `[COMPLETAR]` | `[COMPLETAR]` |

**Costos variables clave a vigilar:** Google Directions (mitigado por caché + fallback OSRM), infraestructura VPS. Ventaja: al ser autohospedado, el costo marginal por viaje es bajo.

## 8. Ventajas competitivas (moat)
1. Producto **específico B2B corporativo**, no un genérico de ride-hailing.
2. **Datos propios** (autohospedaje) → sin dependencia de comisión de terceros.
3. Base técnica **escalable** (adapter Redis, ruteo intercambiable, PWA).
4. Documentación y estándares que **aceleran incorporar equipo** y cerrar clientes grandes.

## 9. Competencia (*a completar*)
| Alternativa | Fortaleza | Debilidad frente a FLOTA |
|-------------|-----------|--------------------------|
| Ride-hailing genérico (Uber/Cabify) | Marca, oferta | No modela facturación B2B ni flota propia |
| Planillas/WhatsApp | Costo cero | Sin trazabilidad ni datos |
| Software de flota tradicional | Gestión | Sin experiencia pasajero/tiempo real moderno |
| `[COMPLETAR competidores locales]` | | |

## 10. Equipo
`[COMPLETAR: fundadores, roles, experiencia relevante]`. Un equipo creíble es, para la mayoría de inversionistas, tan importante como el producto.

## 11. La oportunidad de inversión (*the ask*)
- **Monto buscado:** `[COMPLETAR]`.
- **Uso de fondos (propuesto):** producto (facturación, multi-tenant), comercial (primeros clientes ancla), operación (VPS dedicado, backups, seguridad). Alineado con [ROADMAP-0001](ROADMAP-0001-estrategico-3-anios.md).
- **Hitos que desbloquea:** cerrar facturación B2B (H1), pagos y multi-operadora (H2).

## 12. Valorización (*metodología, no cifra definitiva*)
Para una empresa temprana la valorización es un **rango**, no un número. Métodos aplicables:

| Método | Cómo se usa | Insumo faltante |
|--------|-------------|-----------------|
| **Múltiplo de ingresos (ARR)** | valor ≈ ARR × múltiplo de SaaS comparable | ARR real, múltiplo del sector |
| **Comparables (transacciones)** | rondas de startups similares en LatAm | benchmarks recientes |
| **Berkus / Scorecard** | valora etapa pre-ingresos por hitos (producto, equipo, tracción) | datos de tracción |
| **DCF** | flujos futuros descontados | proyección validada (§7) |

> Recomendación honesta: sin **tracción comercial real** (§4/§7), cualquier valorización es especulativa. Prioriza conseguir 1–2 operadoras pagando y medir ARR/retención; eso mueve la valorización más que cualquier proyección.

## 13. Riesgos para el inversionista
| Riesgo | Mitigación |
|--------|-----------|
| Concentración en pocos clientes | Diversificar operadoras/empresas |
| Costo variable de ruteo | Caché + OSRM propio + monitoreo |
| Dependencia de un VPS compartido | Migrar a infra dedicada (roadmap) |
| Ejecución/equipo | Documentación + procesos (estos documentos) |
| Regulatorio (transporte, datos) | Asesoría legal; política de privacidad |

## 14. Anexos
- Producto: [PRD-0001](PRD-0001-product-requirements.md) · Arquitectura: [ARCH-0001](ARCH-0001-arquitectura.md) · Roadmap: [ROADMAP-0001](ROADMAP-0001-estrategico-3-anios.md).
- Demo en vivo: https://flota.simarp.net

---
*Documento vivo. Completar los marcadores `[COMPLETAR]` con datos reales antes de compartir con inversionistas, y validar cifras con un asesor financiero.*
