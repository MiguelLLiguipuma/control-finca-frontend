<template>
  <v-card
    rounded="xl"
    class="mb-3 border-s-xl elevation-2"
    :style="{ borderLeftColor: `${item.color_hex} !important`, borderLeftWidth: '8px !important' }"
    :color="cardColor"
    :variant="cardVariant"
  >
    <v-card-text class="pa-4">
      <div v-if="isCurrentCut || isReadyForCut" class="mb-3">
        <v-chip
          v-if="isCurrentCut"
          color="error"
          size="small"
          class="font-weight-black mr-2"
        >
          <v-icon start size="small">mdi-alert-circle</v-icon>
          CORTE DE ESTA SEMANA
        </v-chip>

        <v-chip
          v-else-if="isReadyForCut"
          color="warning"
          size="small"
          class="font-weight-black"
        >
          <v-icon start size="small">mdi-basket</v-icon>
          LISTA PARA CORTE
        </v-chip>
      </div>

      <v-row align="center">
        <v-col cols="12" sm="4">
          <div class="d-flex align-center">
            <v-avatar :color="item.color_hex" size="64" class="me-4 elevation-3">
              <span class="text-white text-h4 font-weight-black shadow-text">
                {{ item.semana_enfunde }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h5 font-weight-black text-truncate text-high-emphasis">
                {{ item.color_cinta }}
              </div>
              <div class="d-flex align-center gap-2 mt-1">
                <v-chip size="small" variant="outlined" class="font-weight-bold">
                  <span class="text-body-2 font-weight-bold">EDAD: {{ edad }} sem</span>
                </v-chip>
                <span class="text-caption text-disabled">({{ item.anio }})</span>
              </div>
            </div>
          </div>
        </v-col>

        <v-col cols="12" sm="3" class="text-center">
          <div class="text-body-2 font-weight-bold text-medium-emphasis mb-2">
            DISPONIBLE: <span class="text-high-emphasis text-h6">{{ item.saldo_en_campo }}</span>
          </div>
          <v-progress-linear
            v-if="item.cantidad_a_cosechar || item.rechazo"
            height="16"
            rounded
            striped
            :model-value="porcentaje"
            :color="exceeded ? 'error' : 'success'"
          />
        </v-col>

        <v-col cols="12" sm="5">
          <div class="d-flex justify-end flex-wrap gap-4 digitacion-group">
            <div class="text-center">
              <div class="d-flex justify-space-between align-center px-1 mb-1">
                <div class="text-caption font-weight-black text-primary tracking-wider">BUENOS</div>
                <v-btn
                  size="x-small"
                  variant="text"
                  color="primary"
                  class="px-0 py-0"
                  style="height: 14px; min-width: 0;"
                  :aria-label="`Asignar máximo disponible en buenos para ${item.color_cinta}`"
                  @click="$emit('maximize', item)"
                >
                  MAX
                </v-btn>
              </div>
              <v-sheet class="d-flex align-center rounded-lg px-1 input-container" border color="surface">
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="text"
                  :disabled="loading || item.cantidad_a_cosechar <= 0"
                  @click="$emit('adjust', { item, campo: 'cantidad_a_cosechar', delta: -1 })"
                />

                <input
                  v-select-all
                  v-model.number="cantidadBuenos"
                  type="number"
                  class="touch-input text-h5 text-high-emphasis"
                  :disabled="loading"
                  :aria-label="`Cantidad de racimos buenos para ${item.color_cinta}`"
                  inputmode="numeric"
                  min="0"
                  @blur="$emit('normalize', item)"
                >

                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  color="primary"
                  :disabled="loading || exceeded"
                  @click="$emit('adjust', { item, campo: 'cantidad_a_cosechar', delta: 1 })"
                />
              </v-sheet>
            </div>

            <div class="text-center">
              <div class="text-caption font-weight-black text-error mb-1 tracking-wider">RECHAZO</div>
              <v-sheet
                class="d-flex align-center rounded-lg px-1 input-container"
                color="surface"
                style="border: 1px solid rgb(var(--v-theme-error)) !important;"
              >
                <v-btn
                  icon="mdi-minus"
                  size="small"
                  variant="text"
                  color="error"
                  :disabled="loading || item.rechazo <= 0"
                  @click="$emit('adjust', { item, campo: 'rechazo', delta: -1 })"
                />

                <input
                  v-select-all
                  v-model.number="cantidadRechazo"
                  type="number"
                  class="touch-input text-h5 text-error"
                  :disabled="loading"
                  :aria-label="`Cantidad de rechazo para ${item.color_cinta}`"
                  inputmode="numeric"
                  min="0"
                  @blur="$emit('normalize', item)"
                >

                <v-btn
                  icon="mdi-plus"
                  size="small"
                  variant="text"
                  color="error"
                  :disabled="loading || exceeded"
                  @click="$emit('adjust', { item, campo: 'rechazo', delta: 1 })"
                />
              </v-sheet>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CintaCosecha } from '@/stores/cosecha/cosechaStore';

interface AjustePayload {
  item: CintaCosecha;
  campo: 'cantidad_a_cosechar' | 'rechazo';
  delta: number;
}

interface SetCampoPayload {
  item: CintaCosecha;
  campo: 'cantidad_a_cosechar' | 'rechazo';
  valor: number;
}

interface Props {
  item: CintaCosecha;
  loading: boolean;
  edad: number;
  porcentaje: number;
  exceeded: boolean;
  isCurrentCut: boolean;
  isReadyForCut: boolean;
  cardColor: string;
  cardVariant: 'tonal' | 'elevated' | 'flat' | 'outlined' | 'plain' | 'text';
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'adjust', payload: AjustePayload): void;
  (e: 'set-field', payload: SetCampoPayload): void;
  (e: 'maximize', item: CintaCosecha): void;
  (e: 'normalize', item: CintaCosecha): void;
}>();

const cantidadBuenos = computed({
  get: () => props.item.cantidad_a_cosechar,
  set: (valor) => {
    emit('set-field', {
      item: props.item,
      campo: 'cantidad_a_cosechar',
      valor: Number(valor),
    });
  },
});

const cantidadRechazo = computed({
  get: () => props.item.rechazo,
  set: (valor) => {
    emit('set-field', {
      item: props.item,
      campo: 'rechazo',
      valor: Number(valor),
    });
  },
});

const vSelectAll = {
  mounted: (el: HTMLElement) => {
    el.addEventListener('focus', (event) => {
      (event.target as HTMLInputElement).select();
    });
  },
};
</script>

<style scoped>
.touch-input {
  width: 60px;
  text-align: center;
  border: none;
  font-weight: 900;
  background: transparent;
  outline: none;
}

.touch-input::-webkit-outer-spin-button,
.touch-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.shadow-text {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

.digitacion-group {
  width: 100%;
}

.input-container {
  height: 48px;
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

@media (max-width: 960px) {
  .digitacion-group {
    justify-content: center !important;
  }
}

@media (max-width: 600px) {
  .touch-input {
    width: 52px;
    font-size: 1.15rem !important;
  }

  .input-container {
    height: 44px;
  }

  .gap-4 {
    gap: 10px;
  }
}
</style>
