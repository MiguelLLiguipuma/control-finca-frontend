<template>
  <v-container fluid class="bg-background min-h-screen pa-4 pa-md-8 transition-colors">
    <v-row justify="center">
      <v-col cols="12" xl="11">
        
        <header class="d-flex flex-column flex-lg-row align-start align-lg-center justify-space-between mb-8 gap-6">
          <div class="header-text-container">
            <h1 class="text-h3 font-weight-black text-high-emphasis">
              Panel de Reportes
            </h1>
            <p class="text-body-2 text-medium-emphasis mt-1">
              Monitoreo de producción en tiempo real
            </p>
          </div>

          <ReportFiltersBar class="w-100 w-lg-auto" />
        </header>

        <ViewHelpHint
          class="mb-6"
          title="¿Cómo leer este Dashboard?"
          summary="Este panel resume la situación de la finca seleccionada: producción, tendencia mensual/semanal y rendimiento por color de cinta."
          :steps="[
            'Selecciona finca y año en los filtros.',
            'Revisa las tarjetas KPI para ver el estado general.',
            'Analiza la tendencia mensual y semanal para detectar cambios.',
            'Valida el rendimiento por color de cinta para tomar acciones.',
          ]"
          :notes="[
            'Si no hay datos, verifica finca, año y registros operativos.',
            'Los gráficos no reemplazan el registro diario; lo complementan.',
            'Usa este tablero para decisiones rápidas de supervisión.',
          ]"
        />

        <section
          ref="kpisSectionRef"
          class="mb-10"
          aria-labelledby="dashboard-kpis-heading"
        >
          <h2 id="dashboard-kpis-heading" class="sr-only">Indicadores principales del dashboard</h2>
          <v-row v-if="reportesStore.loadingKpis" dense>
            <v-col v-for="n in 5" :key="n" cols="12" sm="6" lg="3">
              <v-skeleton-loader type="card-avatar" class="rounded-xl border bg-surface" aria-label="Cargando indicadores" />
            </v-col>
          </v-row>
          <v-row v-else-if="reportesStore.tarjetas && reportesStore.tarjetas.length" dense>
              <v-col v-for="card in reportesStore.tarjetas" :key="card.title" cols="12" sm="6" lg="3">
                <SummaryCards :card="card" class="kpi-card-hover h-100" @view-details="handleViewDetails" />
              </v-col>
            </v-row>
          <v-sheet
            v-else
            rounded="xl"
            class="pa-8 text-center border bg-surface"
          >
            <v-icon size="56" color="medium-emphasis" class="mb-2">mdi-chart-box-outline</v-icon>
            <div class="text-h6 font-weight-bold text-medium-emphasis">No hay datos para este período</div>
            <div class="text-body-2 text-disabled mt-1">Prueba con otra finca o cambia el año.</div>
          </v-sheet>
        </section>

        <v-row>
          <v-col cols="12" lg="8">
            <v-card
              ref="mensualSectionRef"
              v-intersect.once="onMensualIntersect"
              variant="flat"
              class="rounded-xl mb-6 bg-surface shadow-sm border overflow-visible"
              role="region"
              aria-labelledby="dashboard-mensual-heading"
            >
              <div class="pa-4 d-flex align-center border-b bg-background-opacity">
                <v-avatar size="32" color="primary" variant="tonal" class="mr-3">
                  <v-icon size="18">mdi-chart-bar</v-icon>
                </v-avatar>
                <span id="dashboard-mensual-heading" class="text-overline font-weight-black text-high-emphasis">Tendencia Mensual de Cosecha</span>
              </div>
              <div class="pa-2 pa-md-4">
                <v-skeleton-loader v-if="reportesStore.loadingMensual" type="image" height="350" class="rounded-lg bg-surface" />
                <v-skeleton-loader
                  v-else-if="!showMensualChart"
                  type="image"
                  height="350"
                  class="rounded-lg bg-surface"
                />
                <EarningsChart
                  v-else-if="reportesStore.chartSeries && reportesStore.chartSeries.length"
                  :series="reportesStore.chartSeries"
                  :categories="reportesStore.chartCategories"
                />
              </div>
            </v-card>

            <v-card
              ref="semanalSectionRef"
              v-intersect.once="onSemanalIntersect"
              variant="flat"
              class="rounded-xl mb-6 bg-surface shadow-sm border overflow-visible"
              role="region"
              aria-labelledby="dashboard-semanal-heading"
            >
              <div class="pa-4 d-flex align-center border-b bg-background-opacity">
                <v-avatar size="32" color="info" variant="tonal" class="mr-3">
                  <v-icon size="18">mdi-calendar-week</v-icon>
                </v-avatar>
                  <span id="dashboard-semanal-heading" class="text-overline font-weight-black text-high-emphasis">Tendencia Semanal (Año completo)</span>
              </div>
              <div class="pa-2 pa-md-4">
                <v-skeleton-loader v-if="reportesStore.loadingSemanal" type="image" height="300" class="rounded-lg bg-surface" />
                <v-skeleton-loader
                  v-else-if="!showSemanalChart"
                  type="image"
                  height="300"
                  class="rounded-lg bg-surface"
                />
                <TendenciaSemanal
                  v-else
                  :series="reportesStore.chartSeriesSemanal"
                  :categories="reportesStore.chartCategoriesSemanal"
                />
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4">
            <div class="sticky-sidebar">
              <v-skeleton-loader v-if="reportesStore.loadingKpis" type="article" class="rounded-xl border bg-surface" />
              <SideStats v-else :stats="reportesStore.sideStats" :loading="reportesStore.loadingKpis" />

              <v-card
                ref="cintasSectionRef"
                v-intersect.once="onCintasIntersect"
                variant="flat"
                class="rounded-xl bg-surface shadow-sm border overflow-hidden"
                role="region"
                aria-labelledby="dashboard-cintas-heading"
              >
                <div class="pa-4 d-flex align-center border-b bg-background-opacity">
                  <v-avatar size="32" color="success" variant="tonal" class="mr-3">
                    <v-icon size="18">mdi-label-percent</v-icon>
                  </v-avatar>
                  <span id="dashboard-cintas-heading" class="text-overline font-weight-black text-high-emphasis">Rendimiento por Color de Cinta</span>
                </div>
                <v-skeleton-loader v-if="reportesStore.loadingCintas" type="list-item-avatar-three-line" class="bg-surface" />
                <v-skeleton-loader
                  v-else-if="!showCintasChart"
                  type="list-item-avatar-three-line"
                  class="bg-surface"
                />
                <RendimientoCintas v-else :cintas="reportesStore.cintasStats" :loading="reportesStore.loadingCintas" />
              </v-card>
            </div>
          </v-col>
        </v-row>

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { defineAsyncComponent, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { storeToRefs } from 'pinia'

// Stores
import { useReportesStore } from '../../stores/reportesStore'
import { useFincaStore } from '../../stores/fincaStore'
import { useEnfundeStore } from '../../stores/enfundeStore'

// Componentes
import SummaryCards from '../../components/reportes/sumaryCards.vue'
import SideStats from '../../components/reportes/sideStats.vue'
import ReportFiltersBar from '../../components/ui/ReportFiltersBar.vue'
import ViewHelpHint from '../../components/ui/ViewHelpHint.vue'

const EarningsChart = defineAsyncComponent(() => import('../../components/reportes/earningsChart.vue'))
const TendenciaSemanal = defineAsyncComponent(() => import('../../components/reportes/tendenciaSemanal.vue'))
const RendimientoCintas = defineAsyncComponent(() => import('../../components/reportes/rendimientoCintas.vue'))

const reportesStore = useReportesStore()
const fincaStore = useFincaStore()
const enfundeStore = useEnfundeStore()

const { fincaSeleccionadaId } = storeToRefs(fincaStore)
type ScrollTarget = HTMLElement | ComponentPublicInstance<{ $el?: HTMLElement }>
type SectionRef = ScrollTarget | null

const kpisSectionRef = ref<SectionRef>(null)
const mensualSectionRef = ref<SectionRef>(null)
const semanalSectionRef = ref<SectionRef>(null)
const cintasSectionRef = ref<SectionRef>(null)
const showMensualChart = ref(false)
const showSemanalChart = ref(false)
const showCintasChart = ref(false)

const resolveScrollElement = (target: SectionRef): HTMLElement | null => {
  if (!target) return null
  if (target instanceof HTMLElement) return target
  return ('$el' in target && target.$el instanceof HTMLElement) ? target.$el : null
}

const scrollToSection = (elRef: { value: SectionRef }) => {
  const target = resolveScrollElement(elRef.value)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const onMensualIntersect = (isIntersecting: boolean) => {
  if (isIntersecting) showMensualChart.value = true
}

const onSemanalIntersect = (isIntersecting: boolean) => {
  if (isIntersecting) showSemanalChart.value = true
}

const onCintasIntersect = (isIntersecting: boolean) => {
  if (isIntersecting) showCintasChart.value = true
}

const handleViewDetails = (title: string) => {
  const normalized = String(title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (normalized.includes('mensual') || normalized.includes('produccion')) {
    scrollToSection(mensualSectionRef)
    return
  }

  if (normalized.includes('semanal') || normalized.includes('semana')) {
    scrollToSection(semanalSectionRef)
    return
  }

  if (normalized.includes('cinta') || normalized.includes('color') || normalized.includes('rendimiento')) {
    scrollToSection(cintasSectionRef)
    return
  }

  scrollToSection(kpisSectionRef)
}

const refrescarTodo = async () => {
  const fincaId = Number(fincaSeleccionadaId.value || 0)
  const fincaValida = fincaStore.fincas.some((f) => f.id === fincaId)
  if (!fincaValida) {
    const primera = fincaStore.fincas[0]?.id
    if (!primera) return
    fincaStore.seleccionarFinca(primera)
    return
  }

  await Promise.all([reportesStore.cargarReportes(fincaId), enfundeStore.cargarRegistros(fincaId)])
}

onMounted(async () => {
  await fincaStore.obtenerFincas()
  const seleccionActual = Number(fincaSeleccionadaId.value || 0)
  const existeSeleccion = fincaStore.fincas.some((f) => f.id === seleccionActual)
  if ((!seleccionActual || !existeSeleccion) && fincaStore.fincas.length > 0) {
    fincaStore.seleccionarFinca(fincaStore.fincas[0].id)
    return
  }

  await refrescarTodo()
})

watch(
  [
    fincaSeleccionadaId,
    () => reportesStore.anioSeleccionado,
    () => reportesStore.modoComparativo,
    () => reportesStore.scopeDatos,
  ],
  async () => {
    await refrescarTodo()
  },
)
</script>

<style scoped>
.transition-colors { transition: background-color 0.3s ease, color 0.3s ease; }
.filters-box, .border { border: 1px solid rgba(var(--v-border-color), 0.1) !important; }
.bg-background-opacity { background-color: rgba(var(--v-theme-on-surface), 0.03) !important; }
.border-b { border-bottom: 1px solid rgba(var(--v-border-color), 0.05) !important; }
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important; }
.sticky-sidebar { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 24px; }
.gap-6 { gap: 24px; }

@media (max-width: 960px) {
  .header-text-container { text-align: left; width: 100%; }
}
</style>
<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
