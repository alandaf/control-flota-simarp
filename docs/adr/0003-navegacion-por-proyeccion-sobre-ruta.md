# ADR-0003 · Navegación por proyección sobre la ruta

- **Estado:** Aceptado · **parcialmente superado** (2026-07-29)
- **Fecha:** 2026-07-27

> **Actualización (2026-07-29).** La **voz interna se retiró.** En calle seguía
> quedando "fuera de lugar" a mitad de ruta porque `NavGuide` calculaba **su
> propia ruta**, distinta a la que se dibuja y maneja (dos llamadas
> independientes que pueden elegir alternativas distintas). Decisión: **delegar
> la navegación por voz a Waze/Google Maps** (botones en el panel del conductor)
> y dejar `NavGuide` como **guía solo visual**. La técnica de proyección sobre
> la ruta (abajo) **se mantiene** para el banner visual y para la detección de
> desvío que alimenta el panel de operaciones; solo se afinaron umbrales
> (perpendicular **60 m** / **3 lecturas** / anti-rebote **8 s**, sin recalcular
> en los últimos ~300 m) y el bucle bajó a **1 s**. Ver
> [`05-mobile/README.md`](../05-mobile/README.md) y
> [`05-mobile/guia-conductor.md`](../05-mobile/guia-conductor.md).

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
