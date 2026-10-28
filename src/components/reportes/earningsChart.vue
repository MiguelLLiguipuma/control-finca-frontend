<script setup lang="ts">
import { computed } from 'vue'
import ReportTrendChart from './ReportTrendChart.vue'
import type { SvgChartSeries } from './SimpleSvgChart.vue'
const props = withDefaults(defineProps<{ series?: SvgChartSeries[]; categories?: string[]; error?: string }>(), {
  series: () => [], categories: () => [],
})
const meses: Record<string, string> = {
  January: 'Ene', February: 'Feb', March: 'Mar', April: 'Abr', May: 'May', June: 'Jun',
  July: 'Jul', August: 'Ago', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dic',
}
const etiquetas = computed(() => props.categories.map(mes => meses[mes] || mes))
</script>

<template>
  <ReportTrendChart periodo="mensual" :series="series" :categories="etiquetas" :error="error" />
</template>
