# ADR-0003 · Navegación por proyección sobre la ruta

- **Estado:** Aceptado
- **Fecha:** 2026-07-27

## Contexto

En pruebas reales en calle aparecieron dos fallas del navegador giro a giro (`apps/web/src/components/NavGuide.tsx`):

1. **No recalculaba al desviarse**, o recalculaba de más en tramos rectos.
2. **La voz iba desfasada** de la ruta (anunciaba giros ya pasados).

Ambas venían del mismo defecto: el seguimiento medía todo por **distancia en línea recta al próximo punto de maniobra**. En un tramo recto largo esa distancia es grande aunque vayas bien (falsos "fuera de ruta"), y el avance de paso solo ocurría al pasar a <22 m del punto exacto del giro; con el GPS derivando o calles anchas, ese umbral no se tocaba y el paso no avanzaba.

## Decisión

Reescribir el seguimiento para **proyectar la posición del conductor sobre la geometría de la ruta**:

- Se pide la ruta con `geometry` + `steps` y se construye un modelo con distancia acumulada por vértice y el avance de cada maniobra.
- En cada tick (~2 s) se proyecta la posición sobre los segmentos de la ruta y se obtiene:
  - **Distancia perpendicular** a la línea → detección de desvío. Si supera **45 m** sostenido → **recalcula** (anti-rebote de 6 s).
  - **Avance a lo largo de la ruta** → cuál maniobra sigue y su **distancia real** por la calle.
- La voz y el banner se derivan de ese avance, no de la distancia en línea recta.

## Consecuencias

**Positivas**
- Recálculo fiable al desviarse; sin falsos positivos en rectas.
- Voz e indicaciones sincronizadas con el giro real aunque el GPS oscile.
- Cálculo local liviano (proyección punto-segmento en metros); sin dependencias nuevas.

**Negativas / costos**
- Los umbrales (45 m / 6 s) son empíricos y podrían necesitar ajuste según ciudad/dispositivo.
- Recalcular llama de nuevo al motor de ruteo (mitigado por la caché y el anti-rebote).
