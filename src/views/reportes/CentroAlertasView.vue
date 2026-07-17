<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-card class="rounded-xl mb-4" elevation="2">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <div class="text-overline text-medium-emphasis">Monitoreo Operativo</div>
          <h1 class="text-h4 font-weight-black">Centro de Alertas</h1>
        </div>
        <div class="d-flex align-center gap-2">
          <v-btn color="primary" variant="tonal" :loading="alertaStore.loading" @click="generarDiagnostico">
            Generar diagnóstico
          </v-btn>
          <v-btn color="primary" :loading="alertaStore.loading" @click="cargarAlertas">Actualizar</v-btn>
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
      <v-col cols="12" md="3">
        <label class="text-caption font-weight-bold">Estado</label>
        <v-select
          v-model="estadoFiltro"
          :items="estadoOptions"
          item-title="label"
          item-value="value"
          clearable
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="6" md="2">
        <label class="text-caption font-weight-bold">Edad crítica cinta</label>
        <v-text-field
          v-model.number="edadCriticaCinta"
          type="number"
          min="12"
          max="20"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="6" md="2">
        <label class="text-caption font-weight-bold">Edad histórica</label>
        <v-text-field
          v-model.number="edadHistoricaCinta"
          type="number"
          min="13"
          max="30"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="2" class="d-flex align-end">
        <v-btn block color="secondary" variant="tonal" :loading="alertaStore.loading" @click="cargarAlertas">Filtrar</v-btn>
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
          <div class="text-caption">Críticas</div>
          <div class="text-h3 font-weight-black">{{ alertaStore.resumen.criticas }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="xl" class="pa-4" color="warning" variant="tonal">
          <div class="text-caption">Altas</div>
          <div class="text-h3 font-weight-black">{{ alertaStore.resumen.altas }}</div>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card rounded="xl" class="pa-4" color="info" variant="tonal">
          <div class="text-caption">Abiertas</div>
          <div class="text-h3 font-weight-black">{{ alertaStore.resumen.abiertas }}</div>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="mt-4 rounded-xl" elevation="1">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Finca</th>
            <th>Tipo</th>
            <th>Severidad</th>
            <th>Detalle</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in alertas" :key="item.id">
            <td>{{ formatFecha(item.detectada_en) }}</td>
            <td>{{ item.finca_nombre || 'General' }}</td>
            <td>{{ item.tipo }}</td>
            <td>
              <v-chip :color="colorSeveridad(item.severidad)" size="small">{{ item.severidad.toUpperCase() }}</v-chip>
            </td>
            <td>{{ item.mensaje }}</td>
            <td class="text-right">
              <v-btn
                icon="mdi-eye-check-outline"
                size="small"
                variant="text"
                color="primary"
                :disabled="item.estado === 'leida' || item.estado === 'resuelta'"
                aria-label="Marcar alerta como leída"
                @click="marcarLeida(item.id)"
              />
              <v-btn
                icon="mdi-check-circle-outline"
                size="small"
                variant="text"
                color="success"
                :disabled="item.estado === 'resuelta'"
                aria-label="Resolver alerta"
                @click="resolverAlerta(item.id)"
              />
            </td>
          </tr>
          <tr v-if="!alertaStore.loading && !alertas.length">
            <td colspan="6" class="text-center text-medium-emphasis py-8">No hay alertas con los filtros actuales.</td>
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
import { useAlertaStore } from '@/stores/alertaStore';
import { reportesSeguridadService } from '@/services/reportes/reportesSeguridadService';
import { toLocalIsoDate } from '@/utils/dateIso';
import type { AlertaEstado, AlertaSeveridad } from '@/services/alertaService';

const fincaStore = useFincaStore();
const alertaStore = useAlertaStore();
const { fincas } = storeToRefs(fincaStore);

const fincaId = ref<number | null>(null);
const estadoFiltro = ref<AlertaEstado | null>(null);
const edadCriticaCinta = ref(15);
const edadHistoricaCinta = ref(17);
const error = ref('');
const fechaFumigacion = ref(toLocalIsoDate());
const fincaFumigacionId = ref<number | null>(null);
const observacionFumigacion = ref('');
const loadingGuardarFumigacion = ref(false);

const estadoOptions = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Enviadas', value: 'enviada' },
  { label: 'Leídas', value: 'leida' },
  { label: 'Resueltas', value: 'resuelta' },
];

const alertas = computed(() => alertaStore.items);

function colorSeveridad(level: AlertaSeveridad): string {
  if (level === 'critica' || level === 'alta') return 'error';
  if (level === 'media') return 'warning';
  return 'info';
}

function formatFecha(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function cargarAlertas() {
  error.value = '';
  try {
    await alertaStore.cargar({
      query: {
      finca_id: fincaId.value || undefined,
      estado: estadoFiltro.value || undefined,
      },
    });
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudieron cargar alertas';
  }
}

async function generarDiagnostico() {
  error.value = '';
  try {
    await alertaStore.generar({
      finca_id: fincaId.value || undefined,
      edad_critica_cinta: edadCriticaCinta.value,
      edad_historica_cinta: edadHistoricaCinta.value,
    });
    await cargarAlertas();
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudo generar el diagnóstico';
  }
}

async function marcarLeida(id: number) {
  await alertaStore.marcarLeida(id);
}

async function resolverAlerta(id: number) {
  await alertaStore.resolver(id);
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
