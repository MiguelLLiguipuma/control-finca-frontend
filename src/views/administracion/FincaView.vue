<template>
  <v-container class="pa-4 pt-6 bg-background min-h-screen">
    <v-row justify="center">
      <v-col cols="12" lg="10">
        
        <div class="mb-8 d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-black text-high-emphasis">Gestión de Fincas</h1>
            <p class="text-medium-emphasis">Administra tus fincas y conéctalas con las empresas registradas</p>
          </div>
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            size="large"
            class="rounded-xl font-weight-bold"
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
          </v-data-table>
        </v-card>

        <v-dialog v-model="dialog" max-width="550px" persistent>
          <v-card class="rounded-xl pa-4">
            <v-card-title class="text-h5 font-weight-black">Nueva Finca</v-card-title>
            
            <v-card-text>
              <v-form ref="formRef" v-model="isFormValid">
                <v-row>
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
                      :loading="empresaStore.loading"
                      :rules="[v => !!v || 'Debe seleccionar una empresa']"
                      prepend-inner-icon="mdi-office-building"
                    />
                  </v-col>

                  <v-col cols="12">
                    <label class="custom-label">Ubicación / Sector</label>
                    <v-text-field
                      v-model="formData.ubicacion"
                      placeholder="Ej. Km 25 Vía Pasaje"
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
              <v-btn variant="text" @click="cerrarDialogo">Cancelar</v-btn>
              <v-btn
                color="primary"
                variant="flat"
                class="rounded-lg px-8 font-weight-bold"
                :loading="fincaStore.loading"
                :disabled="!isFormValid"
                @click="guardarFinca"
              >
                Guardar Finca
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

const formData = ref({
  nombre: '',
  empresa_id: null,
  ubicacion: ''
});

const headers = [
  { title: 'NOMBRE DE FINCA', key: 'nombre', align: 'start' },
  { title: 'EMPRESA', key: 'empresa_nombre', align: 'start' },
  { title: 'UBICACIÓN', key: 'ubicacion', align: 'start' },
];

const cerrarDialogo = () => {
  dialog.value = false;
  // Limpieza manual del objeto para evitar que queden datos al abrir de nuevo
  formData.value = { nombre: '', empresa_id: null, ubicacion: '' };
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
  // Cargamos en orden para asegurar que el mapeo de nombres funcione
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
</style>