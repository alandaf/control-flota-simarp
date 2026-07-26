#!/usr/bin/env bash
# =====================================================================
# Prepara los datos de OSRM (motor de ruta más corta) para auto-hospedaje.
#
# Descarga un extracto de OpenStreetMap y lo preprocesa con el algoritmo
# MLD (Multi-Level Dijkstra). Solo hay que ejecutarlo una vez (o al
# actualizar el mapa). Luego levanta el servicio con:
#     docker compose --profile routing up -d osrm
#
# Uso:
#     ./scripts/osrm-prepare.sh [URL_DEL_PBF]
#
# Por defecto usa Chile. Para otra región, pasa la URL de Geofabrik, p.ej.:
#     ./scripts/osrm-prepare.sh https://download.geofabrik.de/south-america/argentina-latest.osm.pbf
# =====================================================================
set -euo pipefail

PBF_URL="${1:-https://download.geofabrik.de/south-america/chile-latest.osm.pbf}"
DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/osrm-data"
FILE="$(basename "$PBF_URL")"          # chile-latest.osm.pbf
BASE="${FILE%.osm.pbf}"                # chile-latest
OSRM_IMAGE="ghcr.io/project-osrm/osrm-backend:latest"

mkdir -p "$DATA_DIR"

echo "==> Descargando $FILE ..."
if [ ! -f "$DATA_DIR/$FILE" ]; then
  curl -L --fail -o "$DATA_DIR/$FILE" "$PBF_URL"
else
  echo "    ya existe, se omite la descarga."
fi

# En Git Bash (Windows) hay que evitar que MSYS convierta las rutas internas
# del contenedor (p.ej. /opt/car.lua -> C:/Program Files/Git/opt/car.lua).
WINDATA=$(cygpath -m "$DATA_DIR" 2>/dev/null || echo "$DATA_DIR")
run() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' docker run --rm -v "$WINDATA:/data" "$OSRM_IMAGE" "$@"; }

echo "==> osrm-extract (perfil: car) ..."
run osrm-extract -p /opt/car.lua "/data/$FILE"

echo "==> osrm-partition ..."
run osrm-partition "/data/$BASE.osrm"

echo "==> osrm-customize ..."
run osrm-customize "/data/$BASE.osrm"

echo ""
echo "==> Listo. Datos preparados en: $DATA_DIR/$BASE.osrm"
echo "    1) En tu .env pon:   OSRM_PBF=$BASE   y   OSRM_URL=http://osrm:5000"
echo "    2) Levanta OSRM:      docker compose --profile routing up -d osrm"
echo "    3) Reinicia la API:   docker compose up -d api"
