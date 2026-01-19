<template>
  <v-card border variant="flat" class="rounded-xl bg-surface shadow-sm overflow-hidden">
    <div class="pa-5 border-b bg-header-subtle d-flex align-center justify-space-between flex-wrap gap-4">
      <div class="d-flex align-center">
        <v-avatar color="primary" variant="tonal" size="32" class="mr-3">
          <v-icon size="18">mdi-table-large</v-icon>
        </v-avatar>
        <div>
          <span class="text-subtitle-2 font-weight-black text-high-emphasis uppercase tracking-wider">Historial Operativo</span>
          <p class="text-caption text-medium-emphasis mb-0">Registros del periodo {{ enfundeStore.anioSeleccionado }}</p>
        </div>
      </div>

      <div class="d-flex gap-2">
        <v-chip variant="flat" :color="isDark ? 'grey-darken-3' : 'grey-lighten-4'" size="small" class="font-weight-bold">
          <v-icon start size="14">mdi-database</v-icon>
          {{ registros.length }} Filas
        </v-chip>
        <v-chip variant="flat" color="primary" size="small" class="font-weight-bold" theme="light">
          <v-icon start size="14">mdi-package-variant</v-icon>
          {{ totalFundas.toLocaleString() }} Fundas
        </v-chip>
      </div>
    </div>

    <v-card-text class="pa-4 bg-surface">
      <v-text-field
        v-model="search"
        placeholder="Buscar en los resultados actuales..."
        prepend-inner-icon="mdi-magnify"
        density="comfortable"
        variant="solo-filled"
        flat
        hide-details
        clearable
        rounded="lg"
        class="custom-search"
      />
    </v-card-text>

    <v-data-table
      :headers="headers"
      :items="registros"
      :loading="loading"
      :search="search"
      :sort-by="[{ key: 'fecha', order: 'desc' }]"
      class="tabla-saas"
      density="comfortable"
      hover
    >
      <template #[`item.fecha`]="{ value }">
        <div class="d-flex flex-column py-2">
          <span class="text-body-2 font-weight-bold text-high-emphasis">{{ formatFecha(value) }}</span>
          <span class="text-caption text-disabled text-capitalize">{{ formatDiaSemana(value) }}</span>
        </div>
      </template>

      <template #[`item.empresa`]="{ item }">
        <div class="d-flex flex-column">
          <span class="text-body-2 font-weight-bold text-primary">{{ item.empresa }}</span>
          <div class="d-flex align-center">
            <v-icon size="12" color="medium-emphasis" class="mr-1">mdi-map-marker</v-icon>
            <span class="text-caption text-medium-emphasis font-weight-medium">{{ item.finca }}</span>
          </div>
        </div>
      </template>

      <template #[`item.usuario`]="{ value }">
        <div class="d-flex align-center">
          <v-avatar size="24" :color="isDark ? 'grey-darken-3' : 'grey-lighten-4'" class="mr-2">
            <v-icon size="14" color="medium-emphasis">mdi-account</v-icon>
          </v-avatar>
          <span class="text-body-2 font-weight-medium text-high-emphasis">{{ value }}</span>
        </div>
      </template>

      <template #[`item.color`]="{ value }">
        <v-chip
          v-if="value"
          variant="flat"
          size="x-small"
          :style="{ 
            backgroundColor: getColor(value), 
            color: getTextColor(value), 
            border: value === 'Blanca' ? (isDark ? '1px solid #444' : '1px solid #e2e8f0') : 'none' 
          }"
          class="font-weight-black px-3"
        >
          {{ value.toUpperCase() }}
        </v-chip>
        <span v-else class="text-caption text-disabled font-italic">Sin cinta</span>
      </template>

      <template #[`item.cantidad_fundas`]="{ value }">
        <div class="d-flex align-center justify-end font-weight-black text-high-emphasis">
          <v-icon :color="getCantidadColor(value)" size="14" class="mr-1">{{ getCantidadIcon(value) }}</v-icon>
          {{ value ? value.toLocaleString() : 0 }}
        </div>
      </template>

      <template #loading>
        <v-skeleton-loader type="table-row@5" class="bg-surface" />
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useEnfundeStore } from '@/stores/enfundeStore'

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const enfundeStore = useEnfundeStore()
const search = ref('')

// NORMALIZACIÓN DE REGISTROS: Asegura que el campo se llame 'color' para la tabla
const registros = computed(() => {
  return (enfundeStore.registrosFiltrados || []).map(reg => ({
    ...reg,
    // Si el backend envía 'cinta' en lugar de 'color', lo unificamos aquí
    color: reg.color || reg.cinta || null
  }))
})

const loading = computed(() => enfundeStore.loading)
const totalFundas = computed(() => enfundeStore.totalFundasFiltradas)

onMounted(() => {
  if (enfundeStore.registros.length === 0) {
    enfundeStore.cargarRegistros()
  }
})

const headers = [
  { title: 'Fecha de Registro', key: 'fecha', align: 'start', width: '130px' },
  { title: 'Localidad / Empresa', key: 'empresa', align: 'start' },
  { title: 'Operario', key: 'usuario', align: 'start' },
  { title: 'Cinta', key: 'color', align: 'center', width: '100px' },
  { title: 'Producción', key: 'cantidad_fundas', align: 'end', width: '120px' },
  { title: 'Obs.', key: 'observaciones', align: 'start', sortable: false }
]

const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const formatDiaSemana = (f) => f ? new Date(f).toLocaleDateString('es-ES', { weekday: 'long' }) : ''

const colores = { 
  Blanca: '#ffffff', 
  Negra: '#1e293b', 
  Lila: '#a855f7', 
  Roja: '#ef4444', 
  Cafe: '#78350f', 
  Amarilla: '#eab308', 
  Verde: '#22c55e', 
  Azul: '#3b82f6' 
}

const getColor = (c) => {
  if (c === 'Negra' && isDark.value) return '#64748b'
  return colores[c] || '#94a3b8'
}

const getTextColor = (c) => {
  if (c === 'Negra' && isDark.value) return '#ffffff'
  return ['Blanca', 'Amarilla'].includes(c) ? '#475569' : '#ffffff'
}

const getCantidadColor = (c) => c >= 200 ? 'success' : (c >= 100 ? 'warning' : 'error')
const getCantidadIcon = (c) => c >= 150 ? 'mdi-trending-up' : 'mdi-trending-down'
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.bg-header-subtle {
  background-color: rgba(var(--v-theme-on-surface), 0.03) !important;
}

.custom-search :deep(.v-field) {
  border-radius: 12px !important;
  background-color: rgba(var(--v-theme-on-surface), 0.05) !important;
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.custom-search :deep(.v-field--focused) {
  background-color: rgb(var(--v-theme-surface)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
}

.tabla-saas :deep(thead th) {
  background-color: rgba(var(--v-theme-on-surface), 0.02) !important;
  font-size: 0.75rem !important;
  font-weight: 800 !important;
  color: rgba(var(--v-theme-on-surface), 0.5) !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla-saas :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.02) !important;
}

.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }
</style>