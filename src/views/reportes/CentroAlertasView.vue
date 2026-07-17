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

    <v-card class="rounded-xl mb-4" elevation="1">
      <v-card-text>
        <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-3">
          <div>
            <div class="text-subtitle-1 font-weight-bold">Depuración de inventario histórico</div>
            <div class="text-caption text-medium-emphasis">
              Cierra saldos antiguos sin borrar registros; el ajuste queda auditado.
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <v-chip color="warning" variant="tonal" size="small">
              {{ inventarioHistorico.length }} cinta(s)
            </v-chip>
            <v-btn
              color="primary"
              variant="tonal"
              :loading="loadingInventarioHistorico"
              :disabled="!fincaId"
              @click="cargarInventarioHistorico"
            >
              Cargar histórico
            </v-btn>
          </div>
        </div>

        <v-alert v-if="!fincaId" type="info" variant="tonal" density="compact" class="mb-3">
          Selecciona una finca para revisar y cerrar inventario histórico.
        </v-alert>

        <div v-if="inventarioHistorico.length" class="mb-3">
          <div class="d-flex align-center justify-space-between flex-wrap gap-3 mb-2">
            <div class="text-body-2 text-medium-emphasis">
              Seleccionadas: <strong>{{ historicoSeleccionado.length }}</strong> ·
              Saldo a cerrar: <strong>{{ totalHistoricoSeleccionado }}</strong>
            </div>
            <div class="d-flex align-center gap-2">
              <v-btn size="small" variant="text" @click="seleccionarTodoHistorico">
                Seleccionar todo
              </v-btn>
              <v-btn size="small" variant="text" color="medium-emphasis" @click="historicoSeleccionado = []">
                Limpiar
              </v-btn>
            </div>
          </div>

          <v-table density="compact" class="historico-table">
            <thead>
              <tr>
                <th></th>
                <th>Semana</th>
                <th>Color</th>
                <th>Edad</th>
                <th>Saldo</th>
                <th>Ajustado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in inventarioHistorico" :key="item.calendario_id">
                <td>
                  <button
                    type="button"
                    class="historico-selector"
                    :class="{
                      'historico-selector--active': isHistoricoSeleccionado(item.calendario_id),
                    }"
                    :aria-pressed="isHistoricoSeleccionado(item.calendario_id)"
                    :aria-label="`Seleccionar semana ${item.semana_enfunde}`"
                    @click="toggleHistorico(item.calendario_id)"
                  >
                    <v-icon v-if="isHistoricoSeleccionado(item.calendario_id)" size="16">
                      mdi-check
                    </v-icon>
                  </button>
                </td>
                <td class="font-weight-bold">Sem {{ item.semana_enfunde }}/{{ item.anio }}</td>
                <td>
                  <span class="historico-color-dot" :style="{ backgroundColor: item.color_hex }" />
                  {{ item.color_cinta }}
                </td>
                <td>{{ item.edad_semanas }} sem</td>
                <td>{{ item.saldo_en_campo }}</td>
                <td>{{ item.total_ajustado }}</td>
              </tr>
            </tbody>
          </v-table>

          <v-textarea
            v-model="motivoCierreHistorico"
            label="Motivo del cierre"
            placeholder="Ejemplo: depuración de saldos históricos anteriores al control operativo actual"
            variant="outlined"
            density="comfortable"
            rows="2"
            class="mt-3"
          />

          <div class="d-flex justify-end">
            <v-btn
              color="error"
              :loading="loadingCerrarHistorico"
              :disabled="!historicoSeleccionado.length || motivoCierreHistorico.trim().length < 8"
              @click="cerrarInventarioSeleccionado"
            >
              Cerrar seleccionadas
            </v-btn>
          </div>
        </div>
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
                icon="mdi-check-circle-outline"
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
import {
  cosechaService,
  type InventarioHistoricoItem,
} from '@/services/cosecha/cosechaService';
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
const inventarioHistorico = ref<InventarioHistoricoItem[]>([]);
const historicoSeleccionado = ref<number[]>([]);
const motivoCierreHistorico = ref('');
const loadingInventarioHistorico = ref(false);
const loadingCerrarHistorico = ref(false);

const estadoOptions = [
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Enviadas', value: 'enviada' },
  { label: 'Leídas', value: 'leida' },
  { label: 'Resueltas', value: 'resuelta' },
];

const alertas = computed(() => alertaStore.items);
const totalHistoricoSeleccionado = computed(() =>
  inventarioHistorico.value
    .filter((item) => historicoSeleccionado.value.includes(Number(item.calendario_id)))
    .reduce((total, item) => total + Number(item.saldo_en_campo || 0), 0),
);

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

async function cargarInventarioHistorico() {
  const fincaIdTarget = Number(fincaId.value || 0);
  if (!fincaIdTarget) {
    error.value = 'Seleccione una finca para revisar inventario histórico.';
    return;
  }

  loadingInventarioHistorico.value = true;
  error.value = '';
  try {
    inventarioHistorico.value = await cosechaService.getInventarioHistorico({
      finca_id: fincaIdTarget,
      edad_historica: edadHistoricaCinta.value,
    });
    historicoSeleccionado.value = [];
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudo cargar inventario histórico';
    inventarioHistorico.value = [];
  } finally {
    loadingInventarioHistorico.value = false;
  }
}

function seleccionarTodoHistorico() {
  historicoSeleccionado.value = inventarioHistorico.value.map((item) =>
    Number(item.calendario_id),
  );
}

function isHistoricoSeleccionado(calendarioId: number): boolean {
  return historicoSeleccionado.value.includes(Number(calendarioId));
}

function toggleHistorico(calendarioId: number) {
  const id = Number(calendarioId);
  if (historicoSeleccionado.value.includes(id)) {
    historicoSeleccionado.value = historicoSeleccionado.value.filter((item) => item !== id);
    return;
  }

  historicoSeleccionado.value = [...historicoSeleccionado.value, id];
}

async function cerrarInventarioSeleccionado() {
  const fincaIdTarget = Number(fincaId.value || 0);
  if (!fincaIdTarget || !historicoSeleccionado.value.length) return;

  loadingCerrarHistorico.value = true;
  error.value = '';
  try {
    const seleccionados = new Set(historicoSeleccionado.value);
    await cosechaService.cerrarInventarioHistorico({
      finca_id: fincaIdTarget,
      motivo: motivoCierreHistorico.value.trim(),
      items: inventarioHistorico.value
        .filter((item) => seleccionados.has(Number(item.calendario_id)))
        .map((item) => ({
          calendario_id: Number(item.calendario_id),
          cantidad_ajustada: Number(item.saldo_en_campo || 0),
        })),
    });
    motivoCierreHistorico.value = '';
    await cargarInventarioHistorico();
    await generarDiagnostico();
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudo cerrar inventario histórico';
  } finally {
    loadingCerrarHistorico.value = false;
  }
}

onMounted(async () => {
  await fincaStore.obtenerFincas();
  fincaFumigacionId.value = fincaId.value;
  await cargarAlertas();
});

watch(fincaId, (next) => {
  fincaFumigacionId.value = next;
  inventarioHistorico.value = [];
  historicoSeleccionado.value = [];
});
</script>

<style scoped>
.historico-table {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 8px;
}

.historico-color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.28);
  border-radius: 50%;
}

.historico-selector {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-on-primary));
  background: transparent;
  border: 2px solid rgba(var(--v-border-color), 0.42);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.historico-selector:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.2);
}

.historico-selector--active {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>
