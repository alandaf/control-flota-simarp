# Guía del conductor · Cómo hacer un viaje

Instructivo rápido para conductores de **Control Flota**. La app funciona como
una app normal en el celular (es una PWA instalable).

## Antes de empezar (una sola vez)

1. **Instala la app:** abre `https://flota.simarp.net` en el navegador del
   celular y elige **"Agregar a pantalla de inicio"**.
2. **Permite la ubicación (GPS)** con alta precisión cuando la app la pida.
3. **Activa las notificaciones:** toca la **🔔** una vez y acepta el permiso.
   > ⚠️ Cada teléfono debe activar la campana por su cuenta. Si no la activas,
   > **no te llegan avisos de viajes**.
4. **Conéctate:** toca **"Conectarme"** para aparecer como *Disponible*.

## Hacer un viaje (paso a paso)

1. **Llega una solicitud** → aparece en pantalla (y como notificación).
   Toca **Aceptar**.
2. Tu estado cambia a **Ocupado**. La app te muestra la ruta hacia el
   **punto de recogida** (donde está el pasajero).
   - Para ir a buscarlo, toca **Waze** o **Google Maps** → arranca la
     navegación real con voz y tráfico.
3. Al llegar donde el pasajero, toca **"Llegué al punto"**.
4. Con el pasajero a bordo, toca **"Iniciar viaje"**.
   - La ruta y los botones **cambian solos al destino**. Toca **Waze** o
     **Google Maps** de nuevo → ahora te llevan al **destino final**.
5. Al llegar, toca **"Finalizar viaje"**. Listo. ✔

> 💡 **El mismo botón sabe a dónde llevarte:** a la recogida antes de
> "Iniciar viaje", y al destino después. No tienes que configurar nada.

## Navegación: qué usa cada cosa

- **Waze / Google Maps** → **navegación real** por voz y tráfico en vivo.
  **Es lo que debes usar para manejar.** Cada botón usa el GPS del propio
  teléfono, así que la ubicación es precisa.
- **Banner dentro de la app** (la barra azul con la flecha) → **solo
  referencia visual** de la próxima maniobra. Es un apoyo para dar un vistazo;
  **no reemplaza a Waze/Google** y no tiene voz.

## Consejos y problemas comunes

- **Batería:** el GPS de alta precisión gasta batería. En jornadas largas
  mantén el teléfono **enchufado** (la pantalla se queda encendida durante el
  viaje a propósito, para que el GPS no se congele).
- **No veo la ruta en el mapa de la app:** no importa — **Waze/Google igual
  funcionan**, porque usan el GPS del teléfono directamente.
- **"No veo los últimos cambios" tras una actualización:** cierra la app por
  completo y vuelve a abrirla (es el caché del service worker de la PWA).
- **No me llegan avisos de viajes:** revisa que hayas **activado la 🔔** en ese
  teléfono y aceptado el permiso de notificaciones.

---

Documento operativo. Para el detalle técnico de la navegación, ver
[`05-mobile/README.md`](README.md).
