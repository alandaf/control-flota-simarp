# ADR · Architecture Decision Records

Registro de **decisiones de arquitectura**. Cada decisión relevante queda como un archivo numerado e inmutable: si una decisión cambia, se agrega un ADR nuevo que la reemplaza (con `Reemplaza a: ADR-XXXX`), no se reescribe el anterior.

## Formato

```
# ADR-NNNN · Título
- Estado: Propuesto | Aceptado | Reemplazado
- Fecha: AAAA-MM-DD
## Contexto      (qué problema/fuerza motivó la decisión)
## Decisión      (qué se decidió)
## Consecuencias (efectos positivos y negativos)
```

## Índice

| ADR | Título | Estado |
|-----|--------|--------|
| [0001](0001-deploy-detras-de-nginx-host.md) | Despliegue detrás del nginx del host (sin Caddy) | Aceptado |
| [0002](0002-motor-de-ruteo-intercambiable.md) | Motor de ruteo intercambiable OSRM/Google | Aceptado |
| [0003](0003-navegacion-por-proyeccion-sobre-ruta.md) | Navegación por proyección sobre la ruta | Aceptado |
