<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, shallowRef, watch } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'
import { useFincaStore } from '@/stores/fincaStore'
import { useAuthStore } from '@/stores/auth/authStore'
import SummaryCards from '@/components/reportes/sumaryCards.vue'
import ReportFiltersBar from '@/components/ui/ReportFiltersBar.vue'
import RendimientoCintas from '@/components/reportes/rendimientoCintas.vue'
import EstadoBotanicoFinca from '@/components/reportes/EstadoBotanicoFinca.vue'
import PendientesFinca from '@/components/reportes/PendientesFinca.vue'
import { usePendientesFinca } from '@/composables/usePendientesFinca'
import { LIMITE_ALERTAS_DASHBOARD, priorizarPendientes } from '@/domain/pendientesFinca'

const EarningsChart = defineAsyncComponent(() => import('@/components/reportes/earningsChart.vue'))
const TendenciaSemanal = defineAsyncComponent(() => import('@/components/reportes/tendenciaSemanal.vue'))
const reportes = useReportesStore()
const fincas = useFincaStore()
const auth = useAuthStore()
const listo = shallowRef(false)
const revisionPendientes = shallowRef(0)
const pendientes = usePendientesFinca(() => ({
  fincaId: fincas.fincaSeleccionadaId,
  habilitado: listo.value && !fincas.loading && !fincas.error && auth.can('view.alertas')
    && fincas.fincas.some(finca => finca.id === fincas.fincaSeleccionadaId),
  sesion: `${auth.token || ''}:${auth.user?.id ?? auth.user?.id_usuario ?? ''}:${auth.user?.empresa_id ?? ''}`,
  revision: revisionPendientes.value,
}))
const prioridades = computed(() => priorizarPendientes(pendientes.items.value,
  fincas.fincaSeleccionadaId || 0, permission => auth.can(permission), ['ADMIN', 'SUPERVISOR'].includes(auth.normalizedRole)))
const mensual = shallowRef<HTMLElement | null>(null)
const semanal = shallowRef<HTMLElement | null>(null)
const indicadores = computed(() => reportes.tarjetas.slice(0, 4))
const ocupado = computed(() => !listo.value || fincas.loading || reportes.loading)
const actualizado = computed(() => reportes.actualizadoEn
  ? new Date(reportes.actualizadoEn).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : null)
const periodo = computed(() => reportes.modoComparativo === 'ytd'
  ? 'Acumulado al corte · Comparación con el año anterior'
  : reportes.modoComparativo === 'comparativo' ? 'Año completo · Comparación con el año anterior' : 'Año completo')
const error = computed(() => fincas.error || reportes.error)

async function cargarFincas() {
  listo.value = false
  try {
    await fincas.obtenerFincas()
  } catch {
    await reportes.cargarReportes(null)
  } finally {
    listo.value = true
  }
}
function refrescar() {
  if (fincas.error || !fincas.fincas.length) return cargarFincas()
  revisionPendientes.value++
  return reportes.cargarReportes(fincas.fincaSeleccionadaId, true)
}
function verTendencia(title: string) {
  const target = title.toLowerCase().includes('seman') ? semanal.value : mensual.value
  target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}
onMounted(cargarFincas)
watch([listo, () => fincas.fincaSeleccionadaId, () => reportes.anioSeleccionado,
  () => reportes.modoComparativo, () => reportes.scopeDatos], () => {
  if (!listo.value || fincas.error) return
  void reportes.cargarReportes(fincas.fincaSeleccionadaId)
})
</script>

<template>
  <v-container fluid class="dashboard">
    <header class="dashboard-header">
      <div>
        <h1>Resumen de finca</h1>
        <p class="text-medium-emphasis">Enfunde, tendencias y estado sanitario</p>
      </div>
      <div class="header-actions">
        <span class="refresh-time text-medium-emphasis" role="status">
          {{ ocupado ? 'Consultando datos…' : actualizado ? 'Consultado ' + actualizado : 'Sin consulta completada' }}
        </span>
        <v-btn icon="mdi-refresh" variant="tonal" color="primary" size="small" title="Actualizar datos"
          aria-label="Actualizar dashboard" :loading="ocupado" @click="refrescar" />
      </div>
    </header>

    <ReportFiltersBar />
    <v-alert v-if="error" type="error" variant="tonal" class="mb-5" title="No se pudo cargar el dashboard">
      {{ error }}
      <div class="mt-2"><v-btn variant="text" :disabled="ocupado" @click="refrescar">Reintentar</v-btn></div>
    </v-alert>
    <v-alert v-if="reportes.avisos.length" type="warning" variant="tonal" class="mb-5" title="Información incompleta">
      <p v-for="aviso in reportes.avisos" :key="aviso">{{ aviso }}</p>
      <v-btn variant="text" size="small" :disabled="ocupado" @click="refrescar">Reintentar consulta</v-btn>
    </v-alert>

    <div v-if="!ocupado && !error && !fincas.fincas.length" class="dashboard-empty">
      <v-icon size="36" color="primary">mdi-map-marker-outline</v-icon>
      <h2>No hay fincas disponibles</h2>
      <p class="text-medium-emphasis">Necesitas una finca asignada para consultar sus reportes.</p>
    </div>
    <template v-else-if="!error">
      <div class="section-heading">
        <h2>Resumen de enfunde</h2>
        <span class="text-medium-emphasis">{{ periodo }} · {{ reportes.scopeDatos === 'propio' ? 'Mis registros' : 'Finca completa' }}</span>
      </div>
      <section class="kpi-grid" aria-label="Indicadores de enfunde" :aria-busy="ocupado">
        <template v-if="!listo || reportes.loadingKpis">
          <v-skeleton-loader v-for="n in 4" :key="n" type="article" />
        </template>
        <SummaryCards v-for="card in indicadores" v-else :key="card.title" :card="card" @view-details="verTendencia" />
      </section>

      <EstadoBotanicoFinca :senales="reportes.senalesFinca" :anio="reportes.anioSeleccionado"
        :loading="!listo || reportes.loadingKpis" :puede-ver-alertas="auth.can('view.alertas')" :finca-id="fincas.fincaSeleccionadaId" />

      <PendientesFinca v-if="auth.can('view.alertas')" :pendientes="prioridades" :finca-id="fincas.fincaSeleccionadaId"
        :finca-nombre="fincas.fincaSeleccionada?.nombre || 'Finca seleccionada'"
        :loading="!listo || fincas.loading || pendientes.loading.value" :error="pendientes.error.value"
        :consultado-en="pendientes.consultadoEn.value" :limitado="pendientes.items.value.length >= LIMITE_ALERTAS_DASHBOARD"
        @reintentar="pendientes.cargar" />

      <div class="dashboard-charts">
        <div ref="mensual" class="chart-anchor">
          <v-skeleton-loader v-if="!listo || reportes.loadingMensual" type="image" height="330" />
          <EarningsChart v-else :series="reportes.chartSeries" :categories="reportes.chartCategories" :error="reportes.erroresGraficos.mensual" />
        </div>
        <RendimientoCintas :cintas="reportes.cintasStats" :loading="!listo || reportes.loadingCintas" :error="reportes.erroresGraficos.cintas" />
        <div ref="semanal" class="chart-anchor weekly-chart">
          <v-skeleton-loader v-if="!listo || reportes.loadingSemanal" type="image" height="330" />
          <TendenciaSemanal v-else :series="reportes.chartSeriesSemanal" :categories="reportes.chartCategoriesSemanal" :error="reportes.erroresGraficos.semanal" />
        </div>
      </div>
    </template>
  </v-container>
</template>

<style scoped>
.dashboard { max-width: 1440px; padding: 28px; letter-spacing: 0; }
.dashboard-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.dashboard-header h1 { font-size: 26px; font-weight: 750; line-height: 1.25; letter-spacing: 0; }
.dashboard-header p { font-size: 14px; margin-top: 6px; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.refresh-time { font-size: 12px; }
.section-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 6px 16px; margin-bottom: 12px; }
.section-heading h2 { font-size: 16px; font-weight: 700; }
.section-heading span { font-size: 12px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
.dashboard-charts { display: grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap: 20px; align-items: start; }
.chart-anchor { min-width: 0; scroll-margin-top: 100px; }
.weekly-chart { grid-column: 1 / -1; }
.dashboard-empty { text-align: center; padding: 64px 16px; }
.dashboard-empty h2 { font-size: 18px; margin: 12px 0 6px; }
@media (max-width: 1100px) { .dashboard-charts { grid-template-columns: 1fr; } }
@media (max-width: 759px) { .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 599px) {
  .dashboard { padding: 16px; }
  .dashboard-header { margin-bottom: 16px; }
  .dashboard-header h1 { font-size: 24px; }
  .header-actions { width: 100%; justify-content: space-between; }
}
</style>
