<template>
  <v-container fluid class="bg-background min-h-screen pa-4 pa-md-8 transition-colors">
    <v-row justify="center">
      <v-col cols="12" xl="11">
        
        <header class="d-flex flex-column flex-lg-row align-start align-lg-center justify-space-between mb-8 gap-6">
          <div class="header-text-container">
            <h1 class="text-h4 text-md-h3 font-weight-black text-high-emphasis tracking-tight">
              Panel de Reportes
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis mt-1">
              Monitoreo de producción en tiempo real
            </p>
          </div>

          <v-card variant="flat" class="pa-2 rounded-xl bg-surface border filters-box w-100 w-lg-auto">
            <v-row dense align="center" no-gutters>
              <v-col cols="4" sm="auto">
                <div class="selector-anio px-1"><AnoSelector /></div>
              </v-col>
              <v-divider vertical class="mx-2 d-none d-sm-flex" inset />
              <v-col cols="8" sm="auto">
                <div class="selector-finca px-1"><FincaSelector /></div>
              </v-col>
              <v-divider vertical class="mx-2 d-none d-sm-flex" inset />
              <v-col cols="12" sm="auto" class="d-flex justify-start px-2 pt-2 pt-sm-0">
                <v-checkbox
                  v-model="reportesStore.mostrarComparativo"
                  label="Año anterior"
                  density="compact"
                  hide-details
                  color="primary"
                  class="font-weight-bold checkbox-text"
                />
              </v-col>
            </v-row>
          </v-card>
        </header>

        <section class="mb-10">
          <v-row v-if="reportesStore.loading" dense>
            <v-col v-for="n in 4" :key="n" cols="12" sm="6" lg="3">
              <v-skeleton-loader type="card-avatar" class="rounded-xl border bg-surface" />
            </v-col>
          </v-row>
          <v-row v-else-if="reportesStore.tarjetas && reportesStore.tarjetas.length" dense>
            <v-col v-for="card in reportesStore.tarjetas" :key="card.title" cols="12" sm="6" lg="3">
              <SummaryCards :card="card" class="kpi-card-hover h-100" />
            </v-col>
          </v-row>
        </section>

        <v-row>
          <v-col cols="12" lg="8">
            <v-card variant="flat" class="rounded-xl mb-6 bg-surface shadow-sm border overflow-visible">
              <div class="pa-4 d-flex align-center border-b bg-background-opacity">
                <v-avatar size="32" color="primary" variant="tonal" class="mr-3">
                  <v-icon size="18">mdi-chart-bar</v-icon>
                </v-avatar>
                <span class="text-overline font-weight-black text-high-emphasis">Tendencia Mensual de Cosecha</span>
              </div>
              <div class="pa-2 pa-md-4">
                <v-skeleton-loader v-if="reportesStore.loading" type="image" height="350" class="rounded-lg bg-surface" />
                <EarningsChart
                  v-else-if="reportesStore.chartSeries && reportesStore.chartSeries.length"
                  :series="reportesStore.chartSeries"
                  :categories="reportesStore.chartCategories"
                  :height="350"
                />
              </div>
            </v-card>

            <v-card variant="flat" class="rounded-xl mb-6 bg-surface shadow-sm border overflow-visible">
              <div class="pa-4 d-flex align-center border-b bg-background-opacity">
                <v-avatar size="32" color="info" variant="tonal" class="mr-3">
                  <v-icon size="18">mdi-calendar-week</v-icon>
                </v-avatar>
                <span class="text-overline font-weight-black text-high-emphasis">Tendencia Semanal (Últimas semanas)</span>
              </div>
              <div class="pa-2 pa-md-4">
                <v-skeleton-loader v-if="reportesStore.loading" type="image" height="300" class="rounded-lg bg-surface" />
                <TendenciaSemanal
                  v-else
                  :series="reportesStore.chartSeriesSemanal"
                  :categories="reportesStore.chartCategoriesSemanal"
                />
              </div>
            </v-card>

            <v-card variant="flat" class="rounded-xl bg-surface shadow-sm border overflow-hidden">
              <div class="pa-4 d-flex align-center border-b bg-background-opacity">
                <v-avatar size="32" color="success" variant="tonal" class="mr-3">
                  <v-icon size="18">mdi-label-percent</v-icon>
                </v-avatar>
                <span class="text-overline font-weight-black text-high-emphasis">Rendimiento por Color de Cinta</span>
              </div>
              <v-skeleton-loader v-if="reportesStore.loading" type="list-item-avatar-three-line" class="bg-surface" />
              <RendimientoCintas v-else :cintas="reportesStore.cintasStats" :loading="reportesStore.loading" />
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <div class="sticky-sidebar">
              <v-skeleton-loader v-if="reportesStore.loading" type="article" class="rounded-xl border bg-surface" />
              <SideStats v-else :stats="reportesStore.sideStats" :loading="reportesStore.loading" />
            </div>
          </v-col>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'

// Stores
import { useReportesStore } from '../../stores/reportesStore.js'
import { useFincaStore } from '../../stores/fincaStore.js'
import { useEnfundeStore } from '../../stores/enfundeStore.js'

// Componentes
import SummaryCards from '../../components/reportes/sumaryCards.vue'
import EarningsChart from '../../components/reportes/earningsChart.vue'
import TendenciaSemanal from '../../components/reportes/tendenciaSemanal.vue' // ✅ Importado
import SideStats from '../../components/reportes/sideStats.vue'
import RendimientoCintas from '../../components/reportes/rendimientoCintas.vue'
import FincaSelector from '../../components/ui/FincaSelector.vue'
import AnoSelector from '../../components/ui/AnoSelector.vue'

const reportesStore = useReportesStore()
const fincaStore = useFincaStore()
const enfundeStore = useEnfundeStore()

const { fincaSeleccionadaId } = storeToRefs(fincaStore)

const refrescarTodo = async () => {
  const fincaId = fincaSeleccionadaId.value
  if (!fincaId) return

  await Promise.all([
    reportesStore.cargarReportes(fincaId),
    enfundeStore.cargarRegistros(fincaId)
  ])
}

onMounted(async () => {
  await fincaStore.obtenerFincas()
  if (!fincaSeleccionadaId.value && fincaStore.fincas.length > 0) {
    fincaSeleccionadaId.value = fincaStore.fincas[0].id
  }
  if (fincaSeleccionadaId.value) {
    await refrescarTodo()
  }
})

watch(
  [fincaSeleccionadaId, () => reportesStore.anioSeleccionado, () => reportesStore.mostrarComparativo],
  async () => {
    await refrescarTodo()
  }
)
</script>

<style scoped>
.transition-colors { transition: background-color 0.3s ease, color 0.3s ease; }
.filters-box, .border { border: 1px solid rgba(var(--v-border-color), 0.1) !important; }
.bg-background-opacity { background-color: rgba(var(--v-theme-on-surface), 0.03) !important; }
.checkbox-text :deep(.v-label) { font-size: 0.85rem !important; opacity: 1; }
.border-b { border-bottom: 1px solid rgba(var(--v-border-color), 0.05) !important; }
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important; }
.sticky-sidebar { position: sticky; top: 24px; }
.gap-6 { gap: 24px; }
.tracking-tight { letter-spacing: -0.03em; }

@media (max-width: 960px) {
  .header-text-container { text-align: left; width: 100%; }
}
</style>