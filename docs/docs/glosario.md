# Glosario

## Dominio

| Término | Significado |
|---------|-------------|
| **Pasajero** (`passenger`) | Usuario que solicita viajes |
| **Conductor** (`driver`) | Usuario que atiende viajes; tiene ficha en `drivers` y puede tener vehículo |
| **Administrador** (`admin`) | Gestiona todo y ve el negocio |
| **Empresa cliente** (`company`) | Organización a la que se le factura el servicio; puede tener tarifas negociadas |
| **Viaje / Servicio** (`trip`) | Un traslado, con su ciclo de estados |
| **Tramo de recogida** | Trayecto conductor → pasajero (ruta verde) |
| **Tramo de viaje** | Trayecto origen → destino (ruta azul) |
| **Tarifa** | `max(mínimo, base + km·per_km + min·per_min)`, redondeado a 50 CLP |
| **ETA** | Tiempo estimado de llegada |

## Estados de viaje

`requested` → `accepted` → `arrived` → `in_progress` → `completed` (o `cancelled`).

## Técnico

| Término | Significado |
|---------|-------------|
| **PWA** | Progressive Web App: web instalable que se comporta como app |
| **Service Worker** | Script que cachea la PWA (causa del gotcha de "JS viejo") |
| **PostGIS** | Extensión geoespacial de PostgreSQL (`geography(Point,4326)`) |
| **OSRM** | Open Source Routing Machine: motor de ruteo por calle self-hosted |
| **Directions API** | Servicio de ruteo de Google (motor en producción) |
| **Photon** | Geocodificador basado en OSM (autocompletar direcciones) |
| **Redis GEO** | Índice geoespacial en Redis para "conductores cerca" en vivo |
| **Socket.IO room** | Canal lógico de eventos: `user:{id}`, `trip:{id}`, `drivers:online`, `admins` |
| **Wake Lock** | API que mantiene la pantalla encendida durante el viaje |
| **ADR** | Architecture Decision Record: decisión de arquitectura registrada |
| **MLD** | Multi-Level Dijkstra: algoritmo de preprocesado de OSRM |
| **WGS84 / 4326** | Sistema de coordenadas geográficas (lat/lng estándar) |

## Infra

| Término | Significado |
|---------|-------------|
| **VPS** | Servidor virtual (91.99.175.78) compartido con otras apps `*.simarp.net` |
| **Portainer** | UI para gestionar los stacks de Docker en el VPS |
| **nginx del host** | Proxy TLS del servidor que enruta los dominios a cada app |
| **WEB_BIND** | Puerto loopback donde escucha la web (8095) |
| **certbot snap** | Herramienta de certificados TLS (Let's Encrypt) |
