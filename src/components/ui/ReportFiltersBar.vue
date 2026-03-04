<template>
  <v-card variant="flat" class="pa-2 rounded-xl bg-surface border filters-box w-100 w-lg-auto">
    <v-row dense align="center" no-gutters>
      <v-col v-if="showYear" cols="12" sm="auto" class="mb-2 mb-sm-0">
        <div class="selector-anio px-1">
          <AnoSelector />
        </div>
      </v-col>

      <v-divider v-if="showYear && showFinca" vertical class="mx-2 d-none d-sm-flex" inset />

      <v-col v-if="showFinca" cols="12" sm="auto" class="mb-2 mb-sm-0">
        <div class="selector-finca px-1">
          <FincaSelector />
        </div>
      </v-col>

      <v-divider
        v-if="showComparativo && (showYear || showFinca)"
        vertical
        class="mx-2 d-none d-sm-flex"
        inset
      />

      <v-col v-if="showComparativo" cols="12" sm="auto" class="d-flex justify-start px-2 pt-0 pt-sm-0">
        <v-btn-toggle
          v-model="modoComparativo"
          mandatory
          divided
          density="comfortable"
          class="modo-analisis-toggle w-100"
        >
          <v-btn :value="'actual'" size="small" color="primary" variant="text" class="flex-grow-1">
            Solo año
          </v-btn>
          <v-btn :value="'comparativo'" size="small" color="primary" variant="text" class="flex-grow-1">
            + Año anterior
          </v-btn>
          <v-btn :value="'ytd'" size="small" color="primary" variant="text" class="flex-grow-1">
            YTD
          </v-btn>
        </v-btn-toggle>
      </v-col>

      <v-divider
        v-if="showScopeToggle && (showComparativo || showYear || showFinca)"
        vertical
        class="mx-2 d-none d-sm-flex"
        inset
      />

      <v-col v-if="showScopeToggle" cols="12" sm="auto" class="d-flex justify-start px-2 pt-0 pt-sm-0">
        <v-btn-toggle
          v-model="scopeDatos"
          mandatory
          divided
          density="comfortable"
          class="modo-analisis-toggle w-100"
        >
          <v-btn :value="'finca'" size="small" color="primary" variant="text" class="flex-grow-1">
            Mi finca
          </v-btn>
          <v-btn :value="'propio'" size="small" color="primary" variant="text" class="flex-grow-1">
            Mi producción
          </v-btn>
        </v-btn-toggle>
      </v-col>
    </v-row>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useReportesStore } from '@/stores/reportesStore';
import { useAuthStore } from '@/stores/auth/authStore';
import AnoSelector from '@/components/ui/AnoSelector.vue';
import FincaSelector from '@/components/ui/FincaSelector.vue';

withDefaults(
  defineProps<{
    showYear?: boolean;
    showFinca?: boolean;
    showComparativo?: boolean;
  }>(),
  {
    showYear: true,
    showFinca: true,
    showComparativo: true,
  },
);

const reportesStore = useReportesStore();
const authStore = useAuthStore();

const modoComparativo = computed({
  get: () => reportesStore.modoComparativo || 'actual',
  set: (value: 'actual' | 'comparativo' | 'ytd') => {
    reportesStore.modoComparativo = value;
  },
});

const showScopeToggle = computed(() => authStore.normalizedRole === 'OPERADOR');

const scopeDatos = computed({
  get: () => reportesStore.scopeDatos || 'finca',
  set: (value: 'finca' | 'propio') => {
    reportesStore.scopeDatos = value;
  },
});
</script>

<style scoped>
.filters-box,
.border {
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.modo-analisis-toggle {
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: 10px;
}

@media (max-width: 600px) {
  .filters-box {
    padding: 10px !important;
  }

  .selector-anio,
  .selector-finca {
    width: 100%;
  }

  .modo-analisis-toggle {
    width: 100%;
  }
}
</style>
