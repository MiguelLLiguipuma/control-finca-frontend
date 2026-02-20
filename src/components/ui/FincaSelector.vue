<template>
  <div class="finca-selector-wrapper">
    <v-select
      v-model="selectedId"
      :items="fincas"
      item-title="nombre"
      item-value="id"
      placeholder="Seleccionar finca"
      variant="solo-filled"
      flat
      density="compact"
      hide-details
      rounded="lg"
      :loading="loading"
      class="custom-select-finca"
    >
      <template v-slot:prepend-inner>
        <v-icon size="18" color="primary">mdi-map-marker-outline</v-icon>
      </template>

      <template v-slot:loader>
        <v-progress-linear indeterminate color="primary" height="2" />
      </template>
    </v-select>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFincaStore } from '@/stores/fincaStore'
import { storeToRefs } from 'pinia'

const fincaStore = useFincaStore()
const { fincas, fincaSeleccionadaId, loading } = storeToRefs(fincaStore)

const selectedId = computed({
  get: () => fincaSeleccionadaId.value,
  set: (val) => fincaStore.seleccionarFinca(val),
})
</script>

<style scoped>
.finca-selector-wrapper {
  width: 100%;
  min-width: 220px;
  max-width: 320px;
}

.custom-select-finca :deep(.v-field) {
  border: 1px solid rgba(var(--v-border-color), 0.15) !important;
  background-color: rgba(var(--v-theme-on-surface), 0.05) !important;
  transition: all 0.2s ease;
  border-radius: 12px !important;
  padding-inline-start: 8px !important;
}

.custom-select-finca :deep(.v-field--focused) {
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.15) !important;
}

.custom-select-finca :deep(.v-field__input) {
  font-size: 0.81rem !important;
  font-weight: 700 !important;
  color: rgb(var(--v-theme-on-surface)) !important;
  min-height: 38px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: flex;
  align-items: center;
}

.custom-select-finca :deep(.v-field__prepend-inner) {
  padding-top: 0 !important;
  align-items: center !important;
  margin-right: 4px !important;
}

.custom-select-finca :deep(.v-field__append-inner) {
  padding-top: 0 !important;
  align-items: center !important;
  color: rgba(var(--v-theme-on-surface), 0.5) !important;
}

.custom-select-finca :deep(.v-label) {
  display: none !important;
}

:deep(.v-list) {
  background: rgb(var(--v-theme-surface)) !important;
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}
</style>
