<template>
  <v-container class="finca-page pa-4 pa-md-6">
    <v-row justify="center">
      <v-col cols="12" xl="11">
        <v-card class="hero-card rounded-xl mb-5" border>
          <v-card-text class="d-flex flex-wrap align-center ga-4 py-5">
            <v-avatar size="58" color="primary" variant="tonal">
              <v-icon size="32">mdi-map-marker-multiple</v-icon>
            </v-avatar>

            <div class="flex-grow-1">
              <h1 class="text-h4 font-weight-black text-high-emphasis">Gestion de Fincas</h1>
              <div class="text-body-1 text-medium-emphasis">
                Administra ubicacion, seleccion activa y cobertura climatica por finca.
              </div>
            </div>

            <div class="d-flex align-center ga-2">
              <v-btn
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-refresh"
                :loading="fincaStore.loading"
                aria-label="Actualizar datos de fincas"
                @click="recargarDatos"
              >
                Actualizar
              </v-btn>

              <v-btn
                color="primary"
                prepend-icon="mdi-plus"
                class="font-weight-bold"
                :disabled="!canManage"
                aria-label="Crear nueva finca"
                @click="abrirDialogo"
              >
                Nueva Finca
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-row dense class="mb-4">
          <v-col cols="12" sm="6" lg="3">
            <v-card class="kpi-card rounded-xl" color="surface" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Total Fincas</div>
                <div class="text-h4 font-weight-black">{{ totalFincas }}</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <v-card class="kpi-card rounded-xl" color="surface" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Con Clima</div>
                <div class="text-h4 font-weight-black text-success">{{ fincasConClima }}</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <v-card class="kpi-card rounded-xl" color="surface" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Sin Coordenadas</div>
                <div class="text-h4 font-weight-black text-warning">{{ fincasSinClima }}</div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6" lg="3">
            <v-card class="kpi-card rounded-xl" color="surface" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Finca Activa</div>
                <div class="text-subtitle-1 font-weight-bold text-truncate">
                  {{ fincaActivaNombre }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card class="rounded-xl" border>
          <v-card-text class="pb-2">
            <v-row dense>
              <v-col cols="12" md="5">
                <v-text-field
                  v-model.trim="search"
                  aria-label="Buscar fincas"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                  placeholder="Buscar por finca, empresa o ubicacion"
                />
              </v-col>

              <v-col cols="12" md="4">
                <v-select
                  v-model="empresaFiltroId"
                  :items="empresaFilterItems"
                  item-title="label"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  label="Empresa"
                  aria-label="Filtrar por empresa"
                />
              </v-col>

              <v-col cols="12" md="3">
                <v-select
                  v-model="estadoClima"
                  :items="estadoClimaItems"
                  item-title="label"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  label="Cobertura clima"
                  aria-label="Filtrar por cobertura de clima"
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-data-table
            :headers="headers"
            :items="fincasFiltradas"
            :loading="fincaStore.loading || empresaStore.loading"
            loading-text="Cargando fincas..."
            hover
          >
            <template #item.nombre="{ item }">
              <div class="d-flex align-center ga-2">
                <v-icon
                  size="18"
                  :color="item.id === fincaStore.fincaSeleccionadaId ? 'primary' : 'medium-emphasis'"
                >
                  mdi-leaf
                </v-icon>
                <span class="font-weight-bold">{{ item.nombre }}</span>
              </div>
            </template>

            <template #item.empresa_nombre="{ item }">
              <v-chip size="small" color="secondary" variant="tonal" class="font-weight-bold">
                {{ item.empresa_nombre || 'No asignada' }}
              </v-chip>
            </template>

            <template #item.ubicacion="{ item }">
              <span class="text-medium-emphasis">{{ item.ubicacion || 'Sin ubicacion' }}</span>
            </template>

            <template #item.coordenadas="{ item }">
              <div v-if="tieneCoordenadas(item)" class="text-caption">
                <div>{{ formatCoord(item.latitud) }}</div>
                <div>{{ formatCoord(item.longitud) }}</div>
              </div>
              <span v-else class="text-warning font-weight-bold text-caption">Pendiente</span>
            </template>

            <template #item.clima="{ item }">
              <v-chip
                size="small"
                :color="tieneCoordenadas(item) ? 'success' : 'warning'"
                variant="tonal"
                :prepend-icon="tieneCoordenadas(item) ? 'mdi-weather-partly-cloudy' : 'mdi-weather-cloudy-alert'"
              >
                {{ tieneCoordenadas(item) ? 'Activo' : 'Pendiente' }}
              </v-chip>
            </template>

            <template #item.acciones="{ item }">
              <div class="d-flex justify-end ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  color="secondary"
                  :disabled="!canManage"
                  @click="editarFinca(item)"
                >
                  Editar
                </v-btn>
                <v-btn
                  size="small"
                  variant="flat"
                  color="primary"
                  :disabled="fincaStore.fincaSeleccionadaId === item.id"
                  @click="seleccionar(item.id)"
                >
                  {{ fincaStore.fincaSeleccionadaId === item.id ? 'Activa' : 'Seleccionar' }}
                </v-btn>
              </div>
            </template>

            <template #no-data>
              <div class="text-center py-10 text-medium-emphasis">
                No hay fincas que coincidan con los filtros actuales.
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="720" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="text-h5 font-weight-black py-4">
          {{ isEditing ? 'Editar Finca' : 'Nueva Finca' }}
        </v-card-title>
        <v-divider />

        <v-card-text class="pt-5">
          <v-alert v-if="fincaStore.error" type="error" variant="tonal" class="mb-4" role="alert" aria-live="assertive">
            {{ fincaStore.error }}
          </v-alert>

          <v-form ref="formRef" v-model="isFormValid">
            <v-row dense>
              <v-col cols="12">
                <label class="custom-label" for="finca-nombre">Nombre de Finca</label>
                <v-text-field
                  id="finca-nombre"
                  v-model.trim="formData.nombre"
                  variant="outlined"
                  density="comfortable"
                  :rules="nombreRules"
                  prepend-inner-icon="mdi-domain"
                  placeholder="Ej. Hacienda El Paraiso"
                />
              </v-col>

              <v-col cols="12">
                <label class="custom-label" for="finca-empresa">Empresa Responsable</label>
                <v-select
                  id="finca-empresa"
                  v-model="formData.empresa_id"
                  :items="empresaStore.empresas"
                  item-title="nombre"
                  item-value="id"
                  variant="outlined"
                  density="comfortable"
                  :rules="empresaRules"
                  prepend-inner-icon="mdi-office-building"
                  placeholder="Selecciona empresa"
                />
              </v-col>

              <v-col cols="12">
                <label class="custom-label" for="finca-ubicacion">Ubicacion</label>
                <v-text-field
                  id="finca-ubicacion"
                  v-model.trim="formData.ubicacion"
                  variant="outlined"
                  density="comfortable"
                  :rules="ubicacionRules"
                  prepend-inner-icon="mdi-map-marker"
                  placeholder="Ej. Pasaje, sector norte"
                />
              </v-col>

              <v-col cols="12">
                <v-divider class="my-2" />
                <div class="d-flex align-center ga-2 mb-2">
                  <v-icon color="primary">mdi-crosshairs-gps</v-icon>
                  <span class="font-weight-bold">Coordenadas para modulo clima</span>
                </div>
              </v-col>

              <v-col cols="12" md="6">
                <label class="custom-label" for="finca-latitud">Latitud</label>
                <v-text-field
                  id="finca-latitud"
                  v-model.number="formData.latitud"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="latRules"
                  placeholder="-3.324500"
                  inputmode="decimal"
                />
              </v-col>

              <v-col cols="12" md="6">
                <label class="custom-label" for="finca-longitud">Longitud</label>
                <v-text-field
                  id="finca-longitud"
                  v-model.number="formData.longitud"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  :rules="lngRules"
                  placeholder="-79.808300"
                  inputmode="decimal"
                />
              </v-col>

              <v-col cols="12">
                <v-btn
                  block
                  variant="tonal"
                  color="secondary"
                  prepend-icon="mdi-map-marker-radius"
                  :loading="loadingGPS"
                  :aria-busy="loadingGPS"
                  aria-label="Usar ubicación actual para capturar coordenadas"
                  @click="obtenerCoordenadas"
                >
                  Usar mi ubicacion actual
                </v-btn>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" aria-label="Cancelar formulario de finca" @click="cerrarDialogo">Cancelar</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="px-7"
            :loading="fincaStore.loading"
            :disabled="!isFormValid || fincaStore.loading"
            :aria-busy="fincaStore.loading"
            aria-label="Guardar finca"
            @click="guardarFinca"
          >
            {{ isEditing ? 'Guardar Cambios' : 'Guardar' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useFincaStore, type Finca, type FincaPayload } from '@/stores/fincaStore';
import { useEmpresaStore } from '@/stores/empresaStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/auth/authStore';

type EstadoClima = 'all' | 'with' | 'without';

const fincaStore = useFincaStore();
const empresaStore = useEmpresaStore();
const uiStore = useUIStore();
const authStore = useAuthStore();

const formRef = ref<{ validate: () => Promise<{ valid: boolean }>; resetValidation: () => void } | null>(null);
const dialog = ref(false);
const isFormValid = ref(false);
const loadingGPS = ref(false);
const search = ref('');
const empresaFiltroId = ref<number>(0);
const estadoClima = ref<EstadoClima>('all');
const editingId = ref<number | null>(null);

const canManage = computed(() => authStore.can('action.admin.manage'));
const isEditing = computed(() => editingId.value !== null);

const headers = [
  { title: 'FINCA', key: 'nombre', align: 'start' as const },
  { title: 'EMPRESA', key: 'empresa_nombre', align: 'start' as const },
  { title: 'UBICACION', key: 'ubicacion', align: 'start' as const },
  { title: 'COORDENADAS', key: 'coordenadas', align: 'start' as const, sortable: false },
  { title: 'CLIMA', key: 'clima', align: 'center' as const, sortable: false },
  { title: 'ACCIONES', key: 'acciones', align: 'end' as const, sortable: false },
];

const estadoClimaItems = [
  { label: 'Todos', value: 'all' as const },
  { label: 'Con clima', value: 'with' as const },
  { label: 'Sin clima', value: 'without' as const },
];

const formData = ref<FincaPayload>({
  nombre: '',
  empresa_id: 0,
  ubicacion: '',
  latitud: null,
  longitud: null,
});

const empresaFilterItems = computed(() => [
  { label: 'Todas las empresas', value: 0 },
  ...empresaStore.empresas.map((e) => ({ label: e.nombre, value: e.id })),
]);

const totalFincas = computed(() => fincaStore.fincas.length);

const fincasConClima = computed(
  () => fincaStore.fincas.filter((f) => f.latitud !== null && f.longitud !== null).length,
);

const fincasSinClima = computed(() => totalFincas.value - fincasConClima.value);

const fincaActivaNombre = computed(() => {
  return fincaStore.fincaSeleccionada?.nombre || 'Sin seleccionar';
});

const fincasFiltradas = computed(() => {
  const q = search.value.trim().toLowerCase();

  return fincaStore.fincas.filter((finca) => {
    if (empresaFiltroId.value > 0 && finca.empresa_id !== empresaFiltroId.value) return false;

    const tieneClima = finca.latitud !== null && finca.longitud !== null;
    if (estadoClima.value === 'with' && !tieneClima) return false;
    if (estadoClima.value === 'without' && tieneClima) return false;

    if (!q) return true;
    return [finca.nombre, finca.empresa_nombre || '', finca.ubicacion || ''].join(' ').toLowerCase().includes(q);
  });
});

const nombreRules = [
  (v: string) => !!v?.trim() || 'Nombre requerido',
  (v: string) => v.trim().length >= 3 || 'Minimo 3 caracteres',
];

const empresaRules = [(v: number) => Number(v) > 0 || 'Seleccione una empresa'];

const ubicacionRules = [
  (v: string) => !!v?.trim() || 'Ubicacion requerida',
  (v: string) => v.trim().length >= 4 || 'Minimo 4 caracteres',
];

const latRules = [
  (v: number | null) => v !== null || 'Latitud requerida',
  (v: number | null) => (v === null || (v >= -90 && v <= 90)) || 'Latitud fuera de rango (-90 a 90)',
];

const lngRules = [
  (v: number | null) => v !== null || 'Longitud requerida',
  (v: number | null) => (v === null || (v >= -180 && v <= 180)) || 'Longitud fuera de rango (-180 a 180)',
];

function tieneCoordenadas(item: Finca): boolean {
  return item.latitud !== null && item.longitud !== null;
}

function formatCoord(value: number | null): string {
  if (value === null) return '-';
  return value.toFixed(6);
}

function abrirDialogo() {
  if (!canManage.value) {
    uiStore.showWarning('No tiene permisos para crear fincas.');
    return;
  }
  editingId.value = null;
  resetForm();
  dialog.value = true;
}

function editarFinca(item: Finca) {
  if (!canManage.value) {
    uiStore.showWarning('No tiene permisos para editar fincas.');
    return;
  }

  editingId.value = item.id;
  formData.value = {
    nombre: item.nombre,
    empresa_id: item.empresa_id,
    ubicacion: item.ubicacion || '',
    latitud: item.latitud,
    longitud: item.longitud,
  };
  dialog.value = true;
}

function resetForm() {
  formData.value = {
    nombre: '',
    empresa_id: 0,
    ubicacion: '',
    latitud: null,
    longitud: null,
  };
}

function cerrarDialogo() {
  dialog.value = false;
  editingId.value = null;
  resetForm();
  formRef.value?.resetValidation();
}

function seleccionar(id: number) {
  fincaStore.seleccionarFinca(id);
  uiStore.showSuccess('Finca activa actualizada.');
}

async function recargarDatos() {
  const [empresas, fincas] = await Promise.allSettled([
    empresaStore.fetchEmpresas(),
    fincaStore.obtenerFincas(),
  ]);

  if (empresas.status === 'rejected') uiStore.showError('No se pudieron cargar empresas.');
  if (fincas.status === 'rejected') uiStore.showError('No se pudieron cargar fincas.');
}

function obtenerCoordenadas() {
  if (!navigator.geolocation) {
    uiStore.showError('El navegador no soporta geolocalizacion.');
    return;
  }

  loadingGPS.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      formData.value.latitud = Number(pos.coords.latitude.toFixed(6));
      formData.value.longitud = Number(pos.coords.longitude.toFixed(6));
      loadingGPS.value = false;
      uiStore.showSuccess('Coordenadas capturadas correctamente.');
    },
    (error) => {
      loadingGPS.value = false;
      if (error.code === error.PERMISSION_DENIED) {
        uiStore.showWarning('Permiso de ubicacion denegado. Ingrese coordenadas manualmente.');
        return;
      }
      uiStore.showError('No se pudo obtener ubicacion GPS.');
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
}

async function guardarFinca() {
  const validation = await formRef.value?.validate();
  if (!validation?.valid) return;

  try {
    if (editingId.value) {
      await fincaStore.actualizarFinca(editingId.value, { ...formData.value });
      uiStore.showSuccess('Finca actualizada correctamente.');
    } else {
      await fincaStore.crearFinca({ ...formData.value });
      uiStore.showSuccess('Finca creada correctamente.');
    }
    cerrarDialogo();
  } catch {
    uiStore.showError(
      fincaStore.error ||
        (editingId.value
          ? 'No se pudo actualizar la finca.'
          : 'No se pudo crear la finca.'),
    );
  }
}

onMounted(async () => {
  await recargarDatos();
});
</script>

<style scoped>
.finca-page {
  min-height: calc(100vh - 76px);
}

.hero-card {
  background:
    radial-gradient(circle at 10% 20%, rgba(var(--v-theme-primary), 0.1), transparent 35%),
    radial-gradient(circle at 100% 0%, rgba(var(--v-theme-secondary), 0.08), transparent 40%),
    rgb(var(--v-theme-surface));
}

.kpi-card {
  height: 100%;
}

.custom-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  text-transform: uppercase;
}
</style>
