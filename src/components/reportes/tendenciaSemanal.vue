<template>
  <v-card variant="flat" class="pa-5 rounded-xl custom-card overflow-visible">
    <div class="chart-header d-flex align-center justify-space-between mb-6">
      <div class="d-flex align-center">
        <v-icon color="primary" class="mr-2" size="22">mdi-calendar-week</v-icon>
        <h3 class="chart-title text-high-emphasis">
          Tendencia Semanal {{ reportesStore.anioSeleccionado }}
        </h3>
      </div>
      <div class="d-flex gap-2">
        <v-chip size="x-small" color="error" variant="flat" class="font-weight-bold px-2 mr-2">
          UMBRAL BAJO ({{ UMBRAL_BAJO.toLocaleString('es-EC') }} Fundas)
        </v-chip>
        <v-chip size="x-small" color="primary" variant="tonal" class="font-weight-bold">
          TOTAL SEMANAS
        </v-chip>
      </div>
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
import { useTheme } from 'vuetify'

const reportesStore = useReportesStore()
const theme = useTheme()

const UMBRAL_BAJO = 500 // 🔴 Define aquí tu límite de producción baja

const props = defineProps({
  series: { type: Array, default: () => [] },
  categories: { type: Array, default: () => [] },
})

const chartKey = computed(() => 
  `chart-weekly-full-${reportesStore.anioSeleccionado}-${theme.global.name.value}-${props.series.length}`
)

const safeSeries = computed(() => {
  if (!props.series?.length) return [{ name: 'Fundas', data: [] }]
  return props.series.map(s => ({
    name: s.name || 'Fundas',
    data: (s.data || []).map(v => Number(v) || 0)
  }))
})

const chartOptions = computed(() => {
  const isDark = theme.global.current.value.dark
  
  return {
    chart: {
      toolbar: { show: true }, // Permitimos zoom/descarga para ver detalle de semanas
      parentHeightOffset: 0,
      background: 'transparent',
      theme: { mode: isDark ? 'dark' : 'light' }
    },
    grid: {
      show: true,
      borderColor: isDark ? '#334155' : '#f1f5f9',
      strokeDashArray: 4
    },
    plotOptions: {
      bar: {
        // ✅ Ajustado para que 52 barras no se vean amontonadas
        columnWidth: '85%', 
        borderRadius: 2,
        dataLabels: { position: 'top' },
        // ✅ LÓGICA DE COLORES CONDICIONALES
        colors: {
          ranges: [{
            from: 0,
            to: UMBRAL_BAJO,
            color: '#F44336' // Rojo para producción baja
          }, {
            from: UMBRAL_BAJO + 1,
            to: 999999,
            color: '#3b82f6' // Azul estándar para producción normal
          }]
        }
      },
    },
    dataLabels: {
      enabled: props.categories.length < 15, // Desactivar si hay muchas semanas para evitar ruido visual
      offsetY: -20,
      style: { 
        fontSize: '9px', 
        fontWeight: '700', 
        colors: [isDark ? '#cbd5e1' : '#64748b']
      },
      formatter: (val) => val.toLocaleString('es-EC')
    },
    xaxis: {
      categories: props.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: true,
        rotate: -90, // Rotación total para que quepan las 52 etiquetas
        rotateAlways: false,
        style: { 
          colors: isDark ? '#94a3b8' : '#64748b', 
          fontSize: '9px' 
        }
      }
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: isDark ? '#94a3b8' : '#64748b', fontSize: '11px' },
        formatter: (val) => val.toLocaleString('es-EC')
      }
    },
    tooltip: { 
      theme: isDark ? 'dark' : 'light',
      y: { formatter: (val) => `${val.toLocaleString('es-EC')} Fundas` }
    },
    legend: { show: false }
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