# Despliegue en el VPS — flota.simarp.net

Setup detectado:
- **VPS destino:** `91.99.175.78` (donde ya apunta `flota.simarp.net`)
- **Proxy existente:** **nginx 1.28 (Ubuntu)** en los puertos 80/443
- **DNS:** ya resuelve `flota.simarp.net → 91.99.175.78` ✅ (no hay que tocar DNS)

Plan: la app corre en Docker escuchando solo en `127.0.0.1:8095`, y tu **nginx**
hace de reverse proxy `flota.simarp.net → 127.0.0.1:8095` con HTTPS (Let's Encrypt).

**Puertos ya ocupados en el VPS** (auditoría): 22, 80, 443, 1883, 3000, 3005, 3010,
5432, 5435, 8001, 8010, 8080, 8086, 8090, 8443, 8501, 9001, 54320.
→ `8095` está **libre**, por eso lo usamos. Nuestros contenedores (`flota_*`) no
publican puertos al host salvo la web en `127.0.0.1:8095`, así que no chocan con
los stacks existentes (SIMARP AI, LicitaSaaS, LATAM Cyber Monitor, Gana Licitaciones).
Como tu nginx ya proxya WebSockets (SIMARP AI en 8001), probablemente ya tienes el
`map $http_upgrade` → si `nginx -t` da "duplicate map", borra ese bloque del `.conf`.

---

## 1) Copia el proyecto al VPS

```bash
ssh usuario@91.99.175.78
git clone <tu-repo> control_flota      # o sube la carpeta por scp/rsync
cd control_flota
cp .env.prod.example .env.prod
nano .env.prod                         # edita passwords y JWT_SECRET (DOMAIN ya = flota.simarp.net)
```

Genera secretos fuertes:

```bash
openssl rand -hex 32     # pégalo en JWT_SECRET
```

---

## 2) Prepara el motor de rutas (OSRM)

```bash
./scripts/osrm-prepare.sh https://download.openstreetmap.fr/extracts/south-america/chile/valparaiso-latest.osm.pbf
```

---

## 3) Levanta la app en Docker (sin Caddy, detrás de nginx)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod --profile routing up -d --build
```

Verifica que responde en local (dentro del VPS):

```bash
curl -I http://127.0.0.1:8095            # debe dar 200 y servir la web
```

---

## 4) Configura nginx como reverse proxy

Copia el archivo [deploy/nginx-flota.simarp.net.conf](deploy/nginx-flota.simarp.net.conf) al VPS:

```bash
sudo cp deploy/nginx-flota.simarp.net.conf /etc/nginx/sites-available/flota.simarp.net.conf
sudo ln -s /etc/nginx/sites-available/flota.simarp.net.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> Si tu nginx **no** usa `sites-available/` sino `conf.d/`, cópialo a
> `/etc/nginx/conf.d/flota.simarp.net.conf` en su lugar.
>
> Si `nginx -t` se queja de **"duplicate map $http_upgrade"**, borra el bloque
> `map { ... }` del archivo (tu nginx ya lo define en otro lado) y recarga.

---

## 5) HTTPS con Let's Encrypt

```bash
sudo certbot --nginx -d flota.simarp.net
```

Certbot detecta el server block, obtiene el certificado y añade el redirect a HTTPS.

Abre: **https://flota.simarp.net** 🎉  (instalable como PWA + geolocalización OK)

---

## Actualizar la app

```bash
cd control_flota && git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod --profile routing up -d --build
```

## Notas
- `db`, `redis`, `api` y `osrm` no se exponen al host (solo red interna). La web
  solo escucha en `127.0.0.1:8095`, nunca directo a internet.
- El seed crea cuentas demo con clave `123456` → **cámbialas** antes de nada serio.
- Si el otro nginx/app ya responde a `flota.simarp.net` con un `default_server`,
  nuestro `server_name flota.simarp.net` tiene prioridad; no hay conflicto.

---

### (Alternativa) VPS sin proxy y con 80/443 libres → Caddy
Si algún día lo montas en un servidor limpio, usa el perfil `edge` (Caddy con HTTPS
automático) en vez de nginx:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod --profile routing --profile edge up -d --build
```
