export async function prepararAppOffline(): Promise<void> {
  if (import.meta.env.DEV) throw new Error('La reapertura sin conexión se prepara en la versión compilada, no en el servidor de desarrollo.');
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    throw new Error('Este navegador necesita HTTPS y soporte de almacenamiento offline.');
  }
  const registro = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}conteo-sw.js`, { updateViaCache: 'none' });
  if (!registro.installing) await registro.update();
  if (registro.waiting) throw new Error('Hay una actualización descargada. Cierra las pestañas de la app y vuelve a abrirla con conexión.');
  const worker = registro.installing || registro.active;
  if (!worker) throw new Error('No se pudo preparar la aplicación. Reintenta con conexión.');
  if (worker.state === 'activated') return;
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      worker.removeEventListener('statechange', check);
      if (error) reject(error); else resolve();
    };
    const check = () => {
      if (worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('La descarga no se completó. Revisa la conexión y el espacio disponible.'));
      else if (worker.state === 'installed' && registro.active && registro.active !== worker) {
        finish(new Error('Actualización descargada. Cierra las pestañas de la app y vuelve a abrirla con conexión.'));
      }
    };
    const timeout = setTimeout(() => finish(new Error('La descarga sigue pendiente. Reintenta antes de salir al campo.')), 90000);
    worker.addEventListener('statechange', check);
    check();
  });
}
