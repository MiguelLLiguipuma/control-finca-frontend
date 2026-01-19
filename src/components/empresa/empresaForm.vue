<template>
  <div class="form-container">
    <v-form ref="formRef" v-model="formValido" validate-on="input" @submit.prevent="handleSubmit">
      <v-row dense>
        <v-col cols="12">
          <div class="field-wrapper">
            <label class="input-label">Nombre Legal de la Empresa <span class="required">*</span></label>
            <v-text-field
              v-model="form.nombre"
              :rules="[rules.required, rules.min]"
              placeholder="Ej: AgroExport S.A."
              prepend-inner-icon="mdi-office-building-outline"
              variant="solo"
              flat
              density="comfortable"
              class="modern-input"
              color="primary"
            />
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <div class="field-wrapper">
            <label class="input-label">RUC / Identificación</label>
            <v-text-field
              v-model="form.ruc"
              :rules="[rules.ruc]"
              placeholder="0999999999001"
              maxlength="13"
              prepend-inner-icon="mdi-card-account-details-outline"
              variant="solo"
              flat
              density="comfortable"
              class="modern-input"
            />
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <div class="field-wrapper">
            <label class="input-label">Teléfono</label>
            <v-text-field
              v-model="form.telefono"
              placeholder="+593 9..."
              prepend-inner-icon="mdi-phone-outline"
              variant="solo"
              flat
              density="comfortable"
              class="modern-input"
            />
          </div>
        </v-col>

        <v-col cols="12">
          <div class="field-wrapper">
            <label class="input-label">Dirección Matriz</label>
            <v-textarea
              v-model="form.direccion"
              placeholder="Indique calle principal, secundaria y referencia..."
              prepend-inner-icon="mdi-map-marker-outline"
              variant="solo"
              flat
              density="comfortable"
              rows="2"
              no-resize
              class="modern-input"
            />
          </div>
        </v-col>
      </v-row>

      <footer class="form-actions d-flex align-center justify-end mt-4">
        <v-btn
          variant="text"
          color="medium-emphasis"
          class="rounded-xl px-6 mr-2 font-weight-bold text-none"
          @click="$emit('cancel')"
        >
          Cancelar
        </v-btn>
        
        <v-btn
          :color="mode === 'create' ? 'primary' : 'warning'"
          height="48"
          min-width="160"
          class="rounded-xl font-weight-black text-none shadow-btn"
          :loading="empresaStore.loading"
          type="submit"
          elevation="0"
        >
          {{ mode === 'create' ? 'Guardar Empresa' : 'Actualizar Cambios' }}
          <v-icon end size="20" class="ml-2">
            {{ mode === 'create' ? 'mdi-plus-circle' : 'mdi-content-save-check' }}
          </v-icon>
        </v-btn>
      </footer>
    </v-form>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import { useEmpresaStore } from '@/stores/empresaStore';

const props = defineProps({
  mode: { type: String, default: 'create' },
  initialData: { type: Object, default: () => null },
});

const emit = defineEmits(['submit-success', 'cancel']);
const empresaStore = useEmpresaStore();
const formRef = ref(null);
const formValido = ref(false);

const form = reactive({
  nombre: '',
  ruc: '',
  direccion: '',
  telefono: '',
});

const rules = {
  required: v => !!v?.trim() || 'Dato necesario',
  min: v => v?.length >= 3 || 'Nombre muy corto',
  ruc: v => !v || /^\d{10,13}$/.test(v) || 'Formato de RUC inválido (10-13 dígitos)'
};

watch(() => props.initialData, (val) => {
  if (val) Object.assign(form, { ...val });
}, { immediate: true });

async function handleSubmit() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;

  try {
    if (props.mode === 'create') {
      await empresaStore.crearEmpresa({ ...form });
    } else {
      await empresaStore.actualizarEmpresa(props.initialData.id, { ...form });
    }
    emit('submit-success');
  } catch (err) {
    console.error("Error en operación:", err);
  }
}
</script>

<style scoped>
.form-container {
  background: transparent;
}

.input-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 8px;
  margin-left: 4px;
}

.required {
  color: rgb(var(--v-theme-error));
  margin-left: 2px;
}

/* Diseño de Input Moderno Adaptable */
:deep(.v-field) {
  border-radius: 14px !important;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(var(--v-border-color), 0.15) !important;
  background-color: rgba(var(--v-theme-on-surface), 0.04) !important;
}

:deep(.v-field__outline) {
  display: none;
}

:deep(.v-field--focused) {
  background-color: rgb(var(--v-theme-surface)) !important;
  border-color: rgb(var(--v-theme-primary)) !important;
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.12) !important;
}

:deep(.v-field__input) {
  font-size: 0.95rem;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

:deep(.v-field__prepend-inner .v-icon) {
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  margin-right: 8px;
}

.form-actions {
  border-top: 1px solid rgba(var(--v-border-color), 0.1);
  padding-top: 24px;
}

.shadow-btn {
  box-shadow: 0 8px 20px -6px rgba(var(--v-theme-primary), 0.4) !important;
}
</style>