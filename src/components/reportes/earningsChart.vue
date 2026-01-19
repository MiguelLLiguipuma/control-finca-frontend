<template>
  <v-card variant="flat" class="pa-5 rounded-xl custom-card overflow-visible">
    <div class="chart-header d-flex align-center justify-space-between mb-6">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2" size="22">mdi-chart-bar-stacked</v-icon>
        <h3 class="chart-title text-high-emphasis">
          Tendencia Mensual {{ reportesStore.anioSeleccionado }}
        </h3>
      </div>
      <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
        ANUAL
      </v-chip>
    </div>

    <div class="chart-area">
      <apexchart
        :key="chartKey"
        type="bar"
        height="320"
        :options="chartOptions"
        :series="safeSeries"
      />
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'
import { useTheme } from 'vuetify' // ✅ Importamos el hook de tema

const reportesStore = useReportesStore()
const theme = useTheme() // ✅ Instanciamos para detectar el cambio de modo

const props = defineProps({
  series: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})

const DEFAULT_MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const xCategories = computed(() => (props.categories?.length > 0 ? props.categories : DEFAULT_MONTHS))

// La key dinámica observa el año y el modo del tema para redibujar si es necesario
const chartKey = computed(() => 
  `chart-${reportesStore.anioSeleccionado}-${theme.global.name.value}-${props.series.length}`
)

const safeSeries = computed(() => {
  const len = xCategories.value.length
  if (!props.series?.length) return [{ name: 'Fundas', data: Array(len).fill(0) }]
  return props.series.map(s => ({
    name: s.name || 'Fundas',
    data: (s.data || []).map(v => Number(v) || 0)
  }))
})

const chartOptions = computed(() => {
  const isDark = theme.global.current.value.dark
  
  return {
    chart: {
      toolbar: { show: false },
      parentHeightOffset: 0,
      background: 'transparent',
      stacked: false,
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
      enabled: true,
      offsetY: -20,
      style: { 
        fontSize: '10px', 
        fontWeight: '700', 
        colors: [isDark ? '#cbd5e1' : '#64748b'] // Slate 300 o 500
      },
      formatter: (val) => val.toLocaleString('es-EC')
    },
    
    // Colores: Año anterior (Gris), Año actual (Azul)
    colors: props.series.length > 1 
      ? [isDark ? '#475569' : '#cbd5e1', '#3b82f6'] 
      : ['#3b82f6'],
    
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: xCategories.value,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: true,
        rotate: -45,
        minHeight: 50,
        style: { 
          colors: isDark ? '#94a3b8' : '#64748b', 
          fontSize: '11px' 
        }
      }
    },
    yaxis: {
      min: 0,
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
      x: { show: true }
    },
    legend: { 
      show: props.series.length > 1, 
      position: 'top',
      horizontalAlign: 'right',
      labels: {
        colors: isDark ? '#f1f5f9' : '#334155'
      },
      markers: { radius: 12 }
    }
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
</style>