<template>
  <v-container fluid class="bg-background fill-height align-start pa-0 pa-md-4">
    
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-row justify="center" no-gutters>
      <v-col cols="12" lg="11">

        <v-card class="mb-6" elevation="3" rounded="xl" color="surface">
          <v-card-text class="d-flex align-center py-4 flex-wrap">
            <v-avatar color="primary" class="me-4" variant="tonal" size="56">
              <v-icon size="32">mdi-tablet-dashboard</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <h1 class="text-h4 font-weight-black mb-0 text-high-emphasis">
                Control de Campo · Sem {{ cosechaStore.semanaActual }}
              </h1>
              <div class="d-flex align-center text-primary font-weight-bold mt-2">
                <v-icon size="20" class="me-2">mdi-calendar-check</v-icon>
                <span class="text-body-1">Corte sugerido: {{ cosechaStore.rangoCorteSugerido?.join(', ') }} semanas</span>
              </div>
            </div>

            <div class="text-right d-none d-sm-block">
              <div class="text-h2 font-weight-black text-primary line-height-1">
                {{ cosechaStore.totalDigitado }}
              </div>
              <div class="text-body-2 font-weight-bold text-medium-emphasis">
                RACIMOS DIGITADOS
              </div>
              <v-chip class="mt-2 font-weight-bold" size="default" label :color="cosechaStore.estadoColor">
                {{ cosechaStore.estadoOperacion }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <v-row>
          <v-col cols="12" md="4" lg="3">
            <v-card class="rounded-xl elevation-10 pa-5 sticky-control" color="surface">
              <div class="text-subtitle-2 font-weight-bold text-medium-emphasis mb-5 ml-1">
                CONFIGURACIÓN DE REPORTE
              </div>

              <div class="mb-5">
                <label class="custom-label mb-2">UBICACIÓN ACTIVA</label>
                <v-select
                  v-model="fincaSeleccionada"
                  :items="fincas"
                  item-title="nombre"
                  item-value="id"
                  variant="outlined"
                  hide-details
                  class="super-select"
                  menu-icon="mdi-chevron-down"
                  :disabled="cosechaStore.loading"
                  @update:model-value="cargarSaldos"
                >
                  <template v-slot:selection="{ item }">
                    <div class="d-flex align-center py-2 overflow-hidden">
                      <v-avatar color="success" variant="tonal" rounded="lg" size="44" class="mr-3">
                        <v-icon size="28">mdi-tree</v-icon>
                      </v-avatar>
                      <div class="d-flex flex-column text-truncate">
                        <span class="text-h6 font-weight-black text-truncate text-high-emphasis" style="line-height: 1.2;">
                          {{ item.title }}
                        </span>
                        <span class="text-body-2 font-weight-bold text-medium-emphasis">
                          Sector Principal
                        </span>
                      </div>
                    </div>
                  </template>
                </v-select>
              </div>

              <div class="mb-6">
                <label class="custom-label mb-2">FECHA DE CORTE</label>
                <v-menu v-model="menuFecha" :close-on-content-click="false" location="bottom center">
                  <template v-slot:activator="{ props }">
                    <v-card 
                      v-bind="props" 
                      variant="outlined" 
                      class="d-flex align-center pa-3 rounded-xl cursor-pointer hover-effect border-input"
                      flat
                      color="surface"
                      :disabled="cosechaStore.loading"
                    >
                      <v-avatar color="info" variant="tonal" rounded="lg" size="44" class="mr-3">
                        <v-icon size="28">mdi-calendar-range</v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-h6 font-weight-black text-high-emphasis" style="line-height: 1;">
                          {{ fechaFormateada }}
                        </div>
                        <div class="text-body-2 font-weight-bold text-medium-emphasis mt-1">
                          {{ infoDiaSemana }}
                        </div>
                      </div>
                      <v-spacer></v-spacer>
                      <v-icon color="medium-emphasis" size="24">mdi-pencil</v-icon>
                    </v-card>
                  </template>
                  
                  <v-date-picker 
                    v-model="fechaObjetoPicker" 
                    color="primary"
                    :min="fechaMinima"
                    :max="fechaMaxima"
                    @update:model-value="menuFecha = false"
                  ></v-date-picker>
                </v-menu>
              </div>

              <v-divider class="mb-6 border-dashed" />

              <v-btn
                block
                size="x-large"
                color="primary"
                class="rounded-xl py-7 font-weight-black elevation-6 button-glow mb-4 text-h6"
                height="72"
                :loading="cosechaStore.loading"
                :disabled="cosechaStore.loading || cosechaStore.totalDigitado === 0 || !fincaSeleccionada"
                @click="guardarCosecha"
              >
                <v-icon start size="32">mdi-cloud-upload</v-icon>
                ENVIAR REPORTE
              </v-btn>

              <div class="text-center">
                <v-chip size="default" variant="text" class="font-weight-bold text-medium-emphasis">
                  <v-icon start size="small" color="success">mdi-circle-medium</v-icon>
                  RESTAN EN CAMPO: <strong class="ml-1 text-high-emphasis text-h5">{{ cosechaStore.totalRestante }}</strong>
                </v-chip>
              </div>

            </v-card>
          </v-col>

          <v-col cols="12" md="8" lg="9">
            
            <div v-if="cosechaStore.loading" class="text-center pa-12">
              <v-progress-circular indeterminate size="80" width="8" color="primary" />
              <div class="mt-4 text-h6 font-weight-bold text-medium-emphasis">Sincronizando datos de campo...</div>
            </div>

            <v-row v-else dense>
              
              <template v-for="anio in sortedYears" :key="anio">
                
                <v-col cols="12" class="mt-6 mb-2">
                  <div class="d-flex align-center">
                    <v-chip 
                        :color="Number(anio) < cosechaStore.anioActual ? 'warning' : 'secondary'" 
                        size="x-large" 
                        variant="flat" 
                        class="font-weight-black mr-4 elevation-2 rounded-lg"
                    >
                      <v-icon start size="large">{{ Number(anio) < cosechaStore.anioActual ? 'mdi-history' : 'mdi-calendar-today' }}</v-icon> 
                      AÑO {{ anio }}
                    </v-chip>
                    <v-divider class="border-opacity-50"></v-divider>
                  </div>
                </v-col>

                <v-col v-for="item in cosechaStore.saldosPorAnio[anio]" :key="item.calendario_id" cols="12">
                  <v-card
                    rounded="xl"
                    class="mb-3 border-s-xl elevation-2"
                    :style="{ borderLeftColor: item.color_hex + ' !important', borderLeftWidth: '8px !important' }"
                    :color="obtenerColorTarjeta(item)"
                    :variant="obtenerVarianteTarjeta(item)"
                  >
                    <v-card-text class="pa-4">
                      
                      <div class="mb-3" v-if="cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio) || cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)">
                          <v-chip
                          v-if="cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)"
                          color="error"
                          size="small"
                          class="font-weight-black mr-2"
                          >
                          <v-icon start size="small">mdi-alert-circle</v-icon> CORTE DE ESTA SEMANA
                          </v-chip>
                          
                          <v-chip
                          v-else-if="cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)"
                          color="warning"
                          size="small"
                          class="font-weight-black"
                          >
                          <v-icon start size="small">mdi-basket</v-icon> LISTA PARA CORTE
                          </v-chip>
                      </div>

                      <v-row align="center">
                        <v-col cols="12" sm="4">
                          <div class="d-flex align-center">
                            <v-avatar :color="item.color_hex" size="64" class="me-4 elevation-3">
                              <span class="text-white text-h4 font-weight-black shadow-text">
                                {{ item.semana_enfunde }}
                              </span>
                            </v-avatar>
                            <div>
                              <div class="text-h5 font-weight-black text-truncate text-high-emphasis">
                                {{ item.color_cinta }}
                              </div>
                              <div class="d-flex align-center gap-2 mt-1">
                                <v-chip size="small" variant="outlined" class="font-weight-bold">
                                    <span class="text-body-2 font-weight-bold">EDAD: {{ cosechaStore.calcularEdadExacta(item.semana_enfunde, item.anio) }} sem</span>
                                </v-chip>
                                <span class="text-caption text-disabled">({{ item.anio }})</span>
                              </div>
                            </div>
                          </div>
                        </v-col>

                        <v-col cols="12" sm="3" class="text-center">
                          <div class="text-body-2 font-weight-bold text-medium-emphasis mb-2">
                            DISPONIBLE: <span class="text-high-emphasis text-h6">{{ item.saldo_en_campo }}</span>
                          </div>
                          <v-progress-linear
                            v-if="item.cantidad_a_cosechar || item.rechazo"
                            height="16"
                            rounded
                            striped
                            :model-value="cosechaStore.calcularPorcentaje(item)"
                            :color="cosechaStore.esExcedido(item) ? 'error' : 'success'"
                          >
                          </v-progress-linear>
                        </v-col>

                        <v-col cols="12" sm="5">
                          <div class="d-flex justify-end flex-wrap gap-4">
                            
                            <div class="text-center">
                              <div class="d-flex justify-space-between align-center px-1 mb-1">
                                <div class="text-caption font-weight-black text-primary tracking-wider">BUENOS</div>
                                <v-btn 
                                  size="x-small" variant="text" color="primary" class="px-0 py-0" 
                                  style="height: 14px; min-width: 0;"
                                  @click="item.cantidad_a_cosechar = item.saldo_en_campo - (item.rechazo || 0)"
                                >MAX</v-btn>
                              </div>
                              <v-sheet 
                                  class="d-flex align-center rounded-lg px-1 input-container" 
                                  border
                                  color="surface"
                              >
                                <v-btn
                                  icon="mdi-minus"
                                  size="small"
                                  variant="text"
                                  :disabled="cosechaStore.loading || item.cantidad_a_cosechar <= 0"
                                  @click="item.cantidad_a_cosechar--"
                                />
                                
                                <input
                                  v-select-all
                                  type="number"
                                  class="touch-input text-h5 text-high-emphasis"
                                  v-model.number="item.cantidad_a_cosechar"
                                  :disabled="cosechaStore.loading"
                                />
                                
                                <v-btn
                                  icon="mdi-plus"
                                  size="small"
                                  variant="text"
                                  color="primary"
                                  :disabled="cosechaStore.loading || cosechaStore.esExcedido(item)"
                                  @click="item.cantidad_a_cosechar++"
                                />
                              </v-sheet>
                            </div>

                            <div class="text-center">
                              <div class="text-caption font-weight-black text-error mb-1 tracking-wider">RECHAZO</div>
                              <v-sheet 
                                  class="d-flex align-center rounded-lg px-1 input-container" 
                                  color="surface" 
                                  style="border: 1px solid rgb(var(--v-theme-error)) !important;"
                              >
                                <v-btn
                                  icon="mdi-minus"
                                  size="small"
                                  variant="text"
                                  color="error"
                                  :disabled="cosechaStore.loading || item.rechazo <= 0"
                                  @click="item.rechazo--"
                                />
                                
                                <input
                                  v-select-all
                                  type="number"
                                  class="touch-input text-h5 text-error"
                                  v-model.number="item.rechazo"
                                  :disabled="cosechaStore.loading"
                                />
                                
                                <v-btn
                                  icon="mdi-plus"
                                  size="small"
                                  variant="text"
                                  color="error"
                                  :disabled="cosechaStore.loading || cosechaStore.esExcedido(item)"
                                  @click="item.rechazo++"
                                />
                              </v-sheet>
                            </div>

                          </div>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
              </template> 

              <v-col v-if="cosechaStore.saldosPendientes.length === 0" cols="12">
                <v-sheet rounded="xl" class="pa-12 text-center bg-transparent border-dashed">
                  <v-icon size="96" color="medium-emphasis" class="mb-4">mdi-basket-off-outline</v-icon>
                  <div class="text-h4 font-weight-bold text-medium-emphasis">No hay saldos disponibles</div>
                  <div class="text-body-1 text-disabled mt-2">Seleccione una finca o cambie la fecha</div>
                </v-sheet>
              </v-col>

            </v-row>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useCosechaStore, type CintaCosecha } from '../../stores/cosecha/cosechaStore';
import { useFincaStore } from '../../stores/fincaStore';
import { useEmpresaStore } from '../../stores/empresaStore';
import { storeToRefs } from 'pinia';

const cosechaStore = useCosechaStore();
const fincaStore = useFincaStore();
const empresaStore = useEmpresaStore();
const { fincas } = storeToRefs(fincaStore);

const fincaSeleccionada = ref<number | null>(fincaStore.fincaSeleccionadaId);
const fechaCosecha = ref(new Date().toISOString().split('T')[0]);
const fechaObjetoPicker = ref(new Date());
const menuFecha = ref(false);
const snackbar = ref({ show: false, message: '', color: 'info' });

const notify = (msg: string, color = 'info') => (snackbar.value = { show: true, message: msg, color });

// === DIRECTIVA PERSONALIZADA: v-select-all ===
// Esto elimina la necesidad de funciones engorrosas.
// Automáticamente selecciona el texto cuando el input recibe foco.
const vSelectAll = {
  mounted: (el: HTMLElement) => {
    el.addEventListener('focus', (e) => {
      // TypeScript sabe que e.target es un elemento del DOM, casteamos seguro aquí adentro
      (e.target as HTMLInputElement).select();
    });
  }
};

const sortedYears = computed(() => {
    if(!cosechaStore.saldosPorAnio) return [];
    return Object.keys(cosechaStore.saldosPorAnio).sort((a, b) => Number(a) - Number(b));
});

watch(fechaObjetoPicker, (newDate) => {
  if (newDate) {
    const offset = newDate.getTimezoneOffset();
    const dateLocal = new Date(newDate.getTime() - (offset*60*1000));
    fechaCosecha.value = dateLocal.toISOString().split('T')[0];
  }
});

const fechaFormateada = computed(() => {
  if (!fechaObjetoPicker.value) return 'Seleccionar Fecha';
  return fechaObjetoPicker.value.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
});

const infoDiaSemana = computed(() => {
    if (!fechaObjetoPicker.value) return '';
    const dia = fechaObjetoPicker.value.toLocaleDateString('es-ES', { weekday: 'long' });
    return `${dia.charAt(0).toUpperCase() + dia.slice(1)} · Semana ${cosechaStore.semanaActual}`;
});

const fechaMaxima = computed(() => new Date());
const fechaMinima = computed(() => {
  const f = new Date();
  f.setFullYear(f.getFullYear() - 1);
  return f;
});

const obtenerColorTarjeta = (item: CintaCosecha) => {
    if (cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)) return 'error'; 
    if (cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)) return 'warning';
    return 'surface';
};

const obtenerVarianteTarjeta = (item: CintaCosecha) => {
    if (cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)) return 'tonal';
    if (cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)) return 'tonal';
    return 'elevated';
};

const cargarSaldos = async (id: number) => {
  if (!id || cosechaStore.loading) return;
  fincaStore.seleccionarFinca(id);
  await cosechaStore.cargarSaldos(id);
};

const guardarCosecha = async () => {
  if (cosechaStore.loading) return;
  if (!fincaSeleccionada.value) return notify('Seleccione una finca', 'error');
  if (cosechaStore.totalDigitado === 0) return notify('Ingrese al menos un racimo', 'info');

  const ok = await cosechaStore.enviarCosecha(fincaSeleccionada.value, fechaCosecha.value, 1);
  if (ok) {
    notify('Reporte enviado correctamente', 'success');
  }
};

onMounted(async () => {
  try {
    if (!empresaStore.empresas.length) await empresaStore.fetchEmpresas();
    await fincaStore.obtenerFincas();
    if (fincaSeleccionada.value) await cargarSaldos(fincaSeleccionada.value);
  } catch {
    notify('Error inicializando datos', 'error');
  }
});
</script>

<style scoped>
/* AUMENTADO: Ancho de inputs para acomodar fuente más grande */
.touch-input {
  width: 60px; /* Antes 50px */
  text-align: center;
  border: none;
  font-weight: 900;
  background: transparent;
  outline: none;
}
.touch-input::-webkit-outer-spin-button,
.touch-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* AUMENTADO: Tamaño de letra de etiquetas */
.custom-label {
  display: block;
  font-size: 0.8rem; /* Antes 0.7rem */
  font-weight: 800;
  letter-spacing: 1px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  text-transform: uppercase;
  margin-left: 4px;
}

/* Selectores y Contenedores */
.super-select :deep(.v-field__outline) { --v-field-border-opacity: 0.15; }
.super-select :deep(.v-field--focused .v-field__outline) { --v-field-border-opacity: 1; color: rgb(var(--v-theme-primary)); }
.super-select :deep(.v-field) { border-radius: 12px !important; padding-top: 8px; padding-bottom: 8px; }

.hover-effect:hover { border-color: rgb(var(--v-theme-primary)); background-color: rgba(var(--v-theme-on-surface), 0.05); }
.button-glow { box-shadow: 0 10px 25px -5px rgba(var(--v-theme-primary), 0.5) !important; }
.shadow-text { text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
.line-height-1 { line-height: 1; }
.sticky-control { position: sticky; top: 20px; z-index: 5; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }

/* AUMENTADO: Altura de inputs para mayor comodidad táctil */
.input-container {
    height: 48px; /* Antes 40px */
    border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}
.border-dashed { border-style: dashed !important; opacity: 0.4; }
</style>