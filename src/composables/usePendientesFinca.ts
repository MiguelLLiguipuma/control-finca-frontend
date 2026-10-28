import { onScopeDispose, shallowRef, watch } from 'vue';
import { alertaService, type AlertaOperativa } from '@/services/alertaService';
import { ESTADOS_ALERTAS_ABIERTAS, LIMITE_ALERTAS_DASHBOARD } from '@/domain/pendientesFinca';

export function usePendientesFinca(contexto: () => {
  fincaId: number | null; habilitado: boolean; sesion: string; revision: number;
}) {
  const items = shallowRef<AlertaOperativa[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef('');
  const consultadoEn = shallowRef<number | null>(null);
  let request = 0;
  let activo = true;
  let controller: AbortController | null = null;

  async function cargar() {
    const id = ++request;
    controller?.abort();
    items.value = [];
    error.value = '';
    consultadoEn.value = null;
    loading.value = false;
    const contextoInicial = contexto();
    if (!activo || !contextoInicial.habilitado || !contextoInicial.fincaId) return;
    const vigente = () => activo && id === request
      && contexto().sesion === contextoInicial.sesion
      && contexto().fincaId === contextoInicial.fincaId && contexto().habilitado;
    controller = new AbortController();
    loading.value = true;
    try {
      const respuesta = await alertaService.listar({ finca_id: contextoInicial.fincaId,
        estado: ESTADOS_ALERTAS_ABIERTAS, limit: LIMITE_ALERTAS_DASHBOARD }, controller.signal);
      if (!vigente()) return;
      if (!Array.isArray(respuesta) || respuesta.some(item => !item || typeof item.tipo !== 'string'
        || !Number.isSafeInteger(item.id) || typeof item.estado !== 'string' || typeof item.severidad !== 'string')) {
        throw new Error('Respuesta de alertas no válida');
      }
      items.value = respuesta;
      consultadoEn.value = Date.now();
    } catch (err) {
      if (!vigente()) return;
      const status = (err as { response?: { status?: number } }).response?.status;
      error.value = status === 403 ? 'No tienes permiso para consultar los pendientes de esta finca.'
        : 'No se pudieron consultar los pendientes. Revisa la conexión e inténtalo de nuevo.';
    } finally { if (id === request && activo) loading.value = false; }
  }
  watch(contexto, cargar, { immediate: true, flush: 'sync' });
  onScopeDispose(() => { activo = false; request++; controller?.abort(); });
  return { items, loading, error, consultadoEn, cargar };
}
