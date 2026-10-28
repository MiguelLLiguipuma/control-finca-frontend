<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'
import { useFincaStore } from '@/stores/fincaStore'
import SimpleSvgChart, { type SvgChartExpose, type SvgChartSeries } from './SimpleSvgChart.vue'

const props = defineProps<{
  series: SvgChartSeries[]
  categories: string[]
  periodo: 'mensual' | 'semanal'
  error?: string
}>()
const reportes = useReportesStore()
const fincas = useFincaStore()
const tipo = shallowRef<'bar' | 'line'>('bar')
const chart = shallowRef<SvgChartExpose | null>(null)
const exportando = shallowRef(false)
const errorExportacion = shallowRef('')
const colores = computed(() => props.series.length > 1 ? ['#929ca6', '#3780e7'] : ['#3780e7'])
const titulo = computed(() => props.periodo === 'mensual' ? 'Enfunde mensual' : 'Enfunde semanal')
const anchoMinimo = computed(() => Math.max(720, props.categories.length * (props.series.length > 1 ? 32 : 22)))
const slug = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()

async function exportar() {
  exportando.value = true
  errorExportacion.value = ''
  try {
    await chart.value?.exportPng(`enfunde-${props.periodo}-${slug(fincas.fincaSeleccionada?.nombre || 'finca')}-${reportes.anioSeleccionado}-${reportes.modoComparativo}-${tipo.value}.png`)
  } catch {
    errorExportacion.value = 'No se pudo descargar el gráfico. Inténtalo nuevamente.'
  } finally {
    exportando.value = false
  }
}
</script>

<template>
  <section class="trend-panel" :aria-labelledby="`trend-${periodo}`">
    <header class="trend-header">
      <div>
        <h2 :id="`trend-${periodo}`">{{ titulo }}</h2>
        <p class="text-medium-emphasis">Fundas registradas · {{ reportes.anioSeleccionado }}</p>
      </div>
      <div class="trend-tools">
        <v-btn-toggle v-model="tipo" mandatory divided color="primary" :aria-label="`Tipo de gráfico ${periodo}`">
          <v-btn value="bar" variant="text">Barras</v-btn>
          <v-btn value="line" variant="text">Línea</v-btn>
        </v-btn-toggle>
        <v-btn icon="mdi-download" variant="text" size="small" :loading="exportando" :disabled="!series.length || !categories.length"
          :aria-label="`Descargar gráfico ${periodo} en PNG`" title="Descargar PNG" @click="exportar" />
      </div>
    </header>
    <v-alert v-if="errorExportacion" type="error" variant="tonal" density="compact" class="mb-3">{{ errorExportacion }}</v-alert>
    <div v-if="series.length && categories.length" class="trend-legend">
      <span v-for="(serie, index) in series" :key="serie.name">
        <i :style="{ backgroundColor: colores[index] }" aria-hidden="true" />{{ serie.name }}
      </span>
    </div>
    <div class="trend-scroll" tabindex="0" role="region" :aria-label="`Gráfico ${periodo}, desplazamiento horizontal`">
      <SimpleSvgChart ref="chart" :type="tipo" :series="series" :categories="categories" :colors="colores"
        :style="series.length && categories.length ? { minWidth: anchoMinimo + 'px' } : undefined"
        :show-data-labels="categories.length <= 8" :aria-label="titulo" y-axis-title="Fundas"
        :empty-text="error || 'Sin registros de enfunde en este período'" />
    </div>
  </section>
</template>

<style scoped>
.trend-panel { min-width: 0; padding: 20px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 8px; }
.trend-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.trend-header h2 { font-size: 16px; font-weight: 700; letter-spacing: 0; }
.trend-header p { font-size: 12px; margin-top: 4px; }
.trend-tools { display: flex; align-items: center; gap: 8px; }
.trend-tools :deep(.v-btn-toggle) { height: 40px; border: 1px solid rgba(var(--v-theme-on-surface), .14); border-radius: 6px; }
.trend-tools :deep(.v-btn) { font-size: 12px; text-transform: none; letter-spacing: 0; }
.trend-legend { display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px; margin-bottom: 14px; }
.trend-legend span { display: inline-flex; align-items: center; gap: 6px; }
.trend-legend i { width: 8px; height: 8px; border-radius: 2px; }
.trend-scroll { overflow-x: auto; padding-bottom: 8px; }
.trend-scroll:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
.trend-scroll :deep(.svg-chart-empty) { border: 0; border-radius: 0; background: none; font-size: 14px; font-weight: 400; text-align: center; }
@media (max-width: 599px) { .trend-panel { padding: 16px; } }
</style>
