<template>
  <v-container fluid class="pa-4 pa-md-8 bg-background transition-colors min-h-screen">
    <v-row justify="center">
      <v-col cols="12" xl="10">
        
        <header class="d-flex flex-column flex-md-row align-start align-md-center justify-space-between mb-8 gap-4">
          <div class="d-flex align-center">
            <v-avatar color="primary" variant="tonal" rounded="xl" size="56" class="mr-4 shadow-sm">
              <v-icon size="30">mdi-domain</v-icon>
            </v-avatar>
            <div>
              <h1 class="text-h3 font-weight-black text-high-emphasis tracking-tight">Empresas</h1>
              <p class="text-subtitle-1 text-medium-emphasis mt-1">Gestión del directorio corporativo y fincas</p>
            </div>
          </div>

          <v-btn
            color="primary"
            size="large"
            class="px-8 rounded-xl font-weight-bold shadow-primary btn-hover-scale"
            prepend-icon="mdi-plus"
            elevation="0"
            :disabled="!canManage"
            aria-label="Crear nueva empresa"
            @click="openCreateDialog"
          >
            Nueva Empresa
          </v-btn>
        </header>

        <v-row class="mb-8" dense>
          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-5 rounded-xl bg-surface stats-card">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" rounded="lg" size="48" class="mr-4">
                  <v-icon>mdi-office-building-marker</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline font-weight-bold text-disabled leading-tight">Total Registros</div>
                  <div class="text-h4 font-weight-black text-high-emphasis">{{ empresaStore.empresas.length }}</div>
                </div>
              </div>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-5 rounded-xl bg-surface stats-card">
              <div class="d-flex align-center">
                <v-avatar color="success" variant="tonal" rounded="lg" size="48" class="mr-4">
                  <v-icon>mdi-shield-check</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline font-weight-bold text-disabled leading-tight">Estado Sistema</div>
                  <div class="text-h4 font-weight-black text-success">Activo</div>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-5 rounded-xl bg-surface stats-card">
              <div class="d-flex align-center">
                <v-avatar color="info" variant="tonal" rounded="lg" size="48" class="mr-4">
                  <v-icon>mdi-magnify</v-icon>
                </v-avatar>
                <div>
                  <div class="text-overline font-weight-bold text-disabled leading-tight">Mostrando</div>
                  <div class="text-h4 font-weight-black text-info">{{ empresasFiltradas.length }}</div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-card border variant="flat" class="rounded-xl overflow-hidden bg-surface shadow-sm">
          <div class="d-flex align-center px-6 py-4 bg-header-subtle border-b">
            <v-icon color="medium-emphasis" class="mr-3">mdi-magnify</v-icon>
            <label for="empresa-search" class="sr-only">Buscar empresas</label>
            <input
              id="empresa-search"
              v-model.trim="search"
              type="text" 
              placeholder="Buscar por nombre, RUC o representante..." 
              class="search-input text-body-1 text-high-emphasis"
              autocomplete="off"
            />
            <v-spacer />
            <v-btn 
              variant="tonal" 
              color="medium-emphasis" 
              icon="mdi-refresh" 
              size="small"
              aria-label="Actualizar listado de empresas"
              @click="empresaStore.fetchEmpresas()"
              :loading="empresaStore.loading"
            />
          </div>

          <div class="pa-0">
            <EmpresaList
              :empresas="empresasFiltradas"
              :loading="empresaStore.loading"
              :error="empresaStore.error || undefined"
              :can-manage="canManage"
              @create="openCreateDialog"
              @edit="openEditDialog"
              @delete="handleDeleteEmpresa"
            />
          </div>
        </v-card>

      </v-col>
    </v-row>

    <v-dialog v-model="dialogCreate" max-width="550" persistent scrollable>
        <v-card class="rounded-xl overflow-hidden shadow-2xl bg-surface">
        <div class="pa-6 border-b d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-avatar color="primary" variant="tonal" size="40" class="mr-3">
              <v-icon>mdi-office-building-plus</v-icon>
            </v-avatar>
            <h2 class="text-h6 font-weight-black text-high-emphasis">Registrar Empresa</h2>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Cerrar diálogo de crear empresa" @click="dialogCreate = false" />
        </div>
        
          <v-card-text class="pa-6 bg-background-alt">
            <EmpresaForm mode="create" @submit-success="handleCreateSuccess" @cancel="dialogCreate = false" />
          </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="dialogEdit" max-width="550" persistent scrollable>
      <v-card class="rounded-xl overflow-hidden shadow-2xl bg-surface">
        <div class="pa-6 border-b d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <v-avatar color="warning" variant="tonal" size="40" class="mr-3">
              <v-icon>mdi-office-building-cog</v-icon>
            </v-avatar>
            <h2 class="text-h6 font-weight-black text-high-emphasis">Editar Empresa</h2>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" aria-label="Cerrar diálogo de editar empresa" @click="dialogEdit = false" />
        </div>

        <v-card-text class="pa-6 bg-background-alt">
          <EmpresaForm
            mode="edit"
            :initial-data="empresaToEdit"
            @submit-success="handleEditSuccess"
            @cancel="dialogEdit = false"
          />
        </v-card-text>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useEmpresaStore } from '@/stores/empresaStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/auth/authStore';
import EmpresaList from '@/components/empresa/empresaList.vue';
import EmpresaForm from '@/components/empresa/empresaForm.vue';

const empresaStore = useEmpresaStore();
const uiStore = useUIStore();
const authStore = useAuthStore();
const dialogCreate = ref(false);
const dialogEdit = ref(false);
const empresaToEdit = ref<any>(null);
const search = ref('');

const canManage = computed(() => authStore.can('action.admin.manage'));
const empresasFiltradas = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return empresaStore.empresas;

  return empresaStore.empresas.filter((empresa: any) =>
    [empresa.nombre, empresa.ruc, empresa.telefono, empresa.direccion]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
});

onMounted(async () => {
  try {
    await empresaStore.fetchEmpresas();
  } catch {
    uiStore.showError('No se pudieron cargar las empresas.');
  }
});

function openCreateDialog() {
  if (!canManage.value) {
    uiStore.showWarning('No tiene permisos para crear empresas.');
    return;
  }
  empresaToEdit.value = null;
  dialogCreate.value = true;
}

function openEditDialog(empresa: any) {
  if (!canManage.value) {
    uiStore.showWarning('No tiene permisos para editar empresas.');
    return;
  }
  empresaToEdit.value = { ...empresa };
  dialogEdit.value = true;
}

function handleCreateSuccess() {
  dialogCreate.value = false;
  uiStore.showSuccess('Empresa creada correctamente.');
}

function handleEditSuccess() {
  dialogEdit.value = false;
  uiStore.showSuccess('Empresa actualizada correctamente.');
}

async function handleDeleteEmpresa(empresa: any) {
  if (!canManage.value) {
    uiStore.showWarning('No tiene permisos para eliminar empresas.');
    return;
  }
  try {
    await empresaStore.eliminarEmpresaAction(empresa.id);
    uiStore.showSuccess('Empresa eliminada correctamente.');
  } catch {
    uiStore.showError(empresaStore.error || 'No se pudo eliminar la empresa.');
  }
}
</script>

<style scoped>
.transition-colors {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.tracking-tight { letter-spacing: -0.025em; }

/* Efecto suave para las tarjetas */
.stats-card {
  transition: all 0.3s ease;
  border: 1px solid rgba(var(--v-border-color), 0.15) !important;
}

.stats-card:hover {
  transform: translateY(-4px);
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1) !important;
}

/* Buscador Adaptable */
.search-input {
  outline: none;
  width: 100%;
  padding: 8px 0;
  background: transparent;
}

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

.search-input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.bg-header-subtle {
  background-color: rgba(var(--v-theme-on-surface), 0.03) !important;
}

.bg-background-alt {
  background-color: rgba(var(--v-theme-on-surface), 0.02) !important;
}

.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

/* Animaciones */
.btn-hover-scale { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.btn-hover-scale:hover { transform: scale(1.02); }

.shadow-primary {
  box-shadow: 0 4px 14px 0 rgba(var(--v-theme-primary), 0.3) !important;
}
</style>
