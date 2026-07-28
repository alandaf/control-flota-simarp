# 10 · Roadmap

## Estado actual (julio 2026) ✅

- Tres roles funcionando: pasajero, conductor, admin.
- Ciclo de viaje completo con tiempo real (Socket.IO) y ETA.
- Ruteo por calle **intercambiable OSRM/Google**; en producción con Google.
- Navegación giro a giro con **recálculo por desvío** y **voz** sincronizada con la ruta.
- Dashboard de negocio: KPIs, gráficos, rankings, ingresos por empresa.
- Tarifas configurables (global y por empresa) y CRUD total desde el admin.
- Desplegado en producción: https://flota.simarp.net (PWA instalable).

## Próximos pasos

### 1. Facturación a empresas cliente (prioridad de negocio)
Cerrar el ciclo comercial que hoy solo llega a nivel de tarifa:
- **Folio / N° de servicio** por viaje.
- **Estado de facturación:** pagado / pendiente.
- Reporte de facturación por empresa y período (ya existe la base con `trips.company_id` y `/api/admin/trips`).
- **Portal de la empresa cliente:** login para ver sus propios servicios y montos.

### 2. Endurecimiento de seguridad (prioridad técnica)
- `authGuard('admin')` en todo `/api/admin`.
- Rate limiting en login/registro.
- CORS acotado al dominio de producción.
Ver checklist en [08 · Security](../08-security/README.md).

### 3. Calidad de navegación (en observación)
- Ajustar umbrales de recálculo (45 m / 6 s) según pruebas en calle.
- Evaluar incorporar el **mapa de Google** (SDK oficial) y funciones como tráfico/Street View, si el costo lo justifica.

### 4. Operación
- Backups automáticos de PostgreSQL.
- Métricas/alertas de salud de los contenedores.
- Documentar rotación de secretos.

## Ideas más adelante

- Pasarela de pagos y/o facturación electrónica (DTE/SII).
- Calificaciones visibles y reputación de conductores.
- Notificaciones push (web push) para solicitudes y estados.
- App-shell offline más completa.

## Cómo se prioriza

1. Lo que **desbloquea facturar** al cliente.
2. Lo que **reduce riesgo** (seguridad, backups).
3. Lo que **mejora la experiencia** en calle.
