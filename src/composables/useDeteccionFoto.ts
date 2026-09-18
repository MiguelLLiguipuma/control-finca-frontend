import { onBeforeUnmount, shallowRef } from 'vue';
import axios from 'axios';
import { deteccionRacimosService, prepararImagenDeteccion } from '@/services/cosecha/deteccionRacimosService';

export function useDeteccionFoto() {
  const detectando = shallowRef(false);
  const aviso = shallowRef('');
  const propuestas = shallowRef<number | null>(null);
  let solicitud: AbortController | undefined;

  function cancelar() {
    solicitud?.abort();
    solicitud = undefined;
    detectando.value = false;
  }
  function reiniciar() {
    cancelar();
    aviso.value = '';
    propuestas.value = null;
  }
  function continuarManual() {
    cancelar();
    aviso.value = 'Detección cancelada. Puedes marcar los racimos manualmente.';
  }
  async function detectar(src: string, fincaId: number) {
    cancelar();
    aviso.value = '';
    if (!navigator.onLine) {
      aviso.value = 'Sin conexión para detectar. Puedes marcar manualmente o detectar cuando vuelva internet.';
      return null;
    }
    if (!Number.isSafeInteger(fincaId) || fincaId <= 0) {
      aviso.value = 'Selecciona una finca antes de detectar.';
      return null;
    }
    const turno = new AbortController();
    solicitud = turno;
    detectando.value = true;
    try {
      const imagen = await prepararImagenDeteccion(src);
      if (turno.signal.aborted) return null;
      const resultado = await deteccionRacimosService.detectar(fincaId, imagen, turno.signal);
      if (turno.signal.aborted || solicitud !== turno) return null;
      propuestas.value = resultado.length;
      aviso.value = resultado.length
        ? `Borrador: ${resultado.length} racimos propuestos. Revisa las marcas antes de aplicar.`
        : 'No se distinguieron racimos. Esto no confirma que no haya: puedes marcarlos manualmente.';
      return resultado;
    } catch (error) {
      if (turno.signal.aborted || solicitud !== turno) return null;
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        aviso.value = status === 404
          ? 'La detección aún no está disponible en este backend. Puedes marcar manualmente.'
          : String(error.response?.data?.error || error.response?.data?.message || 'No se pudo conectar para detectar. Puedes continuar manualmente.');
      } else {
        aviso.value = error instanceof Error ? error.message : 'No se pudo analizar la foto. Puedes marcar manualmente.';
      }
      return null;
    } finally {
      if (solicitud === turno) {
        detectando.value = false;
        solicitud = undefined;
      }
    }
  }
  onBeforeUnmount(cancelar);
  return { detectando, aviso, propuestas, detectar, reiniciar, continuarManual };
}
