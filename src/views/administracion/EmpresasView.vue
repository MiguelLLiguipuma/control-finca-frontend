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
        </v-row>

        <v-card border variant="flat" class="rounded-xl overflow-hidden bg-surface shadow-sm">
          <div class="d-flex align-center px-6 py-4 bg-header-subtle border-b">
            <v-icon color="medium-emphasis" class="mr-3">mdi-magnify</v-icon>
            <input 
              type="text" 
              placeholder="Buscar por nombre, RUC o representante..." 
              class="search-input text-body-1 text-high-emphasis"
            />
            <v-spacer />
            <v-btn 
              variant="tonal" 
              color="medium-emphasis" 
              icon="mdi-refresh" 
              size="small"
              @click="empresaStore.fetchEmpresas()"
              :loading="empresaStore.loading"
            />
          </div>

          <div class="pa-0">
            <EmpresaList
              :empresas="empresaStore.empresas"
              :loading="empresaStore.loading"
              :error="empresaStore.error"
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
          <v-btn icon="mdi-close" variant="text" size="small" @click="dialogCreate = false" />
        </div>
        
        <v-card-text class="pa-6 bg-background-alt">
          <EmpresaForm mode="create" @submit-success="handleCreateSuccess" @cancel="dialogCreate = false" />
        </v-card-text>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { useEmpresaStore } from '@/stores/empresaStore';
import EmpresaList from '@/components/empresa/empresaList.vue';
import EmpresaForm from '@/components/empresa/empresaForm.vue';

const empresaStore = useEmpresaStore();
const dialogCreate = ref(false);
const dialogEdit = ref(false);
const empresaToEdit = ref(null);

onMounted(() => { empresaStore.fetchEmpresas(); });

// Handlers se mantienen igual
function openCreateDialog() { empresaToEdit.value = null; dialogCreate.value = true; }
function openEditDialog(empresa) { empresaToEdit.value = { ...empresa }; dialogEdit.value = true; }
const handleCreateSuccess = () => dialogCreate.value = false;
async function handleDeleteEmpresa(empresa) { await empresaStore.eliminarEmpresaAction(empresa.id); }
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