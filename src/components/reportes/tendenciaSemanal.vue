<template>
  <v-card variant="flat" class="pa-5 rounded-xl custom-card overflow-visible">
    <div class="chart-header d-flex align-center justify-space-between flex-wrap mb-6 gap-2">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2" size="22">mdi-calendar-week</v-icon>
        <h3 class="chart-title text-high-emphasis">
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
        <v-btn-toggle v-model="chartType" mandatory density="comfortable" divided>
          <v-btn value="bar" size="x-small" variant="text">Barra</v-btn>
          <v-btn value="line" size="x-small" variant="text">Línea</v-btn>
        </v-btn-toggle>
        <v-btn
          size="x-small"
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-download"
          @click="exportarPng"
        >
          PNG
        </v-btn>
      </div>
    </div>

    <div class="chart-area">
      <apexchart
        ref="chartRef"
        :key="chartKey"
        :type="chartType"
        height="320"
        :options="chartOptions"
        :series="safeSeries"
      />
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'
import { useTheme } from 'vuetify'
import { useFincaStore } from '@/stores/fincaStore'

const reportesStore = useReportesStore()
const theme = useTheme()
const fincaStore = useFincaStore()
const chartType = ref<'bar' | 'line'>('bar')
const chartRef = ref<{ chart?: { dataURI?: () => Promise<{ imgURI: string }> } } | null>(null)

const UMBRAL_BAJO = 500 // 🔴 Define aquí tu límite de producción baja

interface ChartSeries {
  name?: string
  data?: number[]
}

const props = defineProps({
  series: { type: Array as () => ChartSeries[], default: () => [] },
  categories: { type: Array as () => string[], default: () => [] },
})
const periodoChip = computed(() => {
  if (reportesStore.modoComparativo === 'ytd') return 'YTD'
  if (reportesStore.modoComparativo === 'comparativo') return 'COMPARATIVO'
  return 'TOTAL SEMANAS'
})
const seriesSignature = computed(() =>
  (props.series || [])
    .map((s) => `${s.name || 'Fundas'}:${(s.data || []).length}:${(s.data || []).reduce((a, v) => a + (Number(v) || 0), 0)}`)
    .join('|'),
)

const chartKey = computed(() => 
  `chart-weekly-${reportesStore.anioSeleccionado}-${reportesStore.modoComparativo}-${chartType.value}-${theme.global.name.value}-${props.categories.length}-${seriesSignature.value}`
)
const isComparative = computed(() => (props.series?.length || 0) > 1)
const maxSeriesLen = computed(() =>
  Math.max(0, ...(props.series || []).map((s) => (s.data || []).length)),
)
const normalizedCategories = computed(() => {
  if (props.categories?.length) return props.categories
  if (maxSeriesLen.value > 0) {
    return Array.from({ length: maxSeriesLen.value }, (_, i) => `Sem. ${i + 1}`)
  }
  return ['Sin datos']
})

function slugify(text: string): string {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function exportarPng() {
  const chart = chartRef.value?.chart
  if (!chart?.dataURI) return
  const { imgURI } = await chart.dataURI()
  const finca = slugify(fincaStore.fincaSeleccionada?.nombre || 'sin-finca')
  const modo = slugify(reportesStore.modoComparativo || 'actual')
  const anio = reportesStore.anioSeleccionado
  const tipo = chartType.value
  const link = document.createElement('a')
  link.href = imgURI
  link.download = `reporte-semanal-${finca}-${anio}-${modo}-${tipo}.png`
  link.click()
}

const safeSeries = computed(() => {
  const len = normalizedCategories.value.length
  if (!props.series?.length) return [{ name: 'Fundas', data: Array(len).fill(0) }]
  return props.series.map((s) => ({
    name: s.name || 'Fundas',
    data: Array.from({ length: len }, (_, idx) => Number(s.data?.[idx]) || 0),
  }))
})

const chartOptions = computed(() => {
  const isDark = theme.global.current.value.dark
  const barRanges =
    chartType.value === 'line' || isComparative.value
      ? []
      : [
          {
            from: 0,
            to: UMBRAL_BAJO,
            color: '#F44336', // Rojo para producción baja
          },
          {
            from: UMBRAL_BAJO + 1,
            to: 999999,
            color: '#3b82f6', // Azul estándar para producción normal
          },
        ]
  
  return {
    chart: {
      toolbar: { show: true }, // Permitimos zoom/descarga para ver detalle de semanas
      parentHeightOffset: 0,
      background: 'transparent',
      animations: { speed: 320 },
      theme: { mode: isDark ? 'dark' : 'light' }
    },
    noData: {
      text: 'Sin datos semanales',
      align: 'center',
      verticalAlign: 'middle',
      style: {
        color: isDark ? '#94a3b8' : '#64748b',
      },
    },
    grid: {
      show: true,
      borderColor: isDark ? '#334155' : '#f1f5f9',
      strokeDashArray: 4
    },
    plotOptions: {
      bar: {
        // ✅ Ajustado para que 52 barras no se vean amontonadas
        columnWidth: chartType.value === 'line' ? '70%' : isComparative.value ? '70%' : '85%',
        borderRadius: 2,
        dataLabels: { position: 'top' },
        // ApexCharts espera estructura completa en bar.colors
        colors: {
          ranges: barRanges,
          backgroundBarColors: [],
          backgroundBarOpacity: 1,
          backgroundBarRadius: 0,
        },
      },
    },
    stroke: {
      width: chartType.value === 'line' ? 3 : 0,
      curve: chartType.value === 'line' ? 'smooth' : 'straight',
    },
    markers: {
      size: chartType.value === 'line' ? 3 : 0,
    },
    dataLabels: {
      enabled: normalizedCategories.value.length < 20, // Desactivar si hay muchas semanas para evitar ruido visual
      offsetY: -20,
      style: { 
        fontSize: '9px', 
        fontWeight: '700', 
        colors: [isDark ? '#cbd5e1' : '#64748b']
      },
      formatter: (val) => Number(val || 0).toLocaleString('es-EC')
    },
    xaxis: {
      categories: normalizedCategories.value,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: true,
        rotate:
          normalizedCategories.value.length > 24
            ? -90
            : normalizedCategories.value.length > 12
              ? -45
              : 0,
        rotateAlways: false,
        style: { 
          colors: isDark ? '#94a3b8' : '#64748b', 
          fontSize: normalizedCategories.value.length > 24 ? '9px' : '10px'
        }
      }
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
        formatter: (val) => Number(val || 0).toLocaleString('es-EC')
      }
    },
    tooltip: { 
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (val) => `${Number(val || 0).toLocaleString('es-EC')} Fundas` }
    },
    annotations: {
      yaxis: [
        {
          y: UMBRAL_BAJO,
          borderColor: '#ef4444',
          strokeDashArray: 4,
          label: {
            borderColor: '#ef4444',
            style: {
              color: '#fff',
              background: '#ef4444',
              fontSize: '10px',
            },
            text: `Umbral ${UMBRAL_BAJO.toLocaleString('es-EC')}`,
          },
        },
      ],
    },
    colors: isComparative.value
      ? [isDark ? '#475569' : '#cbd5e1', '#3b82f6']
      : ['#3b82f6'],
    legend: { show: isComparative.value, position: 'top', horizontalAlign: 'right' },
    responsive: [
      {
        breakpoint: 960,
        options: {
          chart: { height: 300 },
          dataLabels: { enabled: false },
        },
      },
      {
        breakpoint: 600,
        options: {
          chart: { height: 270 },
          xaxis: { labels: { rotate: -60 } },
        },
      },
    ],
  }
})
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
  letter-spacing: 0.025em;
}
.chart-header {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.05);
  padding-bottom: 12px;
}
.chart-area {
  margin-top: 10px;
  overflow: visible !important;
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
