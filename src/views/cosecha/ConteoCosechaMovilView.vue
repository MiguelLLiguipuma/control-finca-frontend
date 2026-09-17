<template>
  <v-container fluid class="mobile-count pa-3 pb-16">
    <div class="mobile-count__header">
      <div>
        <div class="text-caption text-medium-emphasis font-weight-bold">Conteo móvil</div>
        <h1 class="text-h5 font-weight-black text-high-emphasis">Cosecha en campo</h1>
      </div>
      <v-chip
        :color="cosechaStore.isOnline ? 'success' : 'warning'"
        variant="tonal"
        class="font-weight-bold"
      >
        {{ cosechaStore.isOnline ? 'En línea' : 'Sin conexión' }}
      </v-chip>
    </div>

    <v-alert
      v-if="!cosechaStore.isOnline || cosechaStore.colaSincronizacion.length || hayConteoSinEnviar"
      :type="!cosechaStore.isOnline ? 'warning' : 'info'"
      variant="tonal"
      density="comfortable"
      class="mb-3"
    >
      <div class="font-weight-bold">
        {{ cosechaStore.isOnline ? 'Borrador protegido' : 'Modo campo sin conexión' }}
      </div>
      <div class="text-caption">
        El conteo se conserva en este celular. Pendientes: {{ cosechaStore.colaSincronizacion.length }}.
      </div>
    </v-alert>

    <section class="mobile-count__section">
      <v-select
        v-model="fincaSeleccionada"
        :items="fincas"
        item-title="nombre"
        item-value="id"
        label="Finca"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-map-marker-radius"
        hide-details
      />
      <v-text-field
        v-model="fechaCampo"
        type="date"
        label="Fecha de corte"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-calendar"
        hide-details
      />
    </section>

    <section class="mobile-count__totals">
      <div>
        <span class="text-caption text-medium-emphasis font-weight-bold">Digitado</span>
        <strong>{{ cosechaStore.totalDigitado }}</strong>
      </div>
      <div>
        <span class="text-caption text-medium-emphasis font-weight-bold">Restante</span>
        <strong>{{ cosechaStore.totalRestante }}</strong>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        :loading="cosechaStore.submitting"
        :disabled="cosechaStore.totalDigitado <= 0"
        @click="guardarCosecha"
      >
        Enviar
      </v-btn>
    </section>

    <section class="mobile-count__section">
      <div class="mobile-count__section-title">
        <div>
          <div class="text-subtitle-2 font-weight-black">Cinta a contar</div>
          <div class="text-caption text-medium-emphasis">Toca una cinta y usa los botones grandes.</div>
        </div>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="cosechaStore.loading"
          @click="refrescar"
        >
          Actualizar
        </v-btn>
      </div>

      <v-chip-group
        v-model="calendarioSeleccionadoId"
        mandatory
        selected-class="mobile-count__chip--selected"
        class="mobile-count__chips"
      >
        <v-chip
          v-for="item in cintasDisponibles"
          :key="item.calendario_id"
          :value="item.calendario_id"
          class="mobile-count__chip"
          variant="outlined"
        >
          <span class="mobile-count__dot" :style="{ backgroundColor: item.color_hex }" />
          <span class="font-weight-black">{{ item.color_cinta }}</span>
          <span class="text-caption ml-1">Sem {{ item.semana_enfunde }}</span>
        </v-chip>
      </v-chip-group>
    </section>

    <section class="mobile-count__section">
      <div class="mobile-count__section-title">
        <div>
          <div class="text-subtitle-2 font-weight-black">Conteo por foto</div>
          <div class="text-caption text-medium-emphasis">
            Captura racimos, corrige el total y distribuye por color.
          </div>
        </div>
        <v-chip :color="fotoResultado ? 'success' : 'primary'" variant="tonal" class="font-weight-black">
          {{ fotoResultado ? `${fotoResultado.detectados} detectados` : 'Experimental' }}
        </v-chip>
      </div>

      <input
        ref="fotoInputRef"
        class="mobile-count__file"
        type="file"
        accept="image/*"
        capture="environment"
        @change="analizarFoto"
      >

      <div class="mobile-count__camera-actions">
        <v-btn
          color="primary"
          variant="flat"
          rounded="lg"
          prepend-icon="mdi-camera"
          :loading="analizandoFoto"
          @click="abrirCamara"
        >
          Tomar foto
        </v-btn>
        <v-btn
          color="medium-emphasis"
          variant="outlined"
          rounded="lg"
          prepend-icon="mdi-refresh"
          :disabled="!fotoResultado"
          @click="limpiarFoto"
        >
          Limpiar
        </v-btn>
      </div>

      <div v-if="fotoPreviewUrl" class="mobile-count__photo-wrap">
        <img :src="fotoPreviewUrl" alt="Foto analizada de racimos" class="mobile-count__photo">
      </div>

      <v-alert v-if="fotoError" type="warning" variant="tonal" density="compact">
        {{ fotoError }}
      </v-alert>

      <div v-if="fotoResultado" class="mobile-count__distribution">
        <div class="mobile-count__detected-total">
          <div>
            <span class="text-caption text-medium-emphasis font-weight-bold">Total detectado</span>
            <strong>{{ conteoFotoTotal }}</strong>
          </div>
          <div class="mobile-count__stepper">
            <v-btn icon="mdi-minus" variant="tonal" size="small" @click="ajustarConteoFoto(-1)" />
            <v-btn icon="mdi-plus" variant="tonal" size="small" @click="ajustarConteoFoto(1)" />
          </div>
        </div>

        <div class="mobile-count__distribution-list">
          <div
            v-for="item in cintasDisponibles"
            :key="`dist-${item.calendario_id}`"
            class="mobile-count__distribution-row"
          >
            <div class="mobile-count__distribution-label">
              <span class="mobile-count__dot" :style="{ backgroundColor: item.color_hex }" />
              <div>
                <strong>{{ item.color_cinta }}</strong>
                <span>Sem {{ item.semana_enfunde }} · disp. {{ saldoDisponible(item) }}</span>
              </div>
            </div>
            <v-text-field
              v-model.number="distribucionPorCalendario[item.calendario_id]"
              type="number"
              min="0"
              :max="saldoDisponible(item)"
              variant="outlined"
              density="compact"
              hide-details
              inputmode="numeric"
              class="mobile-count__distribution-input"
              @update:model-value="normalizarDistribucion(item)"
            />
          </div>
        </div>

        <div class="mobile-count__distribution-footer">
          <v-chip
            :color="pendienteDistribuir === 0 ? 'success' : 'warning'"
            variant="tonal"
            class="font-weight-bold"
          >
            Pendiente {{ pendienteDistribuir }}
          </v-chip>
          <v-btn
            color="success"
            variant="flat"
            rounded="lg"
            prepend-icon="mdi-check"
            :disabled="totalDistribuido <= 0"
            @click="aplicarDistribucion"
          >
            Aplicar al conteo
          </v-btn>
        </div>
      </div>
    </section>

    <v-card v-if="cintaActiva" class="mobile-count__counter" variant="flat" border>
      <v-card-text>
        <div class="mobile-count__counter-head">
          <v-avatar
            :style="{ backgroundColor: cintaActiva.color_hex + '22' }"
            rounded="lg"
            size="52"
          >
            <v-icon :style="{ color: cintaActiva.color_hex }">mdi-tag</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis font-weight-bold">Cinta seleccionada</div>
            <div class="text-h6 font-weight-black" :style="{ color: cintaActiva.color_hex }">
              {{ cintaActiva.color_cinta }} · Semana {{ cintaActiva.semana_enfunde }}/{{ cintaActiva.anio }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Edad {{ cintaActiva.edad }} sem · Disponible {{ saldoDisponible(cintaActiva) }}
            </div>
          </div>
        </div>

        <div class="mobile-count__numbers">
          <div>
            <span>Buenos</span>
            <strong>{{ cintaActiva.cantidad_a_cosechar }}</strong>
          </div>
          <div>
            <span>Rechazo</span>
            <strong>{{ cintaActiva.rechazo }}</strong>
          </div>
        </div>

        <div class="mobile-count__actions">
          <v-btn color="success" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'cantidad_a_cosechar', 1)">
            +1 Bueno
          </v-btn>
          <v-btn color="success" variant="tonal" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'cantidad_a_cosechar', 10)">
            +10
          </v-btn>
          <v-btn color="error" variant="tonal" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'rechazo', 1)">
            +1 Rechazo
          </v-btn>
          <v-btn color="medium-emphasis" variant="outlined" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'cantidad_a_cosechar', -1)">
            -1
          </v-btn>
        </div>

        <div class="mobile-count__secondary">
          <v-btn variant="text" color="primary" prepend-icon="mdi-basket-check" @click="llenarSaldo(cintaActiva)">
            Todo el saldo
          </v-btn>
          <v-btn variant="text" color="error" prepend-icon="mdi-broom" @click="limpiarCinta(cintaActiva)">
            Limpiar cinta
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-else type="info" variant="tonal" class="mt-3">
      No hay cintas con saldo para esta finca.
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRegistroCosecha } from '@/composables/useRegistroCosecha';
import type { CintaCosecha } from '@/stores/cosecha/cosechaStore';
import { toLocalIsoDate } from '@/utils/dateIso';

type CampoConteo = 'cantidad_a_cosechar' | 'rechazo';

interface FotoResultado {
  detectados: number;
  confianza: 'baja' | 'media' | 'alta';
  componentes: number;
}

const {
  cosechaStore,
  fincas,
  fincaSeleccionada,
  fechaObjetoPicker,
  hayConteoSinEnviar,
  cargarSaldos,
  guardarCosecha,
} = useRegistroCosecha();

const calendarioSeleccionadoId = ref<number | null>(null);
const fotoInputRef = ref<HTMLInputElement | null>(null);
const fotoPreviewUrl = ref<string | null>(null);
const fotoResultado = ref<FotoResultado | null>(null);
const fotoError = ref('');
const analizandoFoto = ref(false);
const conteoFotoTotal = ref(0);
const distribucionPorCalendario = reactive<Record<number, number>>({});

const fechaCampo = computed({
  get: () => (fechaObjetoPicker.value ? toLocalIsoDate(fechaObjetoPicker.value) : ''),
  set: (value: string) => {
    fechaObjetoPicker.value = value ? new Date(`${value}T00:00:00`) : null;
  },
});

const cintasDisponibles = computed(() =>
  cosechaStore.saldosPendientes
    .filter((item) => Number(item.saldo_en_campo || 0) > 0)
    .sort((a, b) => {
      const corteA = cosechaStore.esFrutaDeCorte(a.semana_enfunde, a.anio) ? 0 : 1;
      const corteB = cosechaStore.esFrutaDeCorte(b.semana_enfunde, b.anio) ? 0 : 1;
      if (corteA !== corteB) return corteA - corteB;
      return b.edad - a.edad;
    }),
);

const cintaActiva = computed(() =>
  cintasDisponibles.value.find(
    (item) => item.calendario_id === calendarioSeleccionadoId.value,
  ) || null,
);

const totalDistribuido = computed(() =>
  Object.values(distribucionPorCalendario).reduce(
    (total, value) => total + Math.max(0, Number(value || 0)),
    0,
  ),
);

const pendienteDistribuir = computed(() =>
  Math.max(0, Number(conteoFotoTotal.value || 0) - totalDistribuido.value),
);

watch(
  cintasDisponibles,
  (items) => {
    if (!items.length) {
      calendarioSeleccionadoId.value = null;
      return;
    }
    const existe = items.some((item) => item.calendario_id === calendarioSeleccionadoId.value);
    if (!existe) calendarioSeleccionadoId.value = items[0].calendario_id;
  },
  { immediate: true },
);

function saldoDisponible(item: CintaCosecha) {
  return Math.max(
    0,
    Number(item.saldo_en_campo || 0) -
      Number(item.cantidad_a_cosechar || 0) -
      Number(item.rechazo || 0),
  );
}

function sumar(item: CintaCosecha, campo: CampoConteo, delta: number) {
  cosechaStore.ajustarDigitacion(item, campo, delta);
}

function llenarSaldo(item: CintaCosecha) {
  cosechaStore.maximizarBuenos(item);
}

function limpiarCinta(item: CintaCosecha) {
  item.cantidad_a_cosechar = 0;
  item.rechazo = 0;
  cosechaStore.normalizarItemDigitacion(item);
}

async function refrescar() {
  if (!fincaSeleccionada.value) return;
  await cargarSaldos(fincaSeleccionada.value);
}

function abrirCamara() {
  fotoInputRef.value?.click();
}

function limpiarFoto() {
  if (fotoPreviewUrl.value) URL.revokeObjectURL(fotoPreviewUrl.value);
  fotoPreviewUrl.value = null;
  fotoResultado.value = null;
  fotoError.value = '';
  conteoFotoTotal.value = 0;
  limpiarDistribucion();
  if (fotoInputRef.value) fotoInputRef.value.value = '';
}

async function analizarFoto(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  analizandoFoto.value = true;
  fotoError.value = '';
  if (fotoPreviewUrl.value) URL.revokeObjectURL(fotoPreviewUrl.value);
  fotoPreviewUrl.value = URL.createObjectURL(file);

  try {
    const image = await cargarImagen(file);
    const resultado = estimarRacimosDesdeImagen(image);
    fotoResultado.value = resultado;
    conteoFotoTotal.value = resultado.detectados;
    prepararDistribucion(resultado.detectados);
  } catch {
    fotoResultado.value = null;
    conteoFotoTotal.value = 0;
    limpiarDistribucion();
    fotoError.value = 'No se pudo analizar la foto. Intente con mejor luz o cuente manualmente.';
  } finally {
    analizandoFoto.value = false;
  }
}

function cargarImagen(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen invalida'));
    };
    image.src = url;
  });
}

function estimarRacimosDesdeImagen(image: HTMLImageElement): FotoResultado {
  const maxWidth = 260;
  const scale = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('canvas no disponible');

  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const mask = new Uint8Array(width * height);

  for (let index = 0; index < pixels.length; index += 4) {
    const pixelIndex = index / 4;
    if (esPixelRacimo(pixels[index], pixels[index + 1], pixels[index + 2])) {
      mask[pixelIndex] = 1;
    }
  }

  const componentes = contarComponentes(mask, width, height);
  const area = mask.reduce((total, value) => total + value, 0);
  const estimadoPorArea = Math.round(area / 520);
  const detectados = Math.max(0, Math.min(99, componentes || estimadoPorArea));
  const confianza = componentes >= 4 ? 'alta' : componentes >= 2 ? 'media' : 'baja';

  return {
    detectados,
    confianza,
    componentes,
  };
}

function esPixelRacimo(red: number, green: number, blue: number) {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const yellowGreen = red > 70 && green > 65 && blue < 175 && green >= blue * 1.12;
  const warmYellow = red > 100 && green > 85 && blue < 145 && red >= green * 0.78;
  return max > 85 && saturation > 0.18 && (yellowGreen || warmYellow);
}

function contarComponentes(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(mask.length);
  let count = 0;
  const stack: number[] = [];

  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue;

    let area = 0;
    visited[index] = 1;
    stack.push(index);

    while (stack.length) {
      const current = stack.pop() as number;
      area += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];

      for (const next of neighbors) {
        if (next >= 0 && mask[next] && !visited[next]) {
          visited[next] = 1;
          stack.push(next);
        }
      }
    }

    if (area >= 24 && area <= 8500) count += 1;
  }

  return count;
}

function prepararDistribucion(total: number) {
  limpiarDistribucion();
  const activa = cintaActiva.value || cintasDisponibles.value[0];
  if (!activa) return;
  distribucionPorCalendario[activa.calendario_id] = Math.min(total, saldoDisponible(activa));
}

function limpiarDistribucion() {
  Object.keys(distribucionPorCalendario).forEach((key) => {
    delete distribucionPorCalendario[Number(key)];
  });
}

function ajustarConteoFoto(delta: number) {
  conteoFotoTotal.value = Math.max(0, Math.min(99, conteoFotoTotal.value + delta));
}

function normalizarDistribucion(item: CintaCosecha) {
  const value = Math.max(
    0,
	    Math.min(
	      Number(distribucionPorCalendario[item.calendario_id] || 0),
	      saldoDisponible(item),
	    ),
	  );
	  distribucionPorCalendario[item.calendario_id] = Math.trunc(value);
}

function aplicarDistribucion() {
  cintasDisponibles.value.forEach((item) => {
    const cantidad = Math.max(0, Number(distribucionPorCalendario[item.calendario_id] || 0));
    if (!cantidad) return;
    cosechaStore.ajustarDigitacion(item, 'cantidad_a_cosechar', Math.trunc(cantidad));
  });
  limpiarFoto();
}
</script>

<style scoped>
.mobile-count {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.mobile-count__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.mobile-count__section,
.mobile-count__totals,
.mobile-count__counter {
  margin-bottom: 12px;
  border-radius: 8px;
}

.mobile-count__file {
  display: none;
}

.mobile-count__section {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: rgb(var(--v-theme-surface));
}

.mobile-count__section-title,
.mobile-count__totals,
.mobile-count__counter-head,
.mobile-count__secondary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mobile-count__totals {
  position: sticky;
  top: 8px;
  z-index: 2;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.mobile-count__totals div,
.mobile-count__numbers div {
  display: grid;
  gap: 2px;
}

.mobile-count__totals strong {
  font-size: 1.35rem;
  line-height: 1;
}

.mobile-count__chips {
  max-height: 136px;
  overflow-y: auto;
}

.mobile-count__chip {
  min-height: 42px;
  margin-bottom: 6px;
}

.mobile-count__chip--selected {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.1) !important;
}

.mobile-count__dot {
  width: 13px;
  height: 13px;
  margin-right: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
}

.mobile-count__counter {
  background: rgb(var(--v-theme-surface));
}

.mobile-count__numbers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 18px 0;
}

.mobile-count__numbers div {
  min-height: 92px;
  place-items: center;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.mobile-count__numbers span {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.mobile-count__numbers strong {
  font-size: 2.6rem;
  line-height: 1;
}

.mobile-count__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mobile-count__camera-actions,
.mobile-count__distribution-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mobile-count__photo-wrap {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.mobile-count__photo {
  display: block;
  width: 100%;
  max-height: 260px;
  object-fit: cover;
}

.mobile-count__distribution {
  display: grid;
  gap: 10px;
}

.mobile-count__detected-total,
.mobile-count__distribution-row,
.mobile-count__distribution-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.mobile-count__detected-total {
  padding: 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.mobile-count__detected-total strong {
  display: block;
  font-size: 2.3rem;
  line-height: 1;
}

.mobile-count__stepper {
  display: flex;
  gap: 8px;
}

.mobile-count__distribution-list {
  display: grid;
  gap: 8px;
}

.mobile-count__distribution-row {
  padding: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 8px;
}

.mobile-count__distribution-label {
  justify-content: flex-start;
  min-width: 0;
}

.mobile-count__distribution-label div {
  display: grid;
}

.mobile-count__distribution-label span:last-child {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.72rem;
}

.mobile-count__distribution-input {
  max-width: 94px;
}

.mobile-count__actions :deep(.v-btn) {
  min-height: 64px;
  font-weight: 900;
}

.mobile-count__secondary {
  margin-top: 8px;
  flex-wrap: wrap;
}

@media (max-width: 420px) {
  .mobile-count__header,
  .mobile-count__counter-head,
  .mobile-count__section-title {
    align-items: flex-start;
  }

  .mobile-count__actions {
    grid-template-columns: 1fr;
  }

  .mobile-count__camera-actions,
  .mobile-count__distribution-footer {
    grid-template-columns: 1fr;
  }
}
</style>
