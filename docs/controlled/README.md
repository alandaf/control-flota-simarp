# 📗 Documentos controlados — FLOTA

Conjunto de **documentos controlados** del producto FLOTA (Control Flota). A diferencia del [handbook](../README.md) (wiki de referencia rápida 00–10), estos son documentos **canónicos y versionados** con código único, pensados para: incorporar desarrolladores, presentar el producto a clientes grandes y respaldar una ronda de inversión sin depender de demos.

## Convención de documentos controlados

- **Código:** `TIPO-NNNN` (ej. `PRD-0001`). El número crece con reemplazos mayores, no con ediciones.
- **Cabecera obligatoria:** código, versión, estado, dueño, fecha, historial de cambios.
- **Estados:** `Borrador` → `En revisión` → `Aprobado` → `Reemplazado`.
- **Fuente de verdad:** cuando un dato existe en el código, el documento lo referencia (ruta de archivo) en vez de copiarlo, para no divergir.

## Índice maestro

| Código | Documento | Estado | Resumen |
|--------|-----------|--------|---------|
| [PRD-0001](PRD-0001-product-requirements.md) | Product Requirements Document | Borrador | Qué es el producto, para quién, requisitos funcionales y no funcionales |
| [ROADMAP-0001](ROADMAP-0001-estrategico-3-anios.md) | Roadmap estratégico a 3 años | Borrador | Visión, horizontes, hitos, métricas por trimestre |
| [ADR-0001](ADR-0001-decisiones-arquitectura.md) | Decisiones de arquitectura | Aprobado | Registro maestro de ADRs |
| [ARCH-0001](ARCH-0001-arquitectura.md) | Arquitectura del sistema | Aprobado | Vistas C4, componentes, flujos, escalabilidad |
| [DB-0001](DB-0001-modelo-datos.md) | Modelo de datos | Aprobado | Entidades, relaciones, PostGIS, evolución |
| [API-0001](API-0001-openapi.yaml) | Especificación OpenAPI | Aprobado | Contrato REST formal (+ [guía](API-0001-README.md)) |
| [UX-0001](UX-0001-design-system.md) | Sistema de diseño y UX | Borrador | Principios, tokens, componentes, patrones |
| [SEC-0001](SEC-0001-seguridad.md) | Seguridad, permisos y auditoría | Borrador | Modelo de amenazas, controles, cumplimiento |
| [OPS-0001](OPS-0001-operacion-despliegue.md) | Operación y despliegue | Aprobado | Infra, deploy, SLO, incidentes, backups |
| [INV-0001](INV-0001-inversionistas.md) | Inversionistas y valorización | Borrador | Oportunidad, modelo de negocio, financiero (ilustrativo) |

## Relación con el handbook

Los documentos controlados son la capa **formal**. El [handbook 00–10](../README.md) es la capa **operativa/rápida** que los alimenta. Cuando ambos hablen del mismo tema, **manda el documento controlado**.

## Nota de responsabilidad

`INV-0001` contiene proyecciones financieras y de mercado **ilustrativas**, basadas en supuestos explícitos que deben validarse con datos reales y asesoría profesional. No constituyen asesoría de inversión.
