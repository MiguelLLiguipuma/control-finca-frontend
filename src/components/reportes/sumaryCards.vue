<template>
  <v-card
    class="kpi-card border"
    elevation="0"
    rounded="xl"
  >
    <div class="icon-wrapper" :class="gradientClass">
      <v-icon size="28" color="white">
        {{ card.icon || 'mdi-chart-bar' }}
      </v-icon>
    </div>

    <h4 class="kpi-title text-medium-emphasis">
      {{ card.title }}
    </h4>

    <h2 class="kpi-value text-high-emphasis">
      {{ formattedValue }}
    </h2>

    <v-btn
      variant="tonal"
      class="kpi-btn"
      size="small"
      color="primary"
    >
      Ver detalles
    </v-btn>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    required: true,
  },
})

const formattedValue = computed(() => {
  if (typeof props.card.value === 'number') {
    return props.card.value.toLocaleString('es-EC')
  }
  return props.card.value ?? 'N/A'
})

const gradientClass = computed(() => {
  return props.card.gradient
    ? `bg-${props.card.gradient}`
    : 'bg-primary'
})
</script>

<style scoped>
.kpi-card {
  padding: 28px 20px;
  text-align: center;
  /* Eliminamos el gradiente blanco fijo y usamos el color de superficie del tema */
  background: rgb(var(--v-theme-surface)) !important;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-color 0.3s ease;
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.kpi-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12) !important;
}

/* ICONO */
.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

/* GRADIENTES (Se mantienen para dar vida al dashboard) */
.bg-primary { background: linear-gradient(135deg, #6366f1, #818cf8); }
.bg-green { background: linear-gradient(135deg, #22c55e, #4ade80); }
.bg-yellow { background: linear-gradient(135deg, #facc15, #fde047); }
.bg-pink { background: linear-gradient(135deg, #fb7185, #fda4af); }
.bg-teal { background: linear-gradient(135deg, #2dd4bf, #5eead4); }

/* TEXTO */
.kpi-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-value {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 18px;
  letter-spacing: -1px;
}

/* BOTÓN */
.kpi-btn {
  border-radius: 10px;
  text-transform: none;
  font-weight: 600;
}
</style>