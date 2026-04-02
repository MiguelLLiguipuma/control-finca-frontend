<template>
  <v-card
    variant="flat"
    class="pa-5 rounded-xl custom-card overflow-visible"
    role="region"
    aria-labelledby="weekly-chart-title"
  >
    <div class="chart-header d-flex align-center justify-space-between flex-wrap mb-6 gap-2">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2" size="22">mdi-calendar-week</v-icon>
        <h3 id="weekly-chart-title" class="chart-title text-high-emphasis">
          Tendencia Semanal {{ reportesStore.anioSeleccionado }}
        </h3>
      </div>
      <div class="d-flex align-center gap-2 chart-actions">
        <v-chip size="x-small" color="error" variant="flat" class="font-weight-bold px-2 mr-2">
          UMBRAL BAJO ({{ UMBRAL_BAJO.toLocaleString('es-EC') }} Fundas)
        </v-chip>
        <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
          {{ periodoChip }}
        </v-chip>
        <v-btn-toggle
          v-model="chartType"
          mandatory
          density="comfortable"
          divided
          aria-label="Tipo de gráfico semanal"
        >
          <v-btn value="bar" size="x-small" variant="text">Barra</v-btn>
          <v-btn value="line" size="x-small" variant="text">Línea</v-btn>
        </v-btn-toggle>
        <v-btn
          size="x-small"
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-download"
          aria-label="Exportar gráfico semanal en PNG"
          @click="exportarPng"
        >
          PNG
        </v-btn>
      </div>
    </div>

    <div class="chart-area">
      <v-sheet class="chart-guide rounded-lg pa-3 mb-3" color="surface">
        <div class="text-caption text-medium-emphasis">
          Esta gráfica muestra fundas por semana del año seleccionado.
        </div>
        <div class="d-flex flex-wrap align-center gap-2 mt-2">
          <v-chip size="x-small" color="error" variant="flat" class="font-weight-bold">
            Rojo: por debajo del umbral ({{ UMBRAL_BAJO.toLocaleString('es-EC') }})
          </v-chip>
          <v-chip size="x-small" color="primary" variant="flat" class="font-weight-bold">
            Azul: producción normal
          </v-chip>
          <v-chip
            v-if="isComparative"
            size="x-small"
            color="grey"
            variant="tonal"
            class="font-weight-bold"
          >
            Gris: año anterior
          </v-chip>
          <v-chip size="x-small" color="info" variant="tonal" class="font-weight-bold">
            {{ chartType === 'bar' ? 'Barra: foco por semana' : 'Línea: tendencia semanal' }}
          </v-chip>
        </div>
      </v-sheet>

      <SimpleSvgChart
        ref="chartRef"
        :type="chartType"
        :series="safeSeries"
        :categories="normalizedCategories"
        :colors="seriesColors"
        :threshold="UMBRAL_BAJO"
        :threshold-label="`Umbral ${UMBRAL_BAJO.toLocaleString('es-EC')}`"
        :show-data-labels="normalizedCategories.length < 20"
        aria-label="Gráfico semanal de producción"
        y-axis-title="Fundas"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'
import { useFincaStore } from '@/stores/fincaStore'
import SimpleSvgChart, { type SvgChartExpose, type SvgChartSeries } from '@/components/reportes/SimpleSvgChart.vue'

const reportesStore = useReportesStore()
const fincaStore = useFincaStore()
const chartType = ref<'bar' | 'line'>('bar')
const chartRef = ref<SvgChartExpose | null>(null)

const UMBRAL_BAJO = 500

const props = defineProps<{
  series?: SvgChartSeries[]
  categories?: string[]
}>()

const periodoChip = computed(() => {
  if (reportesStore.modoComparativo === 'ytd') return 'YTD'
  if (reportesStore.modoComparativo === 'comparativo') return 'COMPARATIVO'
  return 'TOTAL SEMANAS'
})

const isComparative = computed(() => (props.series?.length || 0) > 1)
const maxSeriesLen = computed(() =>
  Math.max(0, ...(props.series || []).map((series) => (series.data || []).length)),
)

const normalizedCategories = computed(() => {
  if (props.categories?.length) return props.categories
  if (maxSeriesLen.value > 0) {
    return Array.from({ length: maxSeriesLen.value }, (_, index) => `Sem. ${index + 1}`)
  }
  return ['Sin datos']
})

const safeSeries = computed<SvgChartSeries[]>(() => {
  const length = normalizedCategories.value.length
  if (!props.series?.length) {
    return [{ name: 'Fundas', data: Array(length).fill(0) }]
  }

  return props.series.map((series) => ({
    name: series.name || 'Fundas',
    data: Array.from({ length }, (_, index) => Number(series.data?.[index]) || 0),
  }))
})

const seriesColors = computed(() =>
  isComparative.value ? ['#94a3b8', '#3b82f6'] : ['#3b82f6'],
)

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function exportarPng() {
  const finca = slugify(fincaStore.fincaSeleccionada?.nombre || 'sin-finca')
  const modo = slugify(reportesStore.modoComparativo || 'actual')
  const filename = `reporte-semanal-${finca}-${reportesStore.anioSeleccionado}-${modo}-${chartType.value}.png`
  await chartRef.value?.exportPng(filename)
}
</script>

<style scoped>
.custom-card {
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  background: rgb(var(--v-theme-surface));
  transition: all 0.3s ease;
}

.custom-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
}

.chart-title {
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.015em;
}

.chart-header {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.05);
  padding-bottom: 12px;
}

.chart-area {
  margin-top: 10px;
  overflow: visible !important;
}

.chart-guide {
  border: 1px dashed rgba(var(--v-border-color), 0.22);
  background: rgba(var(--v-theme-on-surface), 0.025);
}

.chart-actions :deep(.v-btn-toggle) {
  border: 1px solid rgba(var(--v-border-color), 0.18);
}

.chart-actions :deep(.v-btn--active) {
  background: rgba(var(--v-theme-primary), 0.12) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

@media (max-width: 600px) {
  .chart-header {
    align-items: flex-start !important;
  }

  .chart-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .chart-title {
    font-size: 0.8rem;
  }
}
</style>
