<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-card class="rounded-xl mb-4" elevation="2">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <div class="text-overline text-medium-emphasis">Monitoreo Operativo</div>
          <h1 class="text-h4 font-weight-black">Centro de Alertas</h1>
        </div>
        <v-btn color="primary" :loading="loading" @click="cargarAlertas">Actualizar</v-btn>
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
      <v-col cols="6" md="3">
        <label class="text-caption font-weight-bold">Días de análisis</label>
        <v-text-field
          v-model.number="dias"
          type="number"
          min="1"
          max="30"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="6" md="3">
        <label class="text-caption font-weight-bold">Rechazo mínimo (%)</label>
        <v-text-field
          v-model.number="rechazoMinPct"
          type="number"
          min="1"
          max="80"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="2" class="d-flex align-end">
        <v-btn block color="secondary" variant="tonal" :loading="loading" @click="cargarAlertas">Filtrar</v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-card class="rounded-xl mb-4" elevation="1">
      <v-card-text>
        <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-2">
          <div class="text-subtitle-1 font-weight-bold">Registro de Fumigación</div>
          <v-chip size="small" variant="tonal" color="success">
            Semáforo: Verde ≤15 · Amarillo 16-20 · Rojo >20 días
          </v-chip>
        </div>
        <v-row dense>
          <v-col cols="12" md="4">
            <label class="text-caption font-weight-bold">Finca</label>
            <v-select
              v-model="fincaFumigacionId"
              :items="fincas"
              item-title="nombre"
              item-value="id"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <label class="text-caption font-weight-bold">Fecha fumigación</label>
            <v-text-field
              v-model="fechaFumigacion"
              type="date"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <label class="text-caption font-weight-bold">Observación</label>
            <v-text-field
              v-model="observacionFumigacion"
              placeholder="Opcional"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="2" class="d-flex align-end">
            <v-btn
              block
              color="primary"
              :loading="loadingGuardarFumigacion"
              @click="guardarFumigacion"
            >
              Guardar
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-row>
      <v-col cols="12" md="4">
        <v-card rounded="xl" class="pa-4" color="error" variant="tonal">
          <div class="text-caption">Alertas Altas</div>
          <div class="text-h3 font-weight-black">{{ resumen.altas }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="xl" class="pa-4" color="warning" variant="tonal">
          <div class="text-caption">Alertas Medias</div>
          <div class="text-h3 font-weight-black">{{ resumen.medias }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="xl" class="pa-4" color="info" variant="tonal">
          <div class="text-caption">Alertas Bajas</div>
          <div class="text-h3 font-weight-black">{{ resumen.bajas }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4 rounded-xl" elevation="1">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Severidad</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in alertas" :key="`${item.tipo}-${item.referencia_id}-${item.fecha_evento}`">
            <td>{{ item.fecha_evento }}</td>
            <td>{{ item.tipo }}</td>
            <td>
              <v-chip :color="colorSeveridad(item.severidad)" size="small">{{ item.severidad.toUpperCase() }}</v-chip>
            </td>
            <td>{{ item.mensaje }}</td>
          </tr>
          <tr v-if="!loading && !alertas.length">
            <td colspan="4" class="text-center text-medium-emphasis py-8">No hay alertas con los filtros actuales.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useFincaStore } from '@/stores/fincaStore';
import { reportesSeguridadService, type AlertaItem } from '@/services/reportes/reportesSeguridadService';

const fincaStore = useFincaStore();
const { fincas } = storeToRefs(fincaStore);

const fincaId = ref<number | null>(null);
const dias = ref(7);
const rechazoMinPct = ref(20);
const loading = ref(false);
const error = ref('');
const alertas = ref<AlertaItem[]>([]);
const fechaFumigacion = ref(new Date().toISOString().slice(0, 10));
const fincaFumigacionId = ref<number | null>(null);
const observacionFumigacion = ref('');
const loadingGuardarFumigacion = ref(false);

const resumen = computed(() => ({
  altas: alertas.value.filter((a) => a.severidad === 'alta').length,
  medias: alertas.value.filter((a) => a.severidad === 'media').length,
  bajas: alertas.value.filter((a) => a.severidad === 'baja').length,
}));

function colorSeveridad(level: string): string {
  if (level === 'alta') return 'error';
  if (level === 'media') return 'warning';
  return 'info';
}

async function cargarAlertas() {
  loading.value = true;
  error.value = '';
  try {
    alertas.value = await reportesSeguridadService.getAlertas({
      finca_id: fincaId.value || undefined,
      dias: dias.value,
      rechazo_min_pct: rechazoMinPct.value,
    });
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudieron cargar alertas';
    alertas.value = [];
  } finally {
    loading.value = false;
  }
}

async function guardarFumigacion() {
  const fincaIdTarget = Number(fincaFumigacionId.value || fincaId.value || 0);
  if (!fincaIdTarget) {
    error.value = 'Seleccione una finca para registrar fumigación.';
    return;
  }

  loadingGuardarFumigacion.value = true;
  error.value = '';
  try {
    await reportesSeguridadService.registrarFumigacion({
      finca_id: fincaIdTarget,
      fecha_fumigacion: fechaFumigacion.value,
      observacion: observacionFumigacion.value || undefined,
    });
    observacionFumigacion.value = '';
    await cargarAlertas();
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudo registrar fumigación';
  } finally {
    loadingGuardarFumigacion.value = false;
  }
}

onMounted(async () => {
  await fincaStore.obtenerFincas();
  fincaFumigacionId.value = fincaId.value;
  await cargarAlertas();
});

watch(fincaId, (next) => {
  fincaFumigacionId.value = next;
});
</script>
