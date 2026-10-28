<script setup lang="ts">
import { computed } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'
import { useAuthStore } from '@/stores/auth/authStore'
import AnoSelector from './AnoSelector.vue'
import FincaSelector from './FincaSelector.vue'
withDefaults(defineProps<{ showYear?: boolean; showFinca?: boolean; showComparativo?: boolean }>(), {
  showYear: true, showFinca: true, showComparativo: true,
})
const reportes = useReportesStore()
const auth = useAuthStore()
const showScopeToggle = computed(() => auth.normalizedRole === 'OPERADOR')
</script>

<template>
  <section class="report-filters" aria-label="Filtros del dashboard">
    <div v-if="showFinca" class="filter-finca">
      <span class="filter-label">Finca</span>
      <FincaSelector />
    </div>
    <div v-if="showYear" class="filter-year">
      <span class="filter-label">Año</span>
      <AnoSelector />
    </div>
    <div v-if="showComparativo" class="filter-mode">
      <span class="filter-label">Período</span>
      <v-btn-toggle v-model="reportes.modoComparativo" mandatory divided color="primary" aria-label="Período del dashboard">
        <v-btn value="actual" variant="text">Año completo</v-btn>
        <v-btn value="comparativo" variant="text">Comparar</v-btn>
        <v-btn value="ytd" variant="text" title="Comparar acumulados hasta la fecha de corte">Al corte</v-btn>
      </v-btn-toggle>
    </div>
    <div v-if="showScopeToggle" class="filter-scope">
      <span class="filter-label">Registros</span>
      <v-btn-toggle v-model="reportes.scopeDatos" mandatory divided color="primary" aria-label="Alcance de datos">
        <v-btn value="finca" variant="text">Mi finca</v-btn>
        <v-btn value="propio" variant="text">Mi producción</v-btn>
      </v-btn-toggle>
    </div>
  </section>
</template>

<style scoped>
.report-filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 16px; padding: 20px 0; margin-bottom: 20px; border-block: 1px solid rgba(var(--v-theme-on-surface), .12); }
.filter-finca { flex: 1 1 240px; min-width: 0; }
.filter-year { flex: 0 1 220px; min-width: 0; }
.filter-mode, .filter-scope { min-width: 0; }
.filter-label { display: block; margin-bottom: 6px; font-size: 12px; font-weight: 650; color: rgba(var(--v-theme-on-surface), .7); }
.report-filters :deep(.finca-selector-wrapper) { max-width: none; }
.report-filters :deep(.v-field) { border-radius: 6px !important; }
.report-filters :deep(.v-btn-toggle) { height: 44px; border: 1px solid rgba(var(--v-theme-on-surface), .14); border-radius: 6px; }
.report-filters :deep(.v-btn-toggle .v-btn) { font-size: 12px; padding-inline: 12px; letter-spacing: 0; text-transform: none; }
@media (max-width: 599px) {
  .report-filters { gap: 12px; padding: 16px 0; }
  .filter-finca, .filter-year, .filter-mode, .filter-scope { flex: 1 1 100%; }
  .report-filters :deep(.v-btn-toggle) { width: 100%; }
  .report-filters :deep(.v-btn-toggle .v-btn) { flex: 1; min-width: 0; padding-inline: 8px; }
}
</style>
