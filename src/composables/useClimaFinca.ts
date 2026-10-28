import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useFincaStore } from '@/stores/fincaStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { fincaDesdeEnlace } from '@/domain/pendientesFinca';
import { climaService } from '@/services/climaService';
import { climaCsv, fechaClimaHoy, desplazarFecha, validarPeriodoClima, diasDelHistorial, resumenClima, type ClimaHistorial } from '@/domain/clima';

export function useClimaFinca(fincaEnlace?: unknown) {
  const fincaStore = useFincaStore();
  const auth = useAuthStore();
  const { fincas, fincaSeleccionadaId } = storeToRefs(fincaStore);
  const hasta = shallowRef(fechaClimaHoy());
  const desde = shallowRef(desplazarFecha(hasta.value, -29));
  const data = shallowRef<ClimaHistorial | null>(null);
  const loading = shallowRef(false);
  const iniciando = shallowRef(true);
  const error = shallowRef('');
  const errorFincas = shallowRef('');
  const presets = [7, 30, 90];
  const rango = computed(() => presets.find(n => hasta.value === fechaClimaHoy() && desde.value === desplazarFecha(hasta.value, 1 - n)) || null);
  const errorPeriodo = computed(() => validarPeriodoClima(desde.value, hasta.value));
  const dias = computed(() => data.value ? diasDelHistorial(data.value) : []);
  const resumen = computed(() => resumenClima(dias.value));
  const soloFaltantes = ref(false);
  const filas = computed(() => [...dias.value].reverse().filter(row => !soloFaltantes.value || !row.disponible));
  let request = 0;
  let controller: AbortController | null = null;
  let mounted = true;
  const sesion = () => `${auth.token || ''}:${auth.user?.id ?? auth.user?.id_usuario ?? ''}:${auth.user?.empresa_id ?? ''}`;
  const propietario = sesion();

  async function cargar() {
    const id = ++request;
    controller?.abort();
    data.value = null;
    error.value = '';
    loading.value = false;
    if (!mounted || iniciando.value || errorPeriodo.value || !fincaSeleccionadaId.value || sesion() !== propietario) return;
    controller = new AbortController();
    loading.value = true;
    try {
      const response = await climaService.historial(fincaSeleccionadaId.value, desde.value, hasta.value, controller.signal);
      if (id === request && mounted && sesion() === propietario) data.value = response;
    } catch (err) {
      if (id !== request || !mounted || sesion() !== propietario) return;
      const e = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      error.value = e.response?.status === 404 ? 'El historial no está disponible. Verifica que el backend incluya el nuevo módulo de clima y que la finca siga disponible.'
        : e.response?.data?.message || e.message || 'No se pudo consultar el clima. Revisa tu conexión y vuelve a intentar.';
    } finally { if (id === request && mounted) loading.value = false; }
  }
  function seleccionarPeriodo(n: number) {
    hasta.value = fechaClimaHoy();
    desde.value = desplazarFecha(hasta.value, 1 - n);
  }
  async function iniciar() {
    iniciando.value = true;
    errorFincas.value = '';
    try {
      await fincaStore.obtenerFincas();
      if (fincaEnlace !== undefined) {
        const destino = fincaDesdeEnlace(fincaEnlace, fincas.value);
        if (destino) fincaStore.seleccionarFinca(destino);
        else errorFincas.value = 'La finca del enlace no está disponible. Abre el clima desde una finca autorizada.';
      }
    }
    catch { errorFincas.value = 'No se pudieron cargar tus fincas. Revisa la conexión e inténtalo nuevamente.'; }
    finally { iniciando.value = false; }
    if (!errorFincas.value) await cargar();
  }
  function exportar() {
    if (!data.value) return;
    try {
      const url = URL.createObjectURL(new Blob([climaCsv(data.value)], { type: 'text/csv;charset=utf-8;' }));
      const a = document.createElement('a');
      a.href = url; a.download = `clima-finca-${data.value.finca.id}-${data.value.periodo.desde}-${data.value.periodo.hasta}.csv`; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { error.value = 'No se pudo descargar el historial. Inténtalo nuevamente.'; }
  }
  watch([fincaSeleccionadaId, desde, hasta], () => { if (!iniciando.value) void cargar(); });
  watch(sesion, () => { controller?.abort(); request++; data.value = null; loading.value = false; });
  onMounted(iniciar);
  onUnmounted(() => { mounted = false; request++; controller?.abort(); });
  return { fincaStore, fincas, fincaSeleccionadaId, hasta, desde, data, loading, iniciando, error, errorFincas,
    errorPeriodo, dias, resumen, filas, soloFaltantes, rango, cargar, iniciar, seleccionarPeriodo, exportar };
}
