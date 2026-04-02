<template>
  <v-card class="rounded-xl elevation-10 pa-5 sticky-control config-card" color="surface">
    <div class="text-h5 font-weight-bold text-medium-emphasis mb-5 ml-1">
      CONFIGURACIÓN DE REPORTE
    </div>

    <div class="mb-5">
      <label class="custom-label text-caption font-weight-bold mb-2">UBICACIÓN ACTIVA</label>
      <v-select
        v-model="selectedFincaId"
        :items="fincas"
        item-title="nombre"
        item-value="id"
        label="Ubicación activa"
        aria-label="Seleccionar finca activa"
        variant="outlined"
        hide-details
        class="super-select"
        menu-icon="mdi-chevron-down"
        :disabled="loading"
      >
        <template #selection="{ item }">
          <div class="d-flex align-center py-2 selection-finca">
            <v-avatar color="success" variant="tonal" rounded="lg" size="44" class="mr-3">
              <v-icon size="28">mdi-tree</v-icon>
            </v-avatar>
            <div class="d-flex flex-column selection-finca-text">
              <span
                class="text-h6 font-weight-black text-high-emphasis finca-title-wrap"
                :title="String(item.title || '')"
                style="line-height: 1.2;"
              >
                {{ item.title }}
              </span>
              <span class="text-body-2 font-weight-bold text-medium-emphasis">
                Sector Principal
              </span>
            </div>
          </div>
        </template>
      </v-select>
    </div>

    <div class="mb-6">
      <label class="custom-label text-caption font-weight-bold mb-2">FECHA DE CORTE</label>
      <v-menu v-model="menuFechaValue" :close-on-content-click="false" location="bottom center">
        <template #activator="{ props }">
          <v-card
            v-bind="props"
            variant="outlined"
            class="d-flex align-center pa-3 rounded-xl cursor-pointer hover-effect border-input"
            flat
            color="surface"
            :disabled="loading"
            role="button"
            tabindex="0"
            aria-label="Seleccionar fecha de corte"
          >
            <v-avatar color="info" variant="tonal" rounded="lg" size="44" class="mr-3">
              <v-icon size="28">mdi-calendar-range</v-icon>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-black text-high-emphasis" style="line-height: 1;">
                {{ fechaFormateada }}
              </div>
              <div class="text-body-2 font-weight-bold text-medium-emphasis mt-1">
                {{ infoDiaSemana }}
              </div>
            </div>
            <v-spacer />
            <v-icon color="medium-emphasis" size="24">mdi-pencil</v-icon>
          </v-card>
        </template>

        <v-date-picker
          v-model="fechaPickerValue"
          color="primary"
          :min="fechaMinima"
          :max="fechaMaxima"
          :allowed-dates="fechaPermitida"
          aria-label="Calendario de selección de fecha de corte"
          @update:model-value="menuFechaValue = false"
        />
      </v-menu>
      <div class="text-caption text-medium-emphasis mt-2">
        Fechas con cosecha registrada se muestran bloqueadas en el calendario.
      </div>
      <v-alert
        v-if="estadoFechaSeleccionada"
        class="mt-3"
        variant="tonal"
        density="compact"
        :type="estadoFechaSeleccionada.cosecha && estadoFechaSeleccionada.voucher ? 'warning' : 'info'"
      >
        <span v-if="estadoFechaSeleccionada.cosecha && estadoFechaSeleccionada.voucher">
          Esta fecha ya tiene registro de cosecha y voucher.
        </span>
        <span v-else-if="estadoFechaSeleccionada.cosecha">
          Esta fecha ya tiene registro de cosecha.
        </span>
        <span v-else>
          Esta fecha ya tiene voucher registrado.
        </span>
      </v-alert>
    </div>

    <v-divider class="mb-6 border-dashed" />

    <v-btn
      block
      size="x-large"
      color="primary"
      class="rounded-xl py-7 font-weight-black elevation-6 button-glow mb-4 text-h6"
      height="72"
      :loading="loading || submitting"
      :disabled="loading || submitting || totalDigitado === 0 || !selectedFincaId"
      aria-label="Enviar reporte de cosecha"
      @click="$emit('guardar')"
    >
      <v-icon start size="32">mdi-cloud-upload</v-icon>
      ENVIAR REPORTE
    </v-btn>

    <div class="text-center">
      <v-chip size="default" variant="text" class="font-weight-bold text-medium-emphasis remaining-chip">
        <v-icon start size="small" color="success">mdi-circle-medium</v-icon>
        RESTAN EN CAMPO: <strong class="ml-1 text-high-emphasis text-h5">{{ totalRestante }}</strong>
      </v-chip>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { Finca } from '@/stores/fincaStore';
import type { FechaOcupadaState } from '@/composables/useFechasOcupadas';

interface Props {
  fincas: Finca[];
  fechaFormateada: string;
  infoDiaSemana: string;
  fechaMinima: Date;
  fechaMaxima: Date;
  loading: boolean;
  submitting: boolean;
  totalDigitado: number;
  totalRestante: number;
  estadoFechaSeleccionada: FechaOcupadaState | null;
  fechaPermitida: (value: unknown) => boolean;
}

withDefaults(defineProps<Props>(), {
  estadoFechaSeleccionada: null,
});

defineEmits<{
  (e: 'guardar'): void;
}>();

const selectedFincaId = defineModel<number | null>('selectedFincaId', { required: true });
const menuFechaValue = defineModel<boolean>('menuFecha', { required: true });
const fechaPickerValue = defineModel<Date | null>('fechaPicker', { required: true });
</script>

<style scoped>
.custom-label {
  display: block;
  letter-spacing: 1px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-transform: uppercase;
  margin-left: 4px;
}

.super-select :deep(.v-field__outline) {
  --v-field-border-opacity: 0.15;
}

.super-select :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
  color: rgb(var(--v-theme-primary));
}

.super-select :deep(.v-field) {
  border-radius: 12px !important;
  padding-top: 8px;
  padding-bottom: 8px;
}

.super-select :deep(.v-select__selection-text) {
  white-space: normal;
  line-height: 1.15;
}

.hover-effect:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.button-glow {
  box-shadow: 0 10px 25px -5px rgba(var(--v-theme-primary), 0.5) !important;
}

.sticky-control {
  position: sticky;
  top: 20px;
  z-index: 5;
}

.border-dashed {
  border-style: dashed !important;
  opacity: 0.4;
}

.selection-finca {
  min-width: 0;
}

.selection-finca-text {
  min-width: 0;
}

.finca-title-wrap {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.remaining-chip {
  max-width: 100%;
  white-space: normal;
}

@media (max-width: 960px) {
  .sticky-control {
    position: static;
    top: auto;
  }
}

@media (max-width: 600px) {
  .config-card {
    padding: 16px !important;
  }
}
</style>
