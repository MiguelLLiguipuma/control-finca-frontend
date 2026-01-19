<template>
  <div class="side-panel">
    <div class="kpi-grid">
      <v-card 
        v-for="k in stats" 
        :key="k.label"
        variant="flat"
        class="kpi-card pa-4 rounded-lg border-s-lg"
      >
        <p class="kpi-label text-medium-emphasis">{{ k.label }}</p>
        <h2 class="kpi-value text-high-emphasis">{{ formatValue(k.value) }}</h2>

        <div v-if="typeof k.change === 'number'" class="d-flex align-center">
          <v-chip
            size="x-small"
            :color="k.change >= 0 ? 'success' : 'error'"
            variant="tonal"
            class="font-weight-bold"
          >
            <v-icon start size="10">
              {{ k.change >= 0 ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
            </v-icon>
            {{ Math.abs(k.change) }}%
          </v-chip>
          <span class="text-caption text-disabled ml-2">vs mes anterior</span>
        </div>
      </v-card>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  stats: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

/* ======================
   FORMATO DE VALORES
====================== */
const formatValue = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString('es-EC')
  }
  return value ?? 'N/A'
}
</script>

<style scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.kpi-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* La tarjeta usa el color de superficie del tema */
.kpi-card {
  background: rgb(var(--v-theme-surface)) !important;
  border-left: 4px solid rgb(var(--v-theme-primary)) !important;
  border: 1px solid rgba(var(--v-border-color), 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
}

.kpi-label {
  font-size: 0.8rem;
  margin-bottom: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 1.75rem;
  margin: 4px 0;
  font-weight: 800;
  line-height: 1.2;
}

/* Quitamos los media queries manuales ya que Vuetify lo maneja por clases */
</style>