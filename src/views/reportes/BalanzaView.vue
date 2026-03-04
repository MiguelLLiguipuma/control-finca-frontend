<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-card class="rounded-xl mb-4" elevation="2">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <div class="text-overline text-medium-emphasis">Monitoreo de Proceso</div>
          <h1 class="text-h4 font-weight-black">Balanza de Cajas</h1>
        </div>
        <div class="d-flex gap-2 align-center flex-wrap">
          <v-switch
            v-model="autoRefresh"
            hide-details
            density="compact"
            color="primary"
            label="Auto refresh"
          />
          <v-btn color="primary" :loading="loading" @click="cargarDatos">
            Actualizar
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-row class="mb-3">
      <v-col cols="12" md="4">
        <label class="text-caption font-weight-bold">Finca</label>
        <v-select
          v-model="fincaId"
          :items="fincas"
          item-title="nombre"
          item-value="id"
          clearable
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="8" class="d-flex align-end">
        <div class="text-caption text-medium-emphasis">
          Última actualización: <strong>{{ ultimaActualizacionLabel }}</strong>
        </div>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-row>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="pa-4" color="primary" variant="tonal">
          <div class="text-caption">Estado</div>
          <div class="text-h5 font-weight-black">{{ ultimaLectura?.estado || 'SIN DATA' }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="pa-4" color="success" variant="tonal">
          <div class="text-caption">Cajas actuales</div>
          <div class="text-h4 font-weight-black">{{ ultimaLectura?.cajas ?? 0 }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="pa-4" color="info" variant="tonal">
          <div class="text-caption">Peso neto (kg)</div>
          <div class="text-h4 font-weight-black">{{ formatKg(ultimaLectura?.peso_neto_kg) }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card rounded="xl" class="pa-4" color="warning" variant="tonal">
          <div class="text-caption">Sesión</div>
          <div class="text-h5 font-weight-black">{{ ultimaLectura?.session_id ?? '-' }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4 rounded-xl" elevation="1">
      <v-card-text class="pb-0">
        <div class="text-subtitle-1 font-weight-bold">Últimas sesiones enviadas</div>
      </v-card-text>
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Sesión</th>
            <th>Finca</th>
            <th>Cajas</th>
            <th>Peso pico (kg)</th>
            <th>Finalizado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in sesiones" :key="item.session_id">
            <td>{{ item.session_id }}</td>
            <td>{{ item.finca_nombre || item.finca_id || '-' }}</td>
            <td>{{ item.cajas }}</td>
            <td>{{ formatKg(item.peso_pico_kg) }}</td>
            <td>{{ formatFecha(item.finalizado_en || item.timestamp) }}</td>
          </tr>
          <tr v-if="!loading && !sesiones.length">
            <td colspan="5" class="text-center text-medium-emphasis py-8">
              No hay sesiones registradas.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useFincaStore } from '@/stores/fincaStore';
import { balanzaService, type BalanzaSesionResumen, type BalanzaUltimaLectura } from '@/services/balanzaService';

const fincaStore = useFincaStore();
const { fincas } = storeToRefs(fincaStore);

const fincaId = ref<number | null>(null);
const autoRefresh = ref(true);
const loading = ref(false);
const error = ref('');
const ultimaLectura = ref<BalanzaUltimaLectura | null>(null);
const sesiones = ref<BalanzaSesionResumen[]>([]);
const ultimaActualizacion = ref<Date | null>(null);

let timer: number | null = null;

const ultimaActualizacionLabel = computed(() => {
  if (!ultimaActualizacion.value) return 'sin actualizar';
  return ultimaActualizacion.value.toLocaleString('es-EC');
});

function formatKg(value?: number | null): string {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function formatFecha(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-EC');
}

async function cargarDatos() {
  loading.value = true;
  error.value = '';
  try {
    const params = fincaId.value ? { finca_id: fincaId.value } : {};
    const [last, rows] = await Promise.all([
      balanzaService.getUltimaLectura(params),
      balanzaService.getSesiones({ ...params, limit: 20 }),
    ]);

    ultimaLectura.value = last;
    sesiones.value = rows;
    ultimaActualizacion.value = new Date();
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudo cargar monitoreo de balanza';
    ultimaLectura.value = null;
    sesiones.value = [];
  } finally {
    loading.value = false;
  }
}

function startAutoRefresh() {
  if (timer) window.clearInterval(timer);
  if (!autoRefresh.value) return;

  timer = window.setInterval(() => {
    cargarDatos();
  }, 5000);
}

watch(autoRefresh, () => {
  startAutoRefresh();
});

watch(fincaId, () => {
  cargarDatos();
});

onMounted(async () => {
  await fincaStore.obtenerFincas();
  await cargarDatos();
  startAutoRefresh();
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>
