import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `active` sea true (evita que el
 * bloqueo automático suspenda el GPS y el envío de ubicación durante el viaje).
 * Re-solicita el bloqueo al volver a primer plano.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: any = null;
    let released = false;

    const acquire = async () => {
      try { sentinel = await (navigator as any).wakeLock.request('screen'); } catch { /* ignora */ }
    };
    acquire();

    const onVisible = () => { if (document.visibilityState === 'visible' && !released) acquire(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      try { sentinel?.release(); } catch { /* ignora */ }
    };
  }, [active]);
}
