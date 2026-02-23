<template>
  <div class="finca-selector-wrapper">
    <v-autocomplete
      v-model="selectedId"
      :items="fincaItems"
      item-title="nombre"
      item-value="id"
      placeholder="Buscar finca..."
      persistent-placeholder
      variant="solo-filled"
      flat
      density="compact"
      hide-details
      rounded="lg"
      :loading="loading"
      :disabled="!fincaItems.length"
      :custom-filter="filtroFinca"
      no-data-text="No hay fincas disponibles para este usuario"
      menu-icon="mdi-chevron-down"
      class="custom-select-finca"
    >
      <template v-slot:prepend-inner>
        <v-icon size="18" color="primary">mdi-map-marker-outline</v-icon>
      </template>
      <template #selection="{ item }">
        <div class="d-flex flex-column text-truncate py-1 selection-block">
          <span class="selection-title text-truncate">{{ item.raw.nombre }}</span>
          <span class="selection-subtitle text-truncate">
            {{ item.raw.empresa_nombre || 'Sin empresa' }}
          </span>
        </div>
      </template>
      <template #item="{ props, item }">
        <v-list-item
          v-bind="props"
          :title="item.raw.nombre"
          :subtitle="item.raw.empresa_nombre || 'Sin empresa'"
        >
          <template #subtitle>
            <span class="text-caption text-medium-emphasis text-truncate">
              {{ item.raw.empresa_nombre || 'Sin empresa' }}
              <template v-if="item.raw.ubicacion">
                · {{ item.raw.ubicacion }}
              </template>
            </span>
          </template>
        </v-list-item>
      </template>
      <template #no-data>
        <div class="pa-4 text-center text-medium-emphasis">
          <v-icon size="20" class="mb-1">mdi-map-marker-off-outline</v-icon>
          <div class="text-caption">No hay resultados para la búsqueda actual.</div>
        </div>
      </template>

      <template v-slot:loader>
        <v-progress-linear indeterminate color="primary" height="2" />
      </template>
    </v-autocomplete>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFincaStore } from '@/stores/fincaStore'
import { storeToRefs } from 'pinia'

const fincaStore = useFincaStore()
const { fincas, fincaSeleccionadaId, loading } = storeToRefs(fincaStore)

const fincaItems = computed(() =>
  (fincas.value || []).map((f) => ({
    ...f,
    nombre: f.nombre,
    empresa_nombre: f.empresa_nombre || 'Sin empresa',
  })),
)

const selectedId = computed({
  get: () => fincaSeleccionadaId.value,
  set: (val) => fincaStore.seleccionarFinca(val),
})

const filtroFinca = (
  _itemTitle,
  queryText,
  item,
) => {
  const q = String(queryText || '').trim().toLowerCase()
  if (!q) return true

  const raw = item?.raw || {}
  const texto = [
    raw.nombre || '',
    raw.empresa_nombre || '',
    raw.ubicacion || '',
  ]
    .join(' ')
    .toLowerCase()

  return texto.includes(q)
}
</script>

<style scoped>
.finca-selector-wrapper {
  width: 100%;
  min-width: 0;
  max-width: 360px;
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

.selection-block {
  min-width: 0;
}

.selection-title {
  font-size: 0.83rem;
  line-height: 1.05;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
}

.selection-subtitle {
  font-size: 0.68rem;
  line-height: 1.05;
  color: rgba(var(--v-theme-on-surface), 0.65);
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

@media (max-width: 960px) {
  .finca-selector-wrapper {
    max-width: 100%;
  }

  .selection-title {
    font-size: 0.8rem;
  }
}
</style>
