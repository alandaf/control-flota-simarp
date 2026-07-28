# 00 · Visión

## El problema

Las empresas de transporte que dan servicio a **empresas cliente** (traslados de personal, ejecutivos, etc.) suelen operar con planillas, llamadas y WhatsApp. No hay:

- Visibilidad en vivo de dónde están los vehículos.
- Rutas optimizadas ni tiempos de llegada confiables.
- Un registro ordenado de cada servicio para **facturar por empresa**.
- Métricas del negocio (viajes, ingresos, uso de flota).

## La propuesta

**Control Flota** replica la experiencia de una app tipo Uber/Cabify, pero orientada a una **operadora de flota** que factura a **empresas cliente**:

- El **pasajero** pide un viaje desde el mapa y ve al conductor acercarse en tiempo real, con ETA.
- El **conductor** recibe solicitudes, navega giro a giro (con voz) y actualiza el estado del viaje.
- El **administrador** controla usuarios, vehículos, tarifas y empresas, y mide el negocio con un dashboard de KPIs.

Todo corre como **PWA instalable** en el celular, sin publicar en tiendas de apps.

## Propuesta de valor

| Para… | Valor |
|-------|-------|
| Operadora de flota | Trazabilidad total del servicio y datos para facturar y decidir |
| Empresa cliente | Servicio puntual, medible y con reportes por contrato |
| Pasajero | Experiencia moderna: mapa, ETA, seguimiento en vivo |
| Conductor | Navegación integrada, sin depender de apps externas |

## Principios de producto

1. **Rutas reales, no líneas rectas.** El corazón del producto es el ruteo por calle (ver [ADR-0002](../adr/0002-motor-de-ruteo-intercambiable.md)).
2. **Tiempo real primero.** Ubicación, estados y ETA se propagan por Socket.IO en segundos.
3. **Móvil de verdad.** Geolocalización continua, pantalla siempre encendida, voz. Ver [05 · Mobile](../05-mobile/README.md).
4. **El negocio importa.** Tarifas configurables y facturación por empresa son parte del núcleo, no un extra.
5. **Autohospedable.** Todo dockerizado, desplegable en un VPS propio.

## Alcance actual (qué es y qué no)

**Es:** un producto funcional en producción con los tres roles, ruteo por calle, tiempo real, dashboard de negocio y facturación por empresa a nivel de tarifa.

**Todavía no es:** una pasarela de pagos integrada, ni facturación electrónica (folio/DTE), ni portal de autoservicio para la empresa cliente. Ver [10 · Roadmap](../10-roadmap/README.md).
