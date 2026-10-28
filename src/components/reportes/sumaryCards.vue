<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  card: { title: string; value: number | string | null | undefined; icon?: string; helperText?: string }
}>()
const emit = defineEmits<{ 'view-details': [title: string] }>()
const formattedValue = computed(() => typeof props.card.value === 'number'
  ? props.card.value.toLocaleString('es-EC', { maximumFractionDigits: 1 })
  : props.card.value ?? 'Sin dato')
</script>

<template>
  <article class="kpi-card">
    <div class="kpi-heading">
      <h2 class="kpi-title text-medium-emphasis">{{ card.title }}</h2>
      <v-icon size="20" color="primary" aria-hidden="true">{{ card.icon || 'mdi-chart-bar' }}</v-icon>
    </div>
    <p class="kpi-value">{{ formattedValue }}</p>
    <p class="kpi-helper text-medium-emphasis">{{ card.helperText }}</p>
    <button class="kpi-link" type="button" :aria-label="`Ver tendencia de ${card.title}`" @click="emit('view-details', card.title)">
      Ver tendencia <v-icon size="16" aria-hidden="true">mdi-arrow-right</v-icon>
    </button>
  </article>
</template>

<style scoped>
.kpi-card { display: flex; flex-direction: column; min-width: 0; padding: 18px; border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 8px; background: rgb(var(--v-theme-surface)); }
.kpi-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.kpi-title { font-size: 13px; font-weight: 600; line-height: 1.5; letter-spacing: 0; }
.kpi-value { font-size: 28px; font-weight: 750; line-height: 1.3; margin: 12px 0 4px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.kpi-helper { font-size: 12px; line-height: 1.5; min-height: 36px; }
.kpi-link { display: flex; align-items: center; gap: 6px; min-height: 40px; margin-top: auto; font-size: 12px; font-weight: 600; color: rgb(var(--v-theme-primary)); }
.kpi-link:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; border-radius: 4px; }
@media (max-width: 599px) { .kpi-card { padding: 12px; } .kpi-heading { min-height: 39px; } .kpi-value { font-size: 24px; } }
</style>
