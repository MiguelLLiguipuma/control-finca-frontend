<template>
  <v-container fluid class="bg-grey-lighten-4 fill-height align-start pa-0 pa-md-4">
    <!-- Snackbar -->
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-row justify="center" no-gutters>
      <v-col cols="12" lg="11">

        <!-- ================= HEADER ================= -->
        <v-card class="mb-4" elevation="3" rounded="xl" color="grey-darken-4" theme="dark">
          <v-card-text class="d-flex align-center py-4 flex-wrap">
            <v-icon size="40" color="primary" class="me-4">mdi-tablet-dashboard</v-icon>
            <v-col cols="4" sm="auto">
              <div class="selector-finca px-1"><FincaSelector /></div>
              </v-col>

            <div>
              <h1 class="text-h5 font-weight-black mb-0">
                Control de Campo · Sem {{ semanaActualSistema }}
              </h1>
              <div class="d-flex align-center text-primary font-weight-bold">
                <v-icon size="16" class="me-1">mdi-calendar-check</v-icon>
                {{ fechaCosecha }} | Corte sugerido: {{ sugerenciaCorte.join(', ') }}
              </div>
            </div>

            <v-spacer />

            <div class="text-right">
              <div class="text-h3 font-weight-black text-primary">
                {{ totalDigitado }}
              </div>
              <div class="text-caption font-weight-bold">
                RACIMOS DIGITADOS
              </div>
              <v-chip
                class="mt-1"
                size="small"
                label
                :color="estadoColor"
              >
                {{ estadoOperacion }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <v-row>
          <!-- ================= PANEL LATERAL ================= -->
          <v-col cols="12" md="4">
            <v-card rounded="xl" class="pa-5 mb-4" elevation="2">
              <v-select
                v-model="fincaSeleccionada"
                :items="fincas"
                item-title="nombre"
                item-value="id"
                label="Finca"
                prepend-inner-icon="mdi-island"
                variant="solo-filled"
                rounded="lg"
                :disabled="cosechaStore.loading"
                @update:model-value="cargarSaldos"
              />

              <v-text-field
                v-model="fechaCosecha"
                type="date"
                label="Fecha de Operación"
                prepend-inner-icon="mdi-calendar"
                variant="solo-filled"
                rounded="lg"
                :min="fechaMinima"
                :max="fechaMaxima"
                :disabled="cosechaStore.loading"
              />

              <v-divider class="my-6" />

              <v-btn
                block
                height="80"
                rounded="xl"
                elevation="8"
                color="primary"
                class="text-h6 font-weight-black"
                :loading="cosechaStore.loading"
                :disabled="cosechaStore.loading || totalDigitado === 0 || !fincaSeleccionada"
                @click="guardarCosecha"
              >
                <v-icon class="me-2">mdi-cloud-upload</v-icon>
                ENVIAR REPORTE
              </v-btn>

              <v-divider class="my-4" />

              <div class="text-caption font-weight-bold">
                RESTAN EN CAMPO: {{ totalRestante }}
              </div>
            </v-card>
          </v-col>

          <!-- ================= LISTADO ================= -->
          <v-col cols="12" md="8">
            <div v-if="cosechaStore.loading" class="text-center pa-8">
              <v-progress-circular indeterminate size="64" color="primary" />
              <div class="mt-4">Cargando saldos…</div>
            </div>

            <v-row v-else dense>
              <v-col
                v-for="item in saldosOrdenados"
                :key="item.calendario_id"
                cols="12"
              >
                <v-card
                  rounded="xl"
                  class="mb-3 border-s-xl"
                  :style="{ borderLeftColor: item.color_hex }"
                  :class="[
                    esCintaDeCorteActual(item.semana_enfunde)
                      ? 'bg-red-lighten-5 border-error'
                      : esFrutaDeCorte(item.semana_enfunde)
                        ? 'bg-orange-lighten-5'
                        : 'bg-white'
                  ]"
                >
                  <v-card-text>

                    <!-- CHIPS DE ESTADO -->
                    <v-chip
                      v-if="esCintaDeCorteActual(item.semana_enfunde)"
                      color="red"
                      size="small"
                      label
                      class="mb-2"
                    >
                      CORTE DE ESTA SEMANA
                    </v-chip>

                    <v-chip
                      v-else-if="esFrutaDeCorte(item.semana_enfunde)"
                      color="orange"
                      size="small"
                      label
                      class="mb-2"
                    >
                      LISTA PARA CORTE
                    </v-chip>

                    <v-row align="center">
                      <v-col cols="12" sm="4">
                        <div class="d-flex align-center">
                          <v-avatar :color="item.color_hex" size="48" class="me-3">
                            <span class="text-white font-weight-black">
                              {{ item.semana_enfunde }}
                            </span>
                          </v-avatar>
                          <div>
                            <div class="text-h6 font-weight-black">
                              {{ item.color_cinta }}
                            </div>
                            <div class="text-caption">
                              EDAD: {{ obtenerEdad(item.semana_enfunde) }} semanas
                            </div>
                          </div>
                        </div>
                      </v-col>

                      <v-col cols="12" sm="3" class="text-center">
                        <div class="text-caption font-weight-bold">
                          DISPONIBLE: {{ item.saldo_en_campo }}
                        </div>
                        <v-progress-linear
                          v-if="item.cantidad_a_cosechar || item.rechazo"
                          height="10"
                          rounded
                          striped
                          :model-value="calcularPorcentaje(item)"
                          :color="esExcedido(item) ? 'red' : 'green'"
                        />
                      </v-col>

                      <v-col cols="12" sm="5">
                        <div class="d-flex justify-end flex-wrap">
                          <!-- BUENOS -->
                          <div class="me-3 text-center">
                            <div class="text-overline font-weight-black text-primary">
                              BUENOS
                            </div>
                            <div class="d-flex align-center rounded-pill border pa-1">
                              <v-btn
                                icon="mdi-minus"
                                size="x-small"
                                variant="text"
                                :disabled="cosechaStore.loading || item.cantidad_a_cosechar <= 0"
                                @click="item.cantidad_a_cosechar--"
                              />
                              <input
                                type="number"
                                class="touch-input"
                                v-model.number="item.cantidad_a_cosechar"
                                :disabled="cosechaStore.loading"
                              />
                              <v-btn
                                icon="mdi-plus"
                                size="x-small"
                                variant="text"
                                :disabled="cosechaStore.loading || esExcedido(item)"
                                @click="item.cantidad_a_cosechar++"
                              />
                            </div>
                          </div>

                          <!-- RECHAZO -->
                          <div class="text-center">
                            <div class="text-overline font-weight-bold text-grey">
                              RECHAZO
                            </div>
                            <div class="d-flex align-center rounded-pill border pa-1 bg-red-lighten-5">
                              <v-btn
                                icon="mdi-minus"
                                size="x-small"
                                variant="text"
                                color="red"
                                :disabled="cosechaStore.loading || item.rechazo <= 0"
                                @click="item.rechazo--"
                              />
                              <input
                                type="number"
                                class="touch-input text-red"
                                v-model.number="item.rechazo"
                                :disabled="cosechaStore.loading"
                              />
                              <v-btn
                                icon="mdi-plus"
                                size="x-small"
                                variant="text"
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
                <v-card rounded="xl" class="pa-8 text-center">
                  <v-icon size="64" color="grey">mdi-information-outline</v-icon>
                  <div class="text-h6 mt-4">No hay saldos disponibles</div>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCosechaStore } from '../../stores/cosecha/cosechaStore';
import { useFincaStore } from '../../stores/fincaStore';
import { useEmpresaStore } from '../../stores/empresaStore';
import AnoSelector from '../../components/ui/AnoSelector.vue'

import { storeToRefs } from 'pinia';

const cosechaStore = useCosechaStore();
const fincaStore = useFincaStore();
const empresaStore = useEmpresaStore();

const { fincas } = storeToRefs(fincaStore);

const fincaSeleccionada = ref(fincaStore.fincaSeleccionadaId);
const fechaCosecha = ref(new Date().toISOString().split('T')[0]);

/* Snackbar */
const snackbar = ref({ show: false, message: '', color: 'info' });
const notify = (msg, color = 'info') =>
  (snackbar.value = { show: true, message: msg, color });

/* Fechas */
const fechaMaxima = computed(() => new Date().toISOString().split('T')[0]);
const fechaMinima = computed(() => {
  const f = new Date();
  f.setFullYear(f.getFullYear() - 1);
  return f.toISOString().split('T')[0];
});

/* Semana actual ISO */
const semanaActualSistema = computed(() => {
  const d = new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + 1) / 7);
});

/* Edad */
const obtenerEdad = (sem) =>
  sem > semanaActualSistema.value
    ? (52 - sem) + semanaActualSistema.value
    : semanaActualSistema.value - sem;

/* Sugerencia de corte */
const sugerenciaCorte = computed(() => {
  const s = semanaActualSistema.value;
  const calc = (e) => {
    const r = s - e;
    return r <= 0 ? 52 + r : r;
  };
  return [calc(12), calc(13)];
});

/* NUEVA LÓGICA CLAVE */
const esCintaDeCorteActual = (semanaEnfunde) =>
  sugerenciaCorte.value.includes(semanaEnfunde);

const esFrutaDeCorte = (sem) => {
  const edad = obtenerEdad(sem);
  return edad >= 11 && edad <= 14;
};

/* Validaciones */
const esExcedido = (i) =>
  (Number(i.cantidad_a_cosechar) || 0) +
    (Number(i.rechazo) || 0) >
  i.saldo_en_campo;

const calcularPorcentaje = (i) =>
  Math.min(
    (((Number(i.cantidad_a_cosechar) || 0) +
      (Number(i.rechazo) || 0)) /
      (i.saldo_en_campo || 1)) *
      100,
    100
  );

/* Totales */
const totalDigitado = computed(() =>
  cosechaStore.saldosPendientes.reduce(
    (a, i) =>
      a +
      (Number(i.cantidad_a_cosechar) || 0) +
      (Number(i.rechazo) || 0),
    0
  )
);

const totalRestante = computed(() =>
  cosechaStore.saldosPendientes.reduce(
    (a, i) =>
      a +
      (i.saldo_en_campo -
        (Number(i.cantidad_a_cosechar) || 0) -
        (Number(i.rechazo) || 0)),
    0
  )
);

/* Estado global */
const hayExcedidos = computed(() =>
  cosechaStore.saldosPendientes.some(esExcedido)
);

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

/* Orden por prioridad real */
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

/* Actions */
const cargarSaldos = async (id) => {
  if (!id || cosechaStore.loading) return;
  fincaStore.seleccionarFinca(id);
  await cosechaStore.cargarSaldos(id);
};

const guardarCosecha = async () => {
  if (cosechaStore.loading) return;

  if (!fincaSeleccionada.value)
    return notify('Seleccione una finca', 'error');

  if (totalDigitado.value === 0)
    return notify('Ingrese al menos un racimo', 'info');

  const ok = await cosechaStore.enviarCosecha(
    fincaSeleccionada.value,
    fechaCosecha.value,
    1
  );

  if (ok) notify('Reporte enviado correctamente', 'success');
};

/* Init */
onMounted(async () => {
  try {
    if (!empresaStore.empresas.length) await empresaStore.fetchEmpresas();
    await fincaStore.obtenerFincas();
    if (fincaSeleccionada.value) await cargarSaldos(fincaSeleccionada.value);
  } catch {
    notify('Error inicializando la aplicación', 'error');
  }
});
</script>

<style scoped>
.touch-input {
  width: 48px;
  text-align: center;
  border: none;
  font-weight: 900;
  background: transparent;
}
.touch-input:focus {
  outline: none;
}
.border-error {
  border: 2px solid #f44336 !important;
}
</style>
