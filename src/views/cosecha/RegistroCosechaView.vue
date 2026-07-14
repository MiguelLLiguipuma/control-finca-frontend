<template>
  <v-container fluid class="pa-4 pt-6 pb-16 bg-background min-h-screen transition-colors">
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-row justify="center">
      <v-col cols="12" class="cosecha-shell">
        <CosechaHeaderCard
          :semana-actual="cosechaStore.semanaActual"
          :rango-corte-sugerido="cosechaStore.rangoCorteSugerido"
          :total-digitado="cosechaStore.totalDigitado"
          :estado-operacion="cosechaStore.estadoOperacion"
          :estado-color="cosechaStore.estadoColor"
        />

        <ViewHelpHint
          class="mb-4"
          title="¿Qué hace esta pantalla de Liquidación de Cosecha?"
          summary="Aquí registras racimos buenos y rechazo por cinta para una fecha específica. El sistema valida saldos y calcula totales automáticamente."
          :steps="[
            'Selecciona finca y fecha de corte.',
            'Ingresa racimos buenos y rechazo por cada cinta.',
            'Revisa el estado operativo y el total digitado.',
            'Envía el reporte cuando ya esté validado.',
          ]"
          :notes="[
            'No puedes exceder el saldo disponible en campo.',
            'Las fechas ya registradas se muestran bloqueadas.',
            'La predicción te ayuda a anticipar el próximo embarque.',
          ]"
        />

        <v-alert
          v-if="!cosechaStore.isOnline || cosechaStore.colaSincronizacion.length || hayConteoSinEnviar"
          :type="!cosechaStore.isOnline ? 'warning' : 'info'"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          <div class="font-weight-bold">
            {{ cosechaStore.isOnline ? 'Conteo protegido localmente' : 'Modo sin conexión activo' }}
          </div>
          <div class="text-body-2">
            <span v-if="!cosechaStore.isOnline">
              Puedes seguir contando y guardar el reporte; quedará en cola para sincronizar cuando vuelva la conexión.
            </span>
            <span v-else>
              El conteo actual se guarda como borrador local mientras trabajas.
            </span>
            <span v-if="cosechaStore.colaSincronizacion.length" class="font-weight-bold">
              Pendientes por sincronizar: {{ cosechaStore.colaSincronizacion.length }}.
            </span>
          </div>
        </v-alert>

        <v-row>
          <v-col cols="12" lg="4" xl="3">
            <CosechaConfigPanel
              v-model:selected-finca-id="fincaSeleccionada"
              v-model:menu-fecha="menuFecha"
              v-model:fecha-picker="fechaObjetoPicker"
              :fincas="fincas"
              :fecha-formateada="fechaFormateada"
              :info-dia-semana="infoDiaSemana"
              :fecha-minima="fechaMinima"
              :fecha-maxima="fechaMaxima"
              :loading="cosechaStore.loading"
              :submitting="cosechaStore.submitting"
              :total-digitado="cosechaStore.totalDigitado"
              :total-restante="cosechaStore.totalRestante"
              :estado-fecha-seleccionada="estadoFechaSeleccionada"
              :fecha-permitida="fechaCosechaPermitida"
              @guardar="guardarCosecha"
            />
          </v-col>

          <v-col cols="12" lg="8" xl="9">
            <PanelPrediccionCosecha v-if="fincaSeleccionada" :finca-id="fincaSeleccionada" />
            <v-card border variant="flat" class="conteo-semanas-card mb-4">
              <v-card-text class="pa-4">
                <div class="d-flex align-center justify-space-between gap-3 flex-wrap mb-3">
                  <div>
                    <div class="text-subtitle-1 font-weight-black text-high-emphasis">
                      Semanas habilitadas para conteo con cámara
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      El scanner solo sumará racimos a las semanas marcadas.
                    </div>
                  </div>
                  <v-chip color="primary" variant="tonal" class="font-weight-black">
                    {{ semanasConteoSeleccionadas.length }} seleccionada(s)
                  </v-chip>
                </div>

                <div class="d-flex align-center gap-2 flex-wrap mb-3">
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="success"
                    prepend-icon="mdi-basket-check-outline"
                    @click="seleccionarCorteSugerido"
                  >
                    Corte sugerido
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    prepend-icon="mdi-select-all"
                    @click="seleccionarTodasSemanas"
                  >
                    Todas con saldo
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="text"
                    color="medium-emphasis"
                    prepend-icon="mdi-close-circle-outline"
                    @click="limpiarSemanasConteo"
                  >
                    Limpiar
                  </v-btn>
                </div>

                <v-chip-group
                  v-model="semanasConteoSeleccionadas"
                  multiple
                  selected-class="conteo-semana-chip--selected"
                  class="conteo-semana-group"
                >
                  <v-chip
                    v-for="option in semanaConteoOptions"
                    :key="option.key"
                    :value="option.key"
                    filter
                    variant="outlined"
                    class="conteo-semana-chip"
                  >
                    <span class="conteo-semana-dot" :style="{ backgroundColor: option.hex }" />
                    <span class="font-weight-black">{{ option.label }}</span>
                    <span class="text-caption text-medium-emphasis ml-1">
                      {{ option.subtitle }}
                    </span>
                    <span
                      v-if="option.esRetrasada"
                      class="conteo-semana-badge ml-2"
                    >
                      Retrasada
                    </span>
                  </v-chip>
                </v-chip-group>

                <v-alert
                  v-if="!semanasConteoSeleccionadas.length"
                  type="warning"
                  variant="tonal"
                  density="compact"
                  class="mt-3"
                >
                  Selecciona al menos una semana para habilitar el conteo con cámara.
                </v-alert>
              </v-card-text>
            </v-card>
            <CintaColorScanner
              :countable-colors="coloresHabilitadosParaConteo"
              @detected="handleColorDetectado"
              @counted="handleRacimoContado"
            />

            <div v-if="cosechaStore.loading" class="text-center pa-12">
              <v-progress-circular indeterminate size="80" width="8" color="primary" />
              <div class="mt-4 text-h6 font-weight-bold text-medium-emphasis">
                Sincronizando datos de campo...
              </div>
            </div>

            <CosechaSaldosPorAnio
              v-else
              :sorted-years="sortedYears"
              :obtener-color-tarjeta="obtenerColorTarjeta"
              :obtener-variante-tarjeta="obtenerVarianteTarjeta"
              :active-color="colorDetectado"
              @adjust="handleAjuste"
              @set-field="setCampoDigitacion"
              @maximize="handleMaximizarBuenos"
              @normalize="normalizarDigitacion"
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import CintaColorScanner from '@/components/cosecha/CintaColorScanner.vue';
import CosechaConfigPanel from '@/components/cosecha/CosechaConfigPanel.vue';
import CosechaHeaderCard from '@/components/cosecha/CosechaHeaderCard.vue';
import CosechaSaldosPorAnio from '@/components/cosecha/CosechaSaldosPorAnio.vue';
import PanelPrediccionCosecha from '@/components/cosecha/PanelPrediccionCosecha.vue';
import ViewHelpHint from '@/components/ui/ViewHelpHint.vue';
import { useRegistroCosecha } from '@/composables/useRegistroCosecha';
import {
  normalizeCintaColorName,
  type CintaColorNombre,
} from '@/domain/cosecha/cintaColorRecognition';
import type { CintaCosecha } from '@/stores/cosecha/cosechaStore';

interface AjustePayload {
  item: CintaCosecha;
  campo: 'cantidad_a_cosechar' | 'rechazo';
  delta: number;
}

interface SemanaConteoOption {
  key: string;
  label: string;
  subtitle: string;
  hex: string;
  colorNombre: CintaColorNombre;
  saldo: number;
  edad: number;
  esCorteSugerido: boolean;
  esRetrasada: boolean;
}

const {
  cosechaStore,
  fincas,
  fincaSeleccionada,
  fechaObjetoPicker,
  menuFecha,
  snackbar,
  sortedYears,
  fechaFormateada,
  infoDiaSemana,
  fechaMaxima,
  fechaMinima,
  estadoFechaSeleccionada,
  hayConteoSinEnviar,
  obtenerColorTarjeta,
  obtenerVarianteTarjeta,
  fechaCosechaPermitida,
  setCampoDigitacion,
  normalizarDigitacion,
  guardarCosecha,
} = useRegistroCosecha();

const colorDetectado = shallowRef<CintaColorNombre | null>(null);
const semanasConteoSeleccionadas = ref<string[]>([]);

const semanaConteoOptions = computed<SemanaConteoOption[]>(() =>
  cosechaStore.saldosPendientes
    .filter((item) => Number(item.saldo_en_campo || 0) > 0)
    .flatMap((item) => {
      const edad = cosechaStore.calcularEdadExacta(item.semana_enfunde, item.anio);
      const colorNombre = normalizeCintaColorName(item.color_cinta);
      if (!colorNombre) return [];

      return [{
        key: getSemanaConteoKey(item),
        label: `Sem ${item.semana_enfunde}/${item.anio}`,
        subtitle: `${item.color_cinta} · ${edad} sem · ${item.saldo_en_campo} disp.`,
        hex: item.color_hex,
        colorNombre,
        saldo: Number(item.saldo_en_campo || 0),
        edad,
        esCorteSugerido: cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio),
        esRetrasada: edad > cosechaStore.semanaFinCorte,
      }];
    })
    .sort((a, b) => {
      if (a.esCorteSugerido !== b.esCorteSugerido) return a.esCorteSugerido ? -1 : 1;
      if (a.esRetrasada !== b.esRetrasada) return a.esRetrasada ? -1 : 1;
      return b.edad - a.edad;
    }),
);

const semanaConteoSeleccionadaSet = computed(
  () => new Set(semanasConteoSeleccionadas.value),
);

const coloresHabilitadosParaConteo = computed<CintaColorNombre[]>(() =>
  Array.from(
    new Set(
      cosechaStore.saldosPendientes
        .filter(
          (item) =>
            semanaConteoSeleccionadaSet.value.has(getSemanaConteoKey(item)) &&
            saldoDisponible(item) > 0,
        )
        .map((item) => normalizeCintaColorName(item.color_cinta))
        .filter((color): color is CintaColorNombre => color !== null),
    ),
  ),
);

watch(
  semanaConteoOptions,
  (options) => {
    const validKeys = new Set(options.map((option) => option.key));
    const seleccionVigente = semanasConteoSeleccionadas.value.filter((key) =>
      validKeys.has(key),
    );

    if (seleccionVigente.length !== semanasConteoSeleccionadas.value.length) {
      semanasConteoSeleccionadas.value = seleccionVigente;
    }

    if (!semanasConteoSeleccionadas.value.length && options.length) {
      seleccionarCorteSugerido();
    }
  },
  { immediate: true },
);

function handleColorDetectado(color: CintaColorNombre | null) {
  colorDetectado.value = color;
}

function getSemanaConteoKey(item: CintaCosecha): string {
  return `${item.anio}-${item.semana_enfunde}`;
}

function seleccionarCorteSugerido() {
  const corte = semanaConteoOptions.value.filter((option) => option.esCorteSugerido);
  semanasConteoSeleccionadas.value = corte.map((option) => option.key);
}

function seleccionarTodasSemanas() {
  semanasConteoSeleccionadas.value = semanaConteoOptions.value.map((option) => option.key);
}

function limpiarSemanasConteo() {
  semanasConteoSeleccionadas.value = [];
}

function saldoDisponible(item: CintaCosecha): number {
  return Math.max(
    0,
    Number(item.saldo_en_campo || 0) -
      Number(item.cantidad_a_cosechar || 0) -
      Number(item.rechazo || 0),
  );
}

function scoreCintaParaConteo(item: CintaCosecha): number {
  if (cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)) return 0;
  if (cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)) return 1;
  return 2;
}

function handleRacimoContado(color: CintaColorNombre) {
  const candidatos = cosechaStore.saldosPendientes
    .filter(
      (item) =>
        normalizeCintaColorName(item.color_cinta) === color &&
        semanaConteoSeleccionadaSet.value.has(getSemanaConteoKey(item)) &&
        saldoDisponible(item) > 0,
    )
    .sort((a, b) => {
      const score = scoreCintaParaConteo(a) - scoreCintaParaConteo(b);
      if (score !== 0) return score;
      const edadA = cosechaStore.calcularEdadExacta(a.semana_enfunde, a.anio);
      const edadB = cosechaStore.calcularEdadExacta(b.semana_enfunde, b.anio);
      return edadB - edadA;
    });

  const item = candidatos[0];
  if (!item) {
    snackbar.value = {
      show: true,
      message: `No hay saldo disponible para cinta ${color} en las semanas seleccionadas.`,
      color: 'warning',
    };
    return;
  }

  item.cantidad_a_cosechar += 1;
  cosechaStore.normalizarItemDigitacion(item);
  colorDetectado.value = color;
}

function handleAjuste({ item, campo, delta }: AjustePayload) {
  cosechaStore.ajustarDigitacion(item, campo, delta);
}

function handleMaximizarBuenos(item: CintaCosecha) {
  cosechaStore.maximizarBuenos(item);
}
</script>

<style scoped>
.cosecha-shell {
  max-width: 1880px;
}

.conteo-semanas-card {
  border-radius: 8px;
}

.conteo-semana-group {
  max-height: 172px;
  overflow-y: auto;
}

.conteo-semana-chip {
  margin-bottom: 8px;
}

.conteo-semana-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.28);
  border-radius: 999px;
}

.conteo-semana-badge {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(var(--v-theme-warning), 0.16);
  color: rgb(var(--v-theme-warning));
  font-size: 0.68rem;
  font-weight: 900;
}

:deep(.conteo-semana-chip--selected) {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.1) !important;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>
