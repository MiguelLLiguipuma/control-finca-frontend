<template>
  <v-card variant="flat" class="pa-5 rounded-xl custom-card overflow-visible">
    <div class="chart-header d-flex align-center justify-space-between flex-wrap mb-6 gap-2">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2" size="22">mdi-chart-bar-stacked</v-icon>
        <h3 class="chart-title text-high-emphasis">
          Tendencia Mensual {{ reportesStore.anioSeleccionado }}
        </h3>
      </div>
      <div class="d-flex align-center gap-2 chart-actions">
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
import { useTheme } from 'vuetify' // ✅ Importamos el hook de tema
import { useFincaStore } from '@/stores/fincaStore'

const reportesStore = useReportesStore()
const fincaStore = useFincaStore()
const theme = useTheme() // ✅ Instanciamos para detectar el cambio de modo
const chartType = ref<'bar' | 'line'>('bar')
const chartRef = ref<{ chart?: { dataURI?: () => Promise<{ imgURI: string }> } } | null>(null)

interface ChartSeries {
  name?: string
  data?: number[]
}

const props = defineProps({
  series: { type: Array as () => ChartSeries[], default: () => [] },
  categories: { type: Array as () => string[], default: () => [] },
})

const DEFAULT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTH_LABELS_MAP = {
  January: 'Ene',
  February: 'Feb',
  March: 'Mar',
  April: 'Abr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Ago',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dic',
}
const xCategories = computed(() => {
  const raw = props.categories?.length > 0 ? props.categories : DEFAULT_MONTHS
  return raw.map((m) => MONTH_LABELS_MAP[m] || m)
})
const periodoChip = computed(() => {
  if (reportesStore.modoComparativo === 'ytd') return 'YTD'
  if (reportesStore.modoComparativo === 'comparativo') return 'COMPARATIVO'
  return 'ANUAL'
})
const isComparative = computed(() => (props.series?.length || 0) > 1)
const seriesSignature = computed(() =>
  (props.series || [])
    .map((s) => `${s.name || 'Fundas'}:${(s.data || []).length}:${(s.data || []).reduce((a, v) => a + (Number(v) || 0), 0)}`)
    .join('|'),
)

// La key dinámica observa el año y el modo del tema para redibujar si es necesario
const chartKey = computed(() => 
  `chart-${reportesStore.anioSeleccionado}-${reportesStore.modoComparativo}-${chartType.value}-${theme.global.name.value}-${xCategories.value.length}-${seriesSignature.value}`
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
  const chart = chartRef.value?.chart
  if (!chart?.dataURI) return
  const { imgURI } = await chart.dataURI()
  const finca = slugify(fincaStore.fincaSeleccionada?.nombre || 'sin-finca')
  const modo = slugify(reportesStore.modoComparativo || 'actual')
  const anio = reportesStore.anioSeleccionado
  const tipo = chartType.value
  const link = document.createElement('a')
  link.href = imgURI
  link.download = `reporte-mensual-${finca}-${anio}-${modo}-${tipo}.png`
  link.click()
}

const safeSeries = computed(() => {
  const len = xCategories.value.length
  if (!props.series?.length) return [{ name: 'Fundas', data: Array(len).fill(0) }]
  return props.series.map(s => ({
    name: s.name || 'Fundas',
    data: (s.data || []).map(v => Number(v) || 0),
  }))
})

const chartOptions = computed(() => {
  const isDark = theme.global.current.value.dark
  const lineStrokeColors = isComparative.value
    ? [isDark ? '#94a3b8' : '#64748b', '#3b82f6']
    : ['#3b82f6']
  
  return {
    chart: {
      toolbar: { show: false },
      parentHeightOffset: 0,
      background: 'transparent',
      stacked: false,
      animations: { speed: 350 },
      // ✅ Sincroniza el motor de ApexCharts con el tema de Vuetify
      theme: {
        mode: isDark ? 'dark' : 'light'
      }
    },
    grid: {
      show: true,
      borderColor: isDark ? '#334155' : '#f1f5f9', // Slate 700 o 100
      strokeDashArray: 4,
      padding: { top: 0, right: 0, bottom: 10, left: 10 }
    },
    plotOptions: {
      bar: {
        columnWidth: props.series.length > 1 ? '75%' : '55%',
        borderRadius: 4,
        dataLabels: { position: 'top' }
      },
    },
    dataLabels: {
      enabled: xCategories.value.length <= 8,
      offsetY: -20,
      style: { 
        fontSize: '10px', 
        fontWeight: '700', 
        colors: [isDark ? '#cbd5e1' : '#64748b'] // Slate 300 o 500
      },
      formatter: (val) => val.toLocaleString('es-EC')
    },
    
    // Colores: Año anterior (Gris), Año actual (Azul)
    colors: isComparative.value
      ? [isDark ? '#475569' : '#cbd5e1', '#3b82f6'] 
      : ['#3b82f6'],
    
    stroke: {
      show: true,
      width: chartType.value === 'line' ? 3 : 1,
      curve: chartType.value === 'line' ? 'smooth' : 'straight',
      colors: chartType.value === 'line' ? lineStrokeColors : ['transparent'],
    },
    markers: {
      size: chartType.value === 'line' ? 4 : 0,
    },
    xaxis: {
      categories: xCategories.value,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: true,
        rotate: xCategories.value.length > 8 ? -45 : 0,
        minHeight: 50,
        style: { 
          colors: isDark ? '#94a3b8' : '#64748b', 
          fontSize: '11px' 
        }
      }
    },
    yaxis: {
      min: 0,
      title: {
        text: 'Fundas',
        style: {
          color: isDark ? '#94a3b8' : '#64748b',
          fontSize: '11px',
          fontWeight: 700,
        },
      },
      labels: {
        style: { 
          colors: isDark ? '#94a3b8' : '#64748b', 
          fontSize: '11px' 
        },
        formatter: (val) => val.toLocaleString('es-EC')
      }
    },
    // ✅ Tooltip dinámico
    tooltip: { 
      theme: isDark ? 'dark' : 'light',
      x: { show: true },
      y: {
        formatter: (val, opts) => {
          const base = `${Number(val || 0).toLocaleString('es-EC')} fundas`
          if (!isComparative.value) return base

          const idx = opts?.dataPointIndex ?? -1
          if (idx < 0) return base
          const actual = Number(safeSeries.value?.[1]?.data?.[idx] || 0)
          const anterior = Number(safeSeries.value?.[0]?.data?.[idx] || 0)
          if (anterior <= 0) return `${base} | Sin base comparativa`
          const delta = actual - anterior
          const deltaPct = (delta / anterior) * 100
          const signo = delta >= 0 ? '+' : ''
          return `${base} | Δ ${signo}${delta.toLocaleString('es-EC')} (${signo}${deltaPct.toFixed(1)}%)`
        },
      },
    },
    legend: { 
      show: isComparative.value, 
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: isDark ? '#f1f5f9' : '#334155'
      },
      markers: { radius: 12 }
    },
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
          xaxis: { labels: { rotate: -30 } },
          grid: { padding: { left: 0, right: 0 } },
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
}
</style>
