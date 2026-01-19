<template>
  <div class="list-container">
    <v-data-table
      :headers="headers"
      :items="empresasFiltradas"
      :loading="loading"
      class="custom-table"
      hover
    >
      <template #[`item.nombre`]="{ item }">
        <div class="d-flex align-center py-4">
          <v-avatar size="40" :color="isDark ? 'grey-darken-4' : 'grey-lighten-4'" class="mr-4 rounded-lg border">
            <v-icon :color="isDark ? 'primary' : 'medium-emphasis'">mdi-office-building</v-icon>
          </v-avatar>
          <div>
            <div class="text-subtitle-2 font-weight-bold text-high-emphasis leading-tight">
              {{ item.nombre }}
            </div>
            <div class="text-caption text-disabled font-medium">
              ID: #{{ item.id.toString().padStart(4, '0') }}
            </div>
          </div>
        </div>
      </template>

      <template #[`item.ruc`]="{ item }">
        <code class="ruc-badge">{{ item.ruc || 'S/N RUC' }}</code>
      </template>

      <template #[`item.telefono`]="{ item }">
        <div class="d-flex align-center">
          <v-icon size="16" color="medium-emphasis" class="mr-2">mdi-phone-outline</v-icon>
          <span class="text-body-2 text-medium-emphasis">{{ item.telefono || 'Sin contacto' }}</span>
        </div>
      </template>

      <template #[`item.actions`]="{ item }">
        <div class="d-flex justify-end gap-1">
          <v-btn
            icon="mdi-pencil-outline"
            variant="text"
            color="primary"
            size="small"
            class="rounded-lg action-btn"
            @click="$emit('edit', item)"
          />
          <v-btn
            icon="mdi-trash-can-outline"
            variant="text"
            color="error"
            size="small"
            class="rounded-lg action-btn"
            @click="confirmarEliminacion(item)"
          />
        </div>
      </template>

      <template #loading>
        <v-skeleton-loader type="table-row-divider@5" />
      </template>

      <template #no-data>
        <div class="pa-16 text-center">
          <v-icon size="64" color="disabled" class="mb-4">mdi-database-off-outline</v-icon>
          <div class="text-h6 text-disabled font-weight-medium">No hay empresas registradas</div>
          <v-btn 
            variant="tonal" 
            color="primary" 
            class="mt-2 text-none rounded-xl" 
            prepend-icon="mdi-plus"
            @click="$emit('create')"
          >
            Registrar la primera
          </v-btn>
        </div>
      </template>
    </v-data-table>

    <v-dialog v-model="dialogoEliminar" max-width="440" transition="scale-transition">
      <v-card class="rounded-xl pa-2 overflow-hidden bg-surface">
        <v-card-text class="text-center pa-8">
          <div class="delete-icon-wrapper mb-6">
            <v-icon color="error" size="40">mdi-alert-rhombus</v-icon>
          </div>
          
          <h3 class="text-h5 font-weight-black text-high-emphasis mb-2">¿Confirmar eliminación?</h3>
          <p class="text-body-1 text-medium-emphasis mb-8 px-4">
            Estás a punto de borrar a <span class="text-primary font-weight-bold">{{ empresaAEliminar?.nombre }}</span>.
            Esta acción es irreversible.
          </p>

          <div class="d-flex flex-column gap-3">
            <v-btn 
              block 
              color="error" 
              size="large"
              elevation="0" 
              class="rounded-xl font-weight-bold" 
              @click="ejecutarEliminacion"
            >
              Sí, eliminar registro
            </v-btn>
            <v-btn 
              block 
              variant="text" 
              color="medium-emphasis" 
              size="large"
              class="rounded-xl font-weight-bold" 
              @click="dialogoEliminar = false"
            >
              Mantener empresa
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useTheme } from 'vuetify';

const props = defineProps({
  empresas: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
});

const emit = defineEmits(['create', 'edit', 'delete']);
const theme = useTheme();

const busqueda = ref('');
const dialogoEliminar = ref(false);
const empresaAEliminar = ref(null);

const isDark = computed(() => theme.global.current.value.dark);

const empresasFiltradas = computed(() => {
  if (!busqueda.value) return props.empresas;
  const t = busqueda.value.toLowerCase();
  return props.empresas.filter(e => 
    e.nombre?.toLowerCase().includes(t) || e.ruc?.toLowerCase().includes(t)
  );
});

const headers = [
  { title: 'Empresa', key: 'nombre', align: 'start', sortable: true },
  { title: 'RUC / Identificación', key: 'ruc', align: 'start' },
  { title: 'Contacto', key: 'telefono', align: 'start' },
  { title: '', key: 'actions', align: 'end', sortable: false },
];

function confirmarEliminacion(empresa) {
  empresaAEliminar.value = empresa;
  dialogoEliminar.value = true;
}

function ejecutarEliminacion() {
  emit('delete', empresaAEliminar.value);
  dialogoEliminar.value = false;
}
</script>

<style scoped>
/* ESTILOS DE TABLA SAAS ADAPTABLES */
.custom-table :deep(.v-data-table-header) {
  height: 56px;
  background-color: rgba(var(--v-theme-on-surface), 0.02) !important;
}

.custom-table :deep(.v-data-table-header th) {
  box-shadow: none !important;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1) !important;
  font-weight: 800 !important;
  color: rgba(var(--v-theme-on-surface), 0.5) !important;
  text-transform: uppercase;
  font-size: 0.7rem !important;
  letter-spacing: 0.05em;
}

.custom-table :deep(.v-data-table__td) {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.05) !important;
  padding: 12px 16px !important;
}

.custom-table :deep(tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.02) !important;
}

/* BADGE PARA RUC CON JETBRAINS MONO */
.ruc-badge {
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgb(var(--v-theme-primary));
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  font-weight: 700;
  border: 1px solid rgba(var(--v-border-color), 0.1);
}

/* DIÁLOGO DE ELIMINACIÓN */
.delete-icon-wrapper {
  width: 80px;
  height: 80px;
  background: rgba(var(--v-theme-error), 0.1);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.gap-1 { gap: 4px; }
.gap-3 { gap: 12px; }
.leading-tight { line-height: 1.25; }
</style>