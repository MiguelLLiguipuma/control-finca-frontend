<template>
  <v-container class="pa-4 pt-6 pb-16 bg-background min-h-screen transition-colors">
    <v-row justify="center">
      <v-col cols="12" lg="10">
        
        <div class="mb-8 d-flex align-center justify-space-between flex-wrap gap-4">
          <div>
            <h1 class="text-h4 font-weight-black text-high-emphasis tracking-tight">Planificación de Enfunde</h1>
            <p class="text-medium-emphasis font-weight-medium">Creación de Calendario Operativo</p>
          </div>
          
          <v-chip 
            :color="store.estaCompleto ? 'success' : 'warning'" 
            variant="tonal" 
            class="font-weight-bold" 
            :prepend-icon="store.estaCompleto ? 'mdi-database-check' : 'mdi-database-edit'"
          >
            {{ store.estaCompleto ? 'Listo para Crear' : 'Datos Incompletos' }}
          </v-chip>
        </div>

        <v-row class="mb-8">
          
          <v-col cols="12" md="4">
            <v-card border variant="flat" class="pa-4 rounded-xl bg-surface h-100">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" rounded="lg" size="48">
                  <v-icon>mdi-domain</v-icon>
                </v-avatar>
                <div class="ml-4 flex-grow-1">
                  <label class="custom-label mb-1">Empresa</label>
                  <v-select
                    v-model="store.empresaSeleccionada"
                    :items="listaEmpresas" 
                    item-title="nombre" 
                    item-value="id"
                    placeholder="Seleccionar..."
                    variant="plain"
                    hide-details
                    density="compact"
                    class="font-weight-black text-h6 mt-n2 ml-n1 custom-select-text"
                    :loading="loadingEmpresas"
                    no-data-text="No hay empresas disponibles"
                  ></v-select>
                </div>
              </div>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-4 rounded-xl bg-surface h-100">
              <div class="d-flex align-center">
                <v-avatar color="secondary" variant="tonal" rounded="lg" size="48">
                  <v-icon>mdi-calendar-clock</v-icon>
                </v-avatar>
                <div class="ml-4 flex-grow-1">
                  <label class="custom-label mb-1">Año Fiscal</label>
                  <v-select
                    :model-value="store.anioSeleccionado"
                    @update:model-value="store.setAnio"
                    :items="[2024, 2025, 2026, 2027, 2028]"
                    variant="plain"
                    hide-details
                    density="compact"
                    class="font-weight-black text-h5 mt-n2 ml-n1 custom-select-text"
                  ></v-select>
                </div>
              </div>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-4 rounded-xl bg-surface h-100">
              <div class="d-flex align-center">
                <v-avatar color="success" variant="tonal" rounded="lg" size="48">
                  <v-icon>mdi-lock-open-variant</v-icon>
                </v-avatar>
                <div class="ml-4">
                  <span class="text-caption font-weight-bold text-disabled uppercase tracking-widest">
                    Estado Inicial
                  </span>
                  <div class="text-h6 font-weight-black text-success">
                    ABIERTO ('A')
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-card border variant="flat" class="rounded-xl bg-surface shadow-sm mb-12">
          
          <v-overlay
             :model-value="!store.empresaSeleccionada"
             contained
             class="align-center justify-center rounded-xl"
             scrim="background"
             opacity="0.8"
             persistent
          >
            <div class="text-center">
              <v-icon size="64" color="medium-emphasis" class="mb-4">mdi-domain-off</v-icon>
              <div class="text-h6 font-weight-bold text-medium-emphasis">Selecciona una empresa<br>para configurar sus cintas</div>
            </div>
          </v-overlay>

          <div class="pa-8 pa-md-12">
            
            <div class="d-flex align-center mb-8">
              <div class="section-badge mr-4">1</div>
              <div>
                <h3 class="text-h5 font-weight-black text-high-emphasis">Secuencia de Cintas</h3>
                <p class="text-caption text-medium-emphasis">Define el patrón de colores usando tu catálogo de DB</p>
              </div>
            </div>

            <v-sheet 
              border 
              rounded="lg" 
              class="pa-4 mb-6 d-flex flex-wrap gap-2 align-center custom-input-area"
              min-height="64"
            >
              <span v-if="store.secuencia.length === 0" class="text-body-2 text-disabled mx-auto font-weight-medium">
                <v-icon start size="small" class="mr-1">mdi-gesture-tap</v-icon>
                Selecciona colores abajo para crear el ciclo...
              </span>
              
              <v-chip
                v-for="(cinta, index) in store.secuencia"
                :key="index"
                :color="cinta.color_hex" 
                closable
                variant="flat"
                class="font-weight-black text-white elevation-2"
                @click:close="store.removerCintaSecuencia(index)"
                style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);"
              >
                {{ cinta.color }}
              </v-chip>
            </v-sheet>

            <label class="custom-label text-center mb-4">Catálogo Disponible</label>
            
            <div v-if="store.loadingCintas" class="d-flex justify-center mb-10">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </div>

            <div v-else class="d-flex flex-wrap gap-3 justify-center mb-10">
              <v-btn
                v-for="cinta in store.catalogoCintas"
                :key="cinta.id" 
                icon
                size="large"
                :color="cinta.color_hex"
                class="elevation-2 border-white transition-transform"
                @click="store.agregarCintaSecuencia(cinta)"
                v-tooltip:bottom="cinta.color"
              >
                <v-icon color="white" v-if="store.secuencia.some(s => s.id === cinta.id)" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                  mdi-check-bold
                </v-icon>
              </v-btn>
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-btn
                  block
                  size="large"
                  variant="tonal"
                  color="error"
                  class="rounded-lg font-weight-bold"
                  prepend-icon="mdi-delete-sweep"
                  @click="store.limpiarTodo"
                  :disabled="store.secuencia.length === 0"
                >
                  Limpiar Todo
                </v-btn>
              </v-col>
              <v-col cols="12" md="6">
                <v-btn
                  block
                  size="large"
                  color="primary"
                  class="rounded-lg font-weight-black shadow-primary"
                  prepend-icon="mdi-refresh"
                  @click="store.generarAutomatico"
                  :disabled="store.secuencia.length === 0"
                >
                  Generar Calendario
                </v-btn>
              </v-col>
            </v-row>
          </div>
        </v-card>

        <div class="mt-8" v-if="store.totalSemanas > 0">
           
           <div class="d-flex align-center mb-6 justify-space-between">
              <div class="d-flex align-center">
                <div class="section-badge mr-4">2</div>
                <h3 class="text-h5 font-weight-black text-high-emphasis">Vista Previa {{ store.anioSeleccionado }}</h3>
              </div>
              <v-chip size="small" variant="tonal" :color="store.esAnioLargo ? 'orange' : 'grey'">
                 {{ store.totalSemanas }} Semanas ISO
              </v-chip>
           </div>

           <v-fade-transition>
            <v-row dense>
              <v-col 
                v-for="semana in store.calendarioGenerado" 
                :key="semana.numero"
                cols="6" sm="4" md="3" lg="2"
              >
                <v-hover v-slot="{ isHovering, props }">
                  <v-card
                    v-bind="props"
                    border
                    flat
                    class="d-flex flex-column align-center justify-center py-4 rounded-xl cursor-pointer transition-all position-relative overflow-hidden bg-surface"
                    :class="[isHovering ? 'elevation-4 transform-up' : '', !semana.cinta ? 'border-dashed' : '']"
                    height="120"
                    @click="abrirDialogoEdicion(semana)"
                  >
                    <div v-if="semana.cinta" class="position-absolute w-100 h-100 top-0 left-0" :style="`background: linear-gradient(135deg, ${semana.cinta.color_hex}15 0%, transparent 100%); border-bottom: 4px solid ${semana.cinta.color_hex}`"></div>
                    
                    <div class="text-h4 font-weight-black z-10 text-high-emphasis">{{ semana.numero }}</div>
                    
                    <v-chip 
                      v-if="semana.cinta" 
                      size="x-small" 
                      variant="flat" 
                      :color="semana.cinta.color_hex" 
                      class="mt-2 font-weight-bold text-white z-10 px-3" 
                      style="text-shadow: 0 1px 2px rgba(0,0,0,0.3);"
                    >
                      {{ semana.cinta.color }}
                    </v-chip>
                    
                    <span v-else class="text-caption text-disabled mt-2 font-weight-bold">VACÍO</span>
                    
                    <div class="position-absolute top-0 right-0 ma-3 z-10">
                      <span class="text-[10px] font-weight-black text-medium-emphasis opacity-60">
                        {{ obtenerMesUI(semana.numero) }}
                      </span>
                    </div>

                    <v-overlay :model-value="isHovering" contained class="align-center justify-center" scrim="black" opacity="0.1">
                      <v-avatar color="surface" size="40" class="elevation-2">
                        <v-icon color="primary">mdi-pencil</v-icon>
                      </v-avatar>
                    </v-overlay>
                  </v-card>
                </v-hover>
              </v-col>
            </v-row>
          </v-fade-transition>
        </div>

        <div class="d-flex justify-end mt-12 mb-8">
          <v-btn
            size="x-large"
            color="success"
            class="rounded-xl px-12 font-weight-black shadow-primary"
            :loading="store.loading"
            :disabled="!store.estaCompleto"
            @click="handleGuardar"
            elevation="0"
            height="64"
          >
            CONFIRMAR Y GUARDAR
            <v-icon end>mdi-database-plus</v-icon>
          </v-btn>
        </div>

      </v-col>
    </v-row>

    <v-dialog v-model="uiState.dialogoAbierto" max-width="400">
      <v-card class="bg-surface rounded-xl pa-4" elevation="10">
        <v-card-title class="text-center pt-2 pb-4">
          <div class="text-overline text-medium-emphasis line-height-1">MODIFICAR SEMANA</div>
          <div class="text-h5 font-weight-black">Semana {{ uiState.semanaEditando?.numero }}</div>
        </v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap gap-3 justify-center">
             <v-btn 
               v-for="cinta in store.catalogoCintas" 
               :key="cinta.id" 
               icon="mdi-format-paint" 
               size="x-large" 
               :color="cinta.color_hex" 
               class="border-white elevation-2" 
               @click="seleccionarCintaManual(cinta)"
               v-tooltip:bottom="cinta.color"
             >
                <v-icon color="white" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);">mdi-check</v-icon>
              </v-btn>
              
              <v-btn icon="mdi-close" size="x-large" variant="outlined" color="medium-emphasis" @click="seleccionarCintaManual(null)"></v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="store.snackbar.show"
      :color="store.snackbar.color"
      rounded="lg"
      elevation="12"
      timeout="3000"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2" color="white">{{ store.snackbar.icon }}</v-icon>
        <span class="font-weight-bold text-white">{{ store.snackbar.message }}</span>
      </div>
      <template v-slot:actions>
        <v-btn
          color="white"
          variant="text"
          icon="mdi-close"
          @click="store.snackbar.show = false"
        ></v-btn>
        <v-divider class="my-12 border-dashed" />

<div class="mt-8">
  <div class="d-flex align-center mb-6">
    <v-avatar color="primary" size="32" variant="tonal" class="mr-3">
      <v-icon size="18">mdi-table-clock</v-icon>
    </v-avatar>
    <h2 class="text-h5 font-weight-black text-high-emphasis">Planificaciones Registradas</h2>
    <v-spacer />
    <v-btn 
      variant="tonal" 
      color="primary" 
      prepend-icon="mdi-refresh" 
      size="small" 
      class="rounded-lg font-weight-bold"
      @click="store.obtenerResumen"
      :loading="store.loading"
    >
      Actualizar
    </v-btn>
  </div>

  <v-card border variant="flat" class="rounded-xl bg-surface overflow-hidden">
    <v-table hover density="comfortable">
      <thead>
        <tr class="bg-surface-light">
          <th class="text-overline font-weight-black pl-6">Empresa</th>
          <th class="text-overline font-weight-black text-center">Año</th>
          <th class="text-overline font-weight-black">Secuencia Crónica de Cintas</th>
          <th class="text-overline font-weight-black text-center">Semanas</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cal in store.resumenCalendarios" :key="cal.empresa + cal.anio">
          <td class="pl-6">
            <div class="font-weight-bold text-primary">{{ cal.empresa }}</div>
          </td>
          <td class="text-center">
            <v-chip size="small" variant="flat" color="secondary" class="font-weight-black">
              {{ cal.anio }}
            </v-chip>
          </td>
          <td>
            <div class="d-flex align-center py-2 flex-wrap gap-1">
              <template v-for="(hex, index) in cal.secuencia_hex.split(',').slice(0, 15)" :key="index">
                <v-tooltip location="top">
                  <template v-slot:activator="{ props }">
                    <div 
                      v-bind="props"
                      class="color-dot shadow-sm"
                      :style="{ backgroundColor: hex }"
                    ></div>
                  </template>
                  <span>Semana {{ index + 1 }}</span>
                </v-tooltip>
              </template>
              <span v-if="cal.total_semanas > 15" class="text-caption text-disabled ml-1">
                +{{ cal.total_semanas - 15 }} más
              </span>
            </div>
          </td>
          <td class="text-center font-weight-medium text-medium-emphasis">
            {{ cal.total_semanas }}
          </td>
        </tr>
        
        <tr v-if="store.resumenCalendarios.length === 0">
          <td colspan="4" class="text-center py-10">
            <v-icon size="48" color="disabled" class="mb-2">mdi-calendar-blank</v-icon>
            <div class="text-disabled font-weight-medium">No hay calendarios configurados.</div>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</div>
      </template>
    </v-snackbar>

  </v-container>
</template>

<script setup>
import { reactive, onMounted } from 'vue';
import { useCalendarioStore } from '@/stores/calendarioStore';
import { useEmpresaStore } from '@/stores/empresaStore';
import { storeToRefs } from 'pinia';

const store = useCalendarioStore();
const empresaStore = useEmpresaStore();

// Usamos storeToRefs para que la lista de empresas sea reactiva
const { empresas: listaEmpresas, loading: loadingEmpresas } = storeToRefs(empresaStore);

const uiState = reactive({
  dialogoAbierto: false,
  semanaEditando: null
});

onMounted(async () => {
  // Carga paralela de datos necesarios
  await Promise.all([
    store.inicializarCalendario(),
    store.cargarCintas(),
    empresaStore.fetchEmpresas(),
    store.obtenerResumen() 
  ]);
});

// --- UI HANDLERS ---

const abrirDialogoEdicion = (semana) => {
  uiState.semanaEditando = semana;
  uiState.dialogoAbierto = true;
};

const seleccionarCintaManual = (cinta) => {
  if (uiState.semanaEditando) {
    store.asignarCintaSemana(uiState.semanaEditando.numero, cinta);
  }
  uiState.dialogoAbierto = false;
};

const handleGuardar = async () => {
  // Ahora solo llamamos al store, que se encarga de la lógica, notificación y limpieza
  await store.guardarCalendario();
};

// Helper para mostrar mes aproximado
const obtenerMesUI = (semana) => {
  const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
  const mesIndex = Math.floor((semana - 1) / 4.34812); 
  return meses[Math.min(mesIndex, 11)];
};
</script>

<style scoped>
/* ESTILOS PROFESIONALES (Vuetify Enhanced) */
.transition-colors { transition: background-color 0.3s ease, color 0.3s ease; }
.section-badge { background: rgb(var(--v-theme-primary)); color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px; font-weight: 800; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(var(--v-theme-primary), 0.3); }
.custom-label { display: block; font-size: 0.75rem; font-weight: 800; margin-bottom: 6px; color: rgba(var(--v-theme-on-surface), 0.6); text-transform: uppercase; letter-spacing: 0.5px; }
.custom-input-area { background-color: rgba(var(--v-theme-on-surface), 0.03) !important; border-color: rgba(var(--v-border-color), 0.15) !important; }
.custom-select-text :deep(.v-field__input) { font-size: 1.25rem !important; font-weight: 700 !important; color: rgb(var(--v-theme-primary)) !important; padding-top: 0; min-height: 0; }
.shadow-primary { box-shadow: 0 10px 20px -5px rgba(var(--v-theme-primary), 0.4) !important; transition: transform 0.2s ease; }
.shadow-primary:hover { transform: translateY(-2px); }
.border-dashed { border-style: dashed !important; opacity: 0.6; }
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
.transform-up { transform: translateY(-4px); }
.z-10 { z-index: 10; }
.transition-all { transition: all 0.2s ease-in-out; }
/* Burbujas de color en la tabla */
.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(var(--v-border-color), 0.2);
  transition: transform 0.2s ease;
}

.color-dot:hover {
  transform: scale(1.4);
  z-index: 2;
  cursor: pointer;
}

.gap-1 {
  gap: 4px;
}

.bg-surface-light {
  background-color: rgba(var(--v-theme-on-surface), 0.02) !important;
}
</style>