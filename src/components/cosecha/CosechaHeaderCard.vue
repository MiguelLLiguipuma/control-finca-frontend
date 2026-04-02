<template>
  <v-card class="mb-6" elevation="3" rounded="xl" color="surface">
    <v-card-text class="d-flex align-start align-sm-center py-4 flex-wrap gap-3">
      <v-avatar color="primary" class="me-1 me-sm-4 hero-avatar" variant="tonal" size="56">
        <v-icon size="32">mdi-tablet-dashboard</v-icon>
      </v-avatar>

      <div class="flex-grow-1">
        <h1 class="text-h3 font-weight-black mb-0 text-high-emphasis control-title">
          Control de Campo · Sem {{ semanaActual }}
        </h1>
        <div class="d-flex align-center text-primary font-weight-bold mt-2 header-subtitle">
          <v-icon size="20" class="me-2">mdi-calendar-check</v-icon>
          <span class="text-body-2">Corte sugerido: {{ rangoTexto }}</span>
        </div>
      </div>

      <div class="text-right d-none d-md-block header-kpi">
        <div class="text-h3 font-weight-black text-primary line-height-1">
          {{ totalDigitado }}
        </div>
        <div class="text-overline text-medium-emphasis">
          RACIMOS DIGITADOS
        </div>
        <v-chip class="mt-2 font-weight-bold" size="default" label :color="estadoColor">
          {{ estadoOperacion }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  semanaActual: number;
  rangoCorteSugerido: number[];
  totalDigitado: number;
  estadoOperacion: string;
  estadoColor: string;
}

const props = defineProps<Props>();

const rangoTexto = computed(() => `${props.rangoCorteSugerido.join(', ')} semanas`);
</script>

<style scoped>
.line-height-1 {
  line-height: 1;
}

@media (max-width: 960px) {
  .header-kpi {
    width: 100%;
    text-align: left !important;
  }
}

@media (max-width: 600px) {
  .hero-avatar {
    display: none;
  }

  .header-subtitle {
    align-items: flex-start !important;
  }
}
</style>
