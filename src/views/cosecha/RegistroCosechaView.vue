Aquí tienes el código completo. He integrado tu lógica original (que funciona perfectamente) con el **nuevo diseño visual** para el panel lateral (izquierda) que solicitaste, mejorando la tipografía, los inputs y la experiencia de usuario.

He añadido la lógica necesaria para formatear la fecha visualmente (ej: "Lunes, Semana 4") mientras se mantiene el formato técnico para el backend (`YYYY-MM-DD`).

```vue
<template>
  <v-container fluid class="bg-grey-lighten-4 fill-height align-start pa-0 pa-md-4">
    
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-row justify="center" no-gutters>
      <v-col cols="12" lg="11">

        <v-card class="mb-6" elevation="3" rounded="xl" color="grey-darken-4" theme="dark">
          <v-card-text class="d-flex align-center py-4 flex-wrap">
            <v-avatar color="primary" class="me-4" size="48">
              <v-icon size="28" color="white">mdi-tablet-dashboard</v-icon>
            </v-avatar>
            
            <div class="flex-grow-1">
              <h1 class="text-h5 font-weight-black mb-0">
                Control de Campo · Sem {{ semanaActualSistema }}
              </h1>
              <div class="d-flex align-center text-primary font-weight-bold mt-1">
                <v-icon size="16" class="me-2">mdi-calendar-check</v-icon>
                <span>Corte sugerido: {{ sugerenciaCorte.join(', ') }}</span>
              </div>
            </div>

            <div class="text-right d-none d-sm-block">
              <div class="text-h3 font-weight-black text-primary line-height-1">
                {{ totalDigitado }}
              </div>
              <div class="text-caption font-weight-bold text-medium-emphasis">
                RACIMOS DIGITADOS
              </div>
              <v-chip class="mt-1 font-weight-bold" size="small" label :color="estadoColor">
                {{ estadoOperacion }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <v-row>
          <v-col cols="12" md="4" lg="3">
            <v-card class="rounded-xl elevation-10 pa-4 sticky-control bg-white">
              
              <div class="text-overline font-weight-bold text-grey mb-4 ml-1">
                CONFIGURACIÓN DE REPORTE
              </div>

              <div class="mb-4">
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
                    <div class="d-flex align-center py-1 overflow-hidden">
                      <v-avatar color="green-lighten-5" rounded="lg" size="40" class="mr-3 border-green">
                        <v-icon color="green-darken-2" size="24">mdi-tree</v-icon>
                      </v-avatar>
                      <div class="d-flex flex-column text-truncate">
                        <span class="text-body-1 font-weight-black text-truncate text-high-emphasis" style="line-height: 1.2;">
                          {{ item.title }}
                        </span>
                        <span class="text-caption font-weight-bold text-medium-emphasis">
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
                      class="d-flex align-center pa-2 rounded-xl cursor-pointer hover-effect border-input"
                      flat
                      :disabled="cosechaStore.loading"
                    >
                      <v-avatar color="blue-lighten-5" rounded="lg" size="40" class="mr-3 border-blue">
                        <v-icon color="blue-darken-3" size="24">mdi-calendar-range</v-icon>
                      </v-avatar>
                      <div>
                        <div class="text-body-1 font-weight-black text-high-emphasis" style="line-height: 1;">
                          {{ fechaFormateada }}
                        </div>
                        <div class="text-caption font-weight-bold text-blue-grey mt-1">
                          {{ infoDiaSemana }}
                        </div>
                      </div>
                      <v-spacer></v-spacer>
                      <v-icon color="medium-emphasis" size="20">mdi-pencil</v-icon>
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
                class="rounded-xl py-6 font-weight-black elevation-6 button-glow mb-4"
                height="64"
                :loading="cosechaStore.loading"
                :disabled="cosechaStore.loading || totalDigitado === 0 || !fincaSeleccionada"
                @click="guardarCosecha"
              >
                <v-icon start size="28">mdi-cloud-upload</v-icon>
                ENVIAR REPORTE
              </v-btn>

              <div class="text-center">
                <v-chip size="small" variant="text" class="font-weight-bold text-grey-darken-1">
                  <v-icon start size="small" color="success">mdi-circle-medium</v-icon>
                  RESTAN EN CAMPO: <strong class="ml-1 text-black text-h6">{{ totalRestante }}</strong>
                </v-chip>
              </div>

            </v-card>
          </v-col>

          <v-col cols="12" md="8" lg="9">
            
            <div v-if="cosechaStore.loading" class="text-center pa-12">
              <v-progress-circular indeterminate size="64" width="6" color="primary" />
              <div class="mt-4 font-weight-bold text-medium-emphasis">Sincronizando datos de campo...</div>
            </div>

            <v-row v-else dense>
              <v-col
                v-for="item in saldosOrdenados"
                :key="item.calendario_id"
                cols="12"
              >
                <v-card
                  rounded="xl"
                  class="mb-3 border-s-xl elevation-2"
                  :style="{ borderLeftColor: item.color_hex + ' !important', borderLeftWidth: '6px !important' }"
                  :class="[
                    esCintaDeCorteActual(item.semana_enfunde) ? 'bg-red-lighten-5 border-error' : 
                    esFrutaDeCorte(item.semana_enfunde) ? 'bg-orange-lighten-5' : 'bg-white'
                  ]"
                >
                  <v-card-text>

                    <div class="mb-2" v-if="esCintaDeCorteActual(item.semana_enfunde) || esFrutaDeCorte(item.semana_enfunde)">
                        <v-chip
                        v-if="esCintaDeCorteActual(item.semana_enfunde)"
                        color="red-darken-1"
                        size="x-small"
                        label
                        class="font-weight-black"
                        >
                        <v-icon start size="small">mdi-alert-circle</v-icon> CORTE DE ESTA SEMANA
                        </v-chip>
                        <v-chip
                        v-else-if="esFrutaDeCorte(item.semana_enfunde)"
                        color="orange-darken-2"
                        size="x-small"
                        label
                        class="font-weight-black"
                        >
                        <v-icon start size="small">mdi-basket</v-icon> LISTA PARA CORTE
                        </v-chip>
                    </div>

                    <v-row align="center">
                      <v-col cols="12" sm="4">
                        <div class="d-flex align-center">
                          <v-avatar :color="item.color_hex" size="56" class="me-4 elevation-3">
                            <span class="text-white text-h5 font-weight-black shadow-text">
                              {{ item.semana_enfunde }}
                            </span>
                          </v-avatar>
                          <div>
                            <div class="text-h6 font-weight-black text-truncate">
                              {{ item.color_cinta }}
                            </div>
                            <v-chip size="x-small" variant="outlined" class="font-weight-bold mt-1">
                              EDAD: {{ obtenerEdad(item.semana_enfunde) }} sem
                            </v-chip>
                          </div>
                        </div>
                      </v-col>

                      <v-col cols="12" sm="3" class="text-center">
                        <div class="text-caption font-weight-bold text-medium-emphasis mb-1">
                          DISPONIBLE: {{ item.saldo_en_campo }}
                        </div>
                        <v-progress-linear
                          v-if="item.cantidad_a_cosechar || item.rechazo"
                          height="12"
                          rounded
                          striped
                          :model-value="calcularPorcentaje(item)"
                          :color="esExcedido(item) ? 'red' : 'green'"
                        >
                        </v-progress-linear>
                      </v-col>

                      <v-col cols="12" sm="5">
                        <div class="d-flex justify-end flex-wrap gap-2">
                          
                          <div class="text-center">
                            <div class="text-[10px] font-weight-black text-primary mb-1 tracking-wider">BUENOS</div>
                            <div class="d-flex align-center rounded-lg border bg-white elevation-1 px-1" style="height: 40px;">
                              <v-btn
                                icon="mdi-minus"
                                size="x-small"
                                variant="text"
                                density="comfortable"
                                :disabled="cosechaStore.loading || item.cantidad_a_cosechar <= 0"
                                @click="item.cantidad_a_cosechar--"
                              />
                              <input
                                type="number"
                                class="touch-input text-h6"
                                v-model.number="item.cantidad_a_cosechar"
                                :disabled="cosechaStore.loading"
                                @focus="$event.target.select()"
                              />
                              <v-btn
                                icon="mdi-plus"
                                size="x-small"
                                variant="text"
                                density="comfortable"
                                color="primary"
                                :disabled="cosechaStore.loading || esExcedido(item)"
                                @click="item.cantidad_a_cosechar++"
                              />
                            </div>
                          </div>

                          <div class="text-center">
                            <div class="text-[10px] font-weight-black text-red mb-1 tracking-wider">RECHAZO</div>
                            <div class="d-flex align-center rounded-lg border bg-red-lighten-5 elevation-1 px-1" style="height: 40px; border-color: #ffcdd2 !important;">
                              <v-btn
                                icon="mdi-minus"
                                size="x-small"
                                variant="text"
                                density="comfortable"
                                color="red"
                                :disabled="cosechaStore.loading || item.rechazo <= 0"
                                @click="item.rechazo--"
                              />
                              <input
                                type="number"
                                class="touch-input text-h6 text-red"
                                v-model.number="item.rechazo"
                                :disabled="cosechaStore.loading"
                                @focus="$event.target.select()"
                              />
                              <v-btn
                                icon="mdi-plus"
                                size="x-small"
                                variant="text"
                                density="comfortable"
                                color="red"
                                :disabled="cosechaStore.loading || esExcedido(item)"
                                @click="item.rechazo++"
                              />
                            </div>
                          </div>

                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>

              <v-col v-if="!saldosOrdenados.length" cols="12">
                <v-sheet rounded="xl" class="pa-12 text-center bg-transparent border-dashed">
                  <v-icon size="80" color="grey-lighten-1" class="mb-4">mdi-basket-off-outline</v-icon>
                  <div class="text-h5 font-weight-bold text-medium-emphasis">No hay saldos disponibles</div>
                  <div class="text-body-2 text-disabled mt-2">Seleccione una finca o cambie la fecha</div>
                </v-sheet>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useCosechaStore } from '../../stores/cosecha/cosechaStore';
import { useFincaStore } from '../../stores/fincaStore';
import { useEmpresaStore } from '../../stores/empresaStore';
import { storeToRefs } from 'pinia';

// Stores
const cosechaStore = useCosechaStore();
const fincaStore = useFincaStore();
const empresaStore = useEmpresaStore();
const { fincas } = storeToRefs(fincaStore);

// --- ESTADOS REACTIVOS ---
const fincaSeleccionada = ref(fincaStore.fincaSeleccionadaId);
const fechaCosecha = ref(new Date().toISOString().split('T')[0]); // String YYYY-MM-DD
const fechaObjetoPicker = ref(new Date()); // Objeto Date para el DatePicker
const menuFecha = ref(false); // Control del menú

// Snackbar
const snackbar = ref({ show: false, message: '', color: 'info' });
const notify = (msg, color = 'info') =>
  (snackbar.value = { show: true, message: msg, color });

// --- LÓGICA DE FECHAS (UI MEJORADA) ---

// Sincronizar DatePicker con String Fecha
watch(fechaObjetoPicker, (newDate) => {
  if (newDate) {
    // Ajuste de zona horaria simple
    const offset = newDate.getTimezoneOffset();
    const dateLocal = new Date(newDate.getTime() - (offset*60*1000));
    fechaCosecha.value = dateLocal.toISOString().split('T')[0];
  }
});

const fechaFormateada = computed(() => {
  if (!fechaObjetoPicker.value) return 'Seleccionar Fecha';
  return fechaObjetoPicker.value.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

const infoDiaSemana = computed(() => {
    if (!fechaObjetoPicker.value) return '';
    const dia = fechaObjetoPicker.value.toLocaleDateString('es-ES', { weekday: 'long' });
    // Calculo simple de semana ISO para visualización
    const d = new Date(fechaObjetoPicker.value);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const week = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + 1) / 7);
    return `${dia.charAt(0).toUpperCase() + dia.slice(1)} · Semana ${week}`;
});

const fechaMaxima = computed(() => new Date()); // Máximo hoy
const fechaMinima = computed(() => {
  const f = new Date();
  f.setFullYear(f.getFullYear() - 1);
  return f;
});

// --- LÓGICA DE NEGOCIO (COSECHA) ---

/* Semana actual ISO del sistema */
const semanaActualSistema = computed(() => {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + 1) / 7);
});

/* Cálculo de Edad */
const obtenerEdad = (sem) =>
  sem > semanaActualSistema.value
    ? (52 - sem) + semanaActualSistema.value
    : semanaActualSistema.value - sem;

/* Sugerencia de corte (12 y 13 semanas) */
const sugerenciaCorte = computed(() => {
  const s = semanaActualSistema.value;
  const calc = (e) => {
    const r = s - e;
    return r <= 0 ? 52 + r : r;
  };
  return [calc(12), calc(13)];
});

const esCintaDeCorteActual = (semanaEnfunde) => sugerenciaCorte.value.includes(semanaEnfunde);

const esFrutaDeCorte = (sem) => {
  const edad = obtenerEdad(sem);
  return edad >= 11 && edad <= 14;
};

/* Validaciones y Totales */
const esExcedido = (i) =>
  (Number(i.cantidad_a_cosechar) || 0) + (Number(i.rechazo) || 0) > i.saldo_en_campo;

const calcularPorcentaje = (i) =>
  Math.min(
    (((Number(i.cantidad_a_cosechar) || 0) + (Number(i.rechazo) || 0)) / (i.saldo_en_campo || 1)) * 100,
    100
  );

const totalDigitado = computed(() =>
  cosechaStore.saldosPendientes.reduce(
    (a, i) => a + (Number(i.cantidad_a_cosechar) || 0) + (Number(i.rechazo) || 0), 0
  )
);

const totalRestante = computed(() =>
  cosechaStore.saldosPendientes.reduce(
    (a, i) => a + (i.saldo_en_campo - (Number(i.cantidad_a_cosechar) || 0) - (Number(i.rechazo) || 0)), 0
  )
);

const hayExcedidos = computed(() => cosechaStore.saldosPendientes.some(esExcedido));

const estadoOperacion = computed(() => {
  if (hayExcedidos.value) return 'HAY EXCEDENTES';
  if (totalDigitado.value > 0) return 'LISTO PARA ENVIAR';
  return 'SIN DATOS';
});

const estadoColor = computed(() => {
  if (hayExcedidos.value) return 'error';
  if (totalDigitado.value > 0) return 'success';
  return 'grey';
});

/* Ordenamiento Inteligente */
const saldosOrdenados = computed(() => {
  return [...cosechaStore.saldosPendientes].sort((a, b) => {
    const aActual = esCintaDeCorteActual(a.semana_enfunde);
    const bActual = esCintaDeCorteActual(b.semana_enfunde);
    if (aActual && !bActual) return -1;
    if (!aActual && bActual) return 1;

    const aCorte = esFrutaDeCorte(a.semana_enfunde);
    const bCorte = esFrutaDeCorte(b.semana_enfunde);
    if (aCorte && !bCorte) return -1;
    if (!aCorte && bCorte) return 1;

    return obtenerEdad(b.semana_enfunde) - obtenerEdad(a.semana_enfunde);
  });
});

/* Acciones */
const cargarSaldos = async (id) => {
  if (!id || cosechaStore.loading) return;
  fincaStore.seleccionarFinca(id);
  await cosechaStore.cargarSaldos(id);
};

const guardarCosecha = async () => {
  if (cosechaStore.loading) return;
  if (!fincaSeleccionada.value) return notify('Seleccione una finca', 'error');
  if (totalDigitado.value === 0) return notify('Ingrese al menos un racimo', 'info');

  const ok = await cosechaStore.enviarCosecha(fincaSeleccionada.value, fechaCosecha.value, 1);
  if (ok) {
    notify('Reporte enviado correctamente', 'success');
    // Reiniciar inputs o recargar saldos si es necesario
    await cargarSaldos(fincaSeleccionada.value);
  }
};

/* Inicialización */
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
/* ESTILOS DE ENTRADA NUMÉRICA */
.touch-input {
  width: 50px;
  text-align: center;
  border: none;
  font-weight: 900;
  background: transparent;
  outline: none;
}
/* Eliminar flechas del input number */
.touch-input::-webkit-outer-spin-button,
.touch-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* ETIQUETAS */
.custom-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: #94a3b8;
  text-transform: uppercase;
  margin-left: 4px;
}

/* INPUTS PERSONALIZADOS DEL PANEL LATERAL */
.super-select :deep(.v-field__outline) { --v-field-border-opacity: 0.15; }
.super-select :deep(.v-field--focused .v-field__outline) { --v-field-border-opacity: 1; color: rgb(var(--v-theme-primary)); }
.super-select :deep(.v-field) { border-radius: 12px !important; padding-top: 6px; padding-bottom: 6px; background-color: white; }

/* BORDES Y DECORACIÓN */
.border-green { border: 2px solid #dcfce7; }
.border-blue { border: 2px solid #dbeafe; }
.border-input { border: 1px solid rgba(0,0,0,0.12); transition: all 0.2s; background-color: white; }
.border-dashed { border-style: dashed !important; opacity: 0.4; }

/* ESTADOS */
.border-error { border: 2px solid #ef5350 !important; }

/* EFECTOS */
.hover-effect:hover { border-color: rgb(var(--v-theme-primary)); background-color: rgb(var(--v-theme-surface-variant)); }
.button-glow { box-shadow: 0 10px 25px -5px rgba(var(--v-theme-primary), 0.5) !important; }
.shadow-text { text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.line-height-1 { line-height: 1; }

.sticky-control { position: sticky; top: 20px; z-index: 5; }
.gap-2 { gap: 8px; }
</style>

```