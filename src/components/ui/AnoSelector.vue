<template>
  <div class="ano-selector-wrapper">
    <v-btn
      icon="mdi-chevron-left"
      size="small"
      variant="text"
      color="primary"
      :disabled="reportesStore.anioSeleccionado <= anioMinimo"
      @click="irAnioAnterior"
      class="mr-1"
    />
    <v-select
      v-model="reportesStore.anioSeleccionado"
      :items="aniosDisponibles"
      item-title="label"
      item-value="value"
      placeholder="Año"
      variant="solo-filled"
      flat
      density="compact"
      hide-details
      rounded="lg"
      class="custom-select-ano"
    >
      <template v-slot:prepend-inner>
        <v-icon size="18" color="primary">mdi-calendar-range</v-icon>
      </template>
    </v-select>
    <v-btn
      icon="mdi-chevron-right"
      size="small"
      variant="text"
      color="primary"
      :disabled="reportesStore.anioSeleccionado >= anioMaximo"
      @click="irAnioSiguiente"
      class="ml-1"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReportesStore } from '@/stores/reportesStore'

const reportesStore = useReportesStore()
const anioMaximo = new Date().getFullYear()
const anioMinimo = anioMaximo - 7

const aniosDisponibles = computed<{ value: number; label: string }[]>(() => {
  return Array.from({ length: 8 }, (_, i) => anioMaximo - i).map((value) => ({
    value,
    label: String(value),
  }))
})

const irAnioAnterior = () => {
  reportesStore.anioSeleccionado = Math.max(
    anioMinimo,
    Number(reportesStore.anioSeleccionado || anioMaximo) - 1,
  )
}

const irAnioSiguiente = () => {
  reportesStore.anioSeleccionado = Math.min(
    anioMaximo,
    Number(reportesStore.anioSeleccionado || anioMaximo) + 1,
  )
}
</script>

<style scoped>
.ano-selector-wrapper {
  width: 100%;
  max-width: 220px;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.custom-select-ano {
  flex: 1 1 auto;
  min-width: 0;
}

.custom-select-ano :deep(.v-field) {
  border: 1px solid rgba(var(--v-border-color), 0.15) !important;
  background-color: rgba(var(--v-theme-on-surface), 0.05) !important;
  transition: all 0.2s ease;
  border-radius: 12px !important;
  padding-inline-start: 8px !important;
}

.custom-select-ano :deep(.v-field--focused) {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.15) !important;
}

.custom-select-ano :deep(.v-field__input) {
  font-size: 0.81rem !important;
  font-weight: 700 !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  min-height: 38px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: flex;
  align-items: center;
}

.custom-select-ano :deep(.v-field__prepend-inner) {
  padding-top: 0 !important;
  align-items: center !important;
  margin-right: 4px !important;
}

.custom-select-ano :deep(.v-field__append-inner) {
  padding-top: 0 !important;
  align-items: center !important;
  color: rgba(var(--v-theme-on-surface), 0.5) !important;
}

:deep(.v-list) {
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  border-radius: 12px !important;
}

@media (max-width: 960px) {
  .ano-selector-wrapper {
    max-width: 100%;
  }
}
</style>
