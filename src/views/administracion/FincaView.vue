<template>
  <v-container class="pa-4 pt-6 bg-background min-h-screen">
    <v-row justify="center">
      <v-col cols="12" lg="10">
        
        <div class="mb-8 d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-black text-high-emphasis">Gestión de Fincas</h1>
            <p class="text-medium-emphasis">Administra tus fincas y conéctalas con el sistema de clima</p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            size="large"
            class="rounded-xl font-weight-bold shadow-btn"
            @click="dialog = true"
          >
            Nueva Finca
          </v-btn>
        </div>

        <v-card border variant="flat" class="rounded-xl shadow-sm">
          <v-data-table
            :headers="headers"
            :items="fincaStore.fincas"
            :loading="fincaStore.loading || empresaStore.loading"
            hover
          >
            <template v-slot:item.empresa_nombre="{ item }">
              <v-chip color="secondary" size="small" variant="tonal" class="font-weight-bold">
                {{ item.empresa_nombre }}
              </v-chip>
            </template>
            <template v-slot:item.clima="{ item }">
              <v-icon :color="item.latitud ? 'success' : 'grey'" size="small">
                {{ item.latitud ? 'mdi-weather-cloudy' : 'mdi-weather-cloudy-off' }}
              </v-icon>
            </template>
          </v-data-table>
        </v-card>

        <v-dialog v-model="dialog" max-width="600px" persistent>
          <v-card class="rounded-xl pa-4">
            <v-card-title class="text-h5 font-weight-black">Configurar Nueva Finca</v-card-title>
            
            <v-card-text>
              <v-form ref="formRef" v-model="isFormValid">
                <v-row dense>
                  <v-col cols="12">
                    <label class="custom-label">Nombre de la Finca</label>
                    <v-text-field
                      v-model="formData.nombre"
                      placeholder="Ej. Hacienda La Esperanza"
                      variant="solo-filled"
                      flat rounded="lg"
                      :rules="[v => !!v || 'Campo requerido']"
                      prepend-inner-icon="mdi-domain"
                    />
                  </v-col>

                  <v-col cols="12">
                    <label class="custom-label">Empresa Responsable</label>
                    <v-select
                      v-model="formData.empresa_id"
                      :items="empresaStore.empresas"
                      item-title="nombre"
                      item-value="id"
                      placeholder="Selecciona una empresa"
                      variant="solo-filled"
                      flat rounded="lg"
                      :rules="[v => !!v || 'Debe seleccionar una empresa']"
                      prepend-inner-icon="mdi-office-building"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-divider class="mb-4 mt-2"></v-divider>
                    <div class="d-flex align-center mb-4">
                      <v-icon color="primary" class="mr-2">mdi-map-marker-radius</v-icon>
                      <span class="text-subtitle-2 font-weight-bold">Ubicación e Inteligencia Climática</span>
                    </div>
                  </v-col>

                  <v-col cols="12" md="6">
                    <label class="custom-label">Latitud</label>
                    <v-text-field
                      v-model.number="formData.latitud"
                      type="number"
                      placeholder="-3.3245"
                      variant="solo-filled"
                      flat rounded="lg"
                      :rules="[v => v !== null || 'Requerido para el clima']"
                      prepend-inner-icon="mdi-latitude"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <label class="custom-label">Longitud</label>
                    <v-text-field
                      v-model.number="formData.longitud"
                      type="number"
                      placeholder="-79.8083"
                      variant="solo-filled"
                      flat rounded="lg"
                      :rules="[v => v !== null || 'Requerido para el clima']"
                      prepend-inner-icon="mdi-longitude"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-btn
                      block
                      variant="tonal"
                      color="secondary"
                      class="rounded-lg mb-4"
                      prepend-icon="mdi-crosshairs-gps"
                      @click="obtenerCoordenadas"
                      :loading="loadingGPS"
                    >
                      Capturar Ubicación Actual (GPS)
                    </v-btn>
                  </v-col>

                  <v-col cols="12">
                    <label class="custom-label">Ciudad / Sector</label>
                    <v-text-field
                      v-model="formData.ubicacion"
                      placeholder="Ej. Pasaje, Km 25"
                      variant="solo-filled"
                      flat rounded="lg"
                      :rules="[v => !!v || 'La ubicación es requerida']"
                      prepend-inner-icon="mdi-map-marker"
                    />
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>

            <v-card-actions class="pa-4">
              <v-spacer />
              <v-btn variant="text" class="rounded-lg" @click="cerrarDialogo">Cancelar</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                class="rounded-lg px-8 font-weight-bold"
                :loading="fincaStore.loading"
                :disabled="!isFormValid"
                @click="guardarFinca"
              >
                Confirmar y Activar Clima
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useFincaStore } from '@/stores/fincaStore';
import { useEmpresaStore } from '@/stores/empresaStore';

const fincaStore = useFincaStore();
const empresaStore = useEmpresaStore();

const formRef = ref(null);
const dialog = ref(false);
const isFormValid = ref(false);
const loadingGPS = ref(false);

const formData = ref({
  nombre: '',
  empresa_id: null,
  ubicacion: '',
  latitud: null,
  longitud: null
});

const headers = [
  { title: 'NOMBRE DE FINCA', key: 'nombre', align: 'start' },
  { title: 'EMPRESA', key: 'empresa_nombre', align: 'start' },
  { title: 'UBICACIÓN', key: 'ubicacion', align: 'start' },
  { title: 'CLIMA', key: 'clima', align: 'center', sortable: false },
];

const obtenerCoordenadas = () => {
  loadingGPS.value = true;
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización");
    loadingGPS.value = false;
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      formData.value.latitud = pos.coords.latitude;
      formData.value.longitud = pos.coords.longitude;
      loadingGPS.value = false;
    },
    (err) => {
      alert("No se pudo obtener la ubicación. Verifica los permisos de tu navegador.");
      loadingGPS.value = false;
    }
  );
};

const cerrarDialogo = () => {
  dialog.value = false;
  formData.value = { nombre: '', empresa_id: null, ubicacion: '', latitud: null, longitud: null };
  formRef.value?.reset();
};

const guardarFinca = async () => {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  try {
    await fincaStore.crearFinca({ ...formData.value });
    cerrarDialogo();
  } catch (error) {
    console.error("Error al guardar finca:", error);
  }
};

onMounted(async () => {
  await empresaStore.fetchEmpresas();
  await fincaStore.obtenerFincas();
});
</script>

<style scoped>
.custom-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-transform: uppercase;
}
.shadow-btn {
  box-shadow: 0 8px 16px -4px rgba(var(--v-theme-primary), 0.3) !important;
}
</style>