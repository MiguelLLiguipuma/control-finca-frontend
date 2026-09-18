<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import EditorMarcasRacimos from './EditorMarcasRacimos.vue';
import { useDeteccionFoto } from '@/composables/useDeteccionFoto';
import { validarRepartoFoto, type CintaFoto, type MarcaRacimo, type RepartoFoto } from '@/utils/conteoFoto';

const props = defineProps<{ fincaId: number | null; cintas: CintaFoto[]; bloqueado: boolean; errorAplicacion: string }>();
const emit = defineEmits<{
  pending: [value: boolean];
  apply: [total: number, reparto: RepartoFoto[]];
}>();
const camara = ref<HTMLInputElement | null>(null);
const galeria = ref<HTMLInputElement | null>(null);
const foto = shallowRef('');
const cargando = shallowRef(false);
const error = shallowRef('');
const marcas = ref<MarcaRacimo[]>([]);
const cantidades = reactive<Record<number, number | string>>({});
let versionCarga = 0;
const { detectando, aviso, propuestas, detectar, reiniciar, continuarManual } = useDeteccionFoto();
const revisado = shallowRef(false);
const revisionEditor = shallowRef(0);
const ocupado = computed(() => cargando.value || detectando.value);
watch(marcas, () => { revisado.value = false; }, { deep: true, flush: 'sync' });

const pendiente = computed(() => Boolean(foto.value) || cargando.value);
const reparto = computed<RepartoFoto[]>(() => Object.entries(cantidades)
  .filter(([, cantidad]) => Number(cantidad) !== 0)
  .map(([id, cantidad]) => ({ calendario_id: Number(id), cantidad: Number(cantidad) })));
const distribuido = computed(() => reparto.value.reduce((total, fila) => total + fila.cantidad, 0));
const diferencia = computed(() => marcas.value.length - distribuido.value);
const valido = computed(() => validarRepartoFoto(marcas.value.length, reparto.value, props.cintas));
const estado = computed(() => {
  if (!Number.isFinite(diferencia.value)) return 'Revisa las cantidades';
  if (diferencia.value < 0) return `Sobran ${-diferencia.value} en el reparto`;
  if (diferencia.value > 0) return `Faltan ${diferencia.value} por repartir`;
  return valido.value ? 'Reparto completo' : 'Revisa las cantidades y el saldo';
});

watch(pendiente, (value) => emit('pending', value), { immediate: true, flush: 'sync' });

function errorCantidad(cinta: CintaFoto) {
  const valor = Number(cantidades[cinta.calendario_id] || 0);
  if (!Number.isSafeInteger(valor) || valor < 0) return 'Usa un número entero de 0 en adelante';
  if (valor > cinta.disponible) return `Disponible: ${cinta.disponible}`;
  return '';
}

function limpiar() {
  reiniciar();
  revisado.value = false;
  versionCarga++;
  if (foto.value) URL.revokeObjectURL(foto.value);
  foto.value = '';
  marcas.value = [];
  Object.keys(cantidades).forEach((id) => delete cantidades[Number(id)]);
  error.value = '';
  cargando.value = false;
}

function descartar() {
  if (marcas.value.length && !window.confirm('¿Descartar la foto y sus marcas sin aplicar al conteo?')) return;
  limpiar();
}

async function cargarFoto(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  if (props.bloqueado || ocupado.value) return;
  if (marcas.value.length && !window.confirm('¿Reemplazar la foto y descartar sus marcas?')) return;
  if (file.size > 25 * 1024 * 1024) { error.value = 'La imagen supera 25 MB. Selecciona una más pequeña.'; return; }
  const turno = ++versionCarga;
  cargando.value = true;
  error.value = '';
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('imagen invalida'));
      image.src = url;
    });
    if (turno !== versionCarga) { URL.revokeObjectURL(url); return; }
    limpiar();
    foto.value = url;
    await generarBorrador();
  } catch {
    URL.revokeObjectURL(url);
    if (turno === versionCarga) error.value = 'No se pudo abrir la imagen. Prueba con una foto JPG o PNG.';
  } finally {
    if (turno === versionCarga) cargando.value = false;
  }
}

async function generarBorrador() {
  if (!foto.value || props.bloqueado || detectando.value) return;
  if (marcas.value.length && !window.confirm('¿Volver a detectar? Si termina correctamente, reemplazará las marcas y el reparto actuales.')) return;
  const resultado = await detectar(foto.value, props.fincaId || 0);
  if (resultado === null) return;
  marcas.value = resultado;
  revisado.value = false;
  revisionEditor.value++;
  Object.keys(cantidades).forEach((id) => delete cantidades[Number(id)]);
}

function aplicar() {
  if (props.bloqueado || ocupado.value || !revisado.value || !valido.value) return;
  emit('apply', marcas.value.length, reparto.value.map((fila) => ({ ...fila })));
}

function advertirSalida(event: BeforeUnloadEvent) {
  if (!pendiente.value) return;
  event.preventDefault();
  event.returnValue = '';
}
onBeforeRouteLeave(() => !pendiente.value || window.confirm('La foto aún no está aplicada al conteo. ¿Salir y descartarla?'));
onMounted(() => window.addEventListener('beforeunload', advertirSalida));
onBeforeUnmount(() => {
  limpiar();
  window.removeEventListener('beforeunload', advertirSalida);
});
</script>

<template>
  <section class="foto-panel" aria-label="Conteo asistido por foto">
    <div class="cabecera">
      <h2 class="text-subtitle-1 font-weight-bold">Conteo por foto</h2>
      <v-chip size="small" variant="tonal">{{ detectando ? 'Detectando' : propuestas !== null ? 'Borrador asistido' : 'Detección por foto' }}</v-chip>
    </div>
    <input ref="camara" class="archivo" type="file" accept="image/*" capture="environment" @change="cargarFoto">
    <input ref="galeria" class="archivo" type="file" accept="image/*" @change="cargarFoto">
    <div class="acciones">
      <v-btn color="primary" prepend-icon="mdi-camera" :loading="cargando" :disabled="bloqueado || ocupado" @click="camara?.click()">Tomar foto</v-btn>
      <v-btn variant="outlined" prepend-icon="mdi-image" :disabled="bloqueado || ocupado" @click="galeria?.click()">Elegir foto</v-btn>
      <v-btn v-if="foto" variant="text" color="error" :disabled="bloqueado || cargando" @click="descartar">Descartar foto</v-btn>
    </div>
    <p v-if="!foto" class="text-caption text-medium-emphasis">Al elegir una foto con conexión, se envía una copia comprimida a Google Gemini para proponer marcas. El operador confirma el conteo.</p>
    <v-alert v-if="error || errorAplicacion" type="error" variant="tonal" density="compact">{{ error || errorAplicacion }}</v-alert>
    <template v-if="foto">
      <div v-if="detectando" role="status" class="deteccion-estado">
        <v-progress-linear indeterminate color="primary" aria-label="Detectando racimos" />
        <span>Buscando racimos en la foto…</span>
        <v-btn variant="text" @click="continuarManual">Continuar manualmente</v-btn>
      </div>
      <v-alert v-else-if="aviso" type="info" variant="tonal" density="compact" role="status">{{ aviso }}</v-alert>
      <v-btn v-if="!detectando" variant="text" prepend-icon="mdi-refresh" :disabled="bloqueado || cargando" @click="generarBorrador">{{ propuestas === null ? 'Detectar racimos' : 'Volver a detectar' }}</v-btn>
      <EditorMarcasRacimos :key="`${foto}-${revisionEditor}`" v-model="marcas" :src="foto" :disabled="bloqueado || ocupado" />
      <div v-if="marcas.length" class="distribucion">
        <h3 class="text-subtitle-2">Repartir {{ marcas.length }} racimos buenos por cinta y semana</h3>
        <v-alert v-if="!cintas.length" type="warning" variant="tonal">No hay cintas disponibles para esta finca.</v-alert>
        <div v-for="cinta in cintas" :key="cinta.calendario_id" class="fila">
          <div class="etiqueta">
            <span class="punto" :style="{ backgroundColor: cinta.color_hex }" />
            <div><strong>{{ cinta.color_cinta }}</strong><div class="text-caption">Semana {{ cinta.semana_enfunde }}/{{ cinta.anio }} · Disponible {{ cinta.disponible }}</div></div>
          </div>
          <v-text-field
            v-model="cantidades[cinta.calendario_id]" type="number" min="0" :max="cinta.disponible" step="1"
            inputmode="numeric" density="compact" variant="outlined" hide-details="auto"
            :aria-label="`${cinta.color_cinta}, semana ${cinta.semana_enfunde} de ${cinta.anio}`"
            :error-messages="errorCantidad(cinta)" :disabled="bloqueado || ocupado" class="cantidad"
          />
        </div>
        <v-checkbox v-model="revisado" label="Revisé las marcas y confirmo el conteo" :disabled="bloqueado || ocupado" hide-details density="compact" />
        <div class="pie">
          <span role="status" :class="valido ? 'text-success' : 'text-warning'">{{ estado }}</span>
          <v-btn color="success" prepend-icon="mdi-check" :disabled="!valido || !revisado || bloqueado || ocupado" @click="aplicar">Aplicar {{ marcas.length }} al conteo</v-btn>
        </div>
      </div>
      <p class="text-caption text-medium-emphasis">Foto sin aplicar. La detección usa Google Gemini; la cosecha guarda solo las cantidades confirmadas. Las marcas se conservan mientras esta pantalla siga abierta.</p>
    </template>
  </section>
</template>

<style scoped>
.foto-panel { display: grid; gap: 12px; min-width: 0; padding: 12px; margin-bottom: 12px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-border-color), 0.16); border-radius: 8px; }
.archivo { display: none; }
.deteccion-estado { display: grid; gap: 8px; }
.cabecera, .acciones, .pie { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; justify-content: space-between; }
.acciones { justify-content: flex-start; }
.distribucion { display: grid; gap: 12px; }
.fila { display: grid; grid-template-columns: minmax(0, 1fr) 110px; gap: 12px; align-items: start; padding: 8px 0; border-bottom: 1px solid rgba(var(--v-border-color), 0.16); }
.etiqueta { display: flex; align-items: center; gap: 8px; overflow-wrap: anywhere; }
.punto { flex: 0 0 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(var(--v-border-color), 0.4); }
.cantidad { min-width: 0; }
.pie :deep(.v-btn) { max-width: 100%; }
@media (max-width: 380px) { .fila { grid-template-columns: minmax(0, 1fr) 90px; gap: 8px; } }
</style>
