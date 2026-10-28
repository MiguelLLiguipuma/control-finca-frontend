<script setup lang="ts">
import ReportTrendChart from './ReportTrendChart.vue'
import type { SvgChartSeries } from './SimpleSvgChart.vue'
withDefaults(defineProps<{ series?: SvgChartSeries[]; categories?: string[]; error?: string }>(), {
  series: () => [], categories: () => [],
})
</script>

<template>
  <ReportTrendChart periodo="semanal" :series="series" :categories="categories" :error="error" />
</template>
