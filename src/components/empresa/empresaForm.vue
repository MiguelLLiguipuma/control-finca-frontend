<template>
  <div class="form-container">
    <v-alert v-if="empresaStore.error" type="error" variant="tonal" class="mb-4" role="alert" aria-live="assertive">
      {{ empresaStore.error }}
    </v-alert>

    <v-form ref="formRef" v-model="formValido" validate-on="input" @submit.prevent="handleSubmit">
      <v-row dense>
        <v-col cols="12">
          <div class="field-wrapper">
            <label class="input-label" for="empresa-nombre">Nombre Legal de la Empresa <span class="required">*</span></label>
            <v-text-field
              id="empresa-nombre"
              v-model.trim="form.nombre"
              :rules="[rules.required, rules.min]"
              placeholder="Ej: AgroExport S.A."
              prepend-inner-icon="mdi-office-building-outline"
              variant="solo"
              flat
              density="comfortable"
              class="modern-input"
              color="primary"
              maxlength="120"
              autocomplete="organization"
            />
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <div class="field-wrapper">
            <label class="input-label" for="empresa-ruc">RUC / Identificacion</label>
            <v-text-field
              id="empresa-ruc"
              v-model="form.ruc"
              :rules="[rules.ruc]"
              placeholder="0999999999001"
              maxlength="13"
              prepend-inner-icon="mdi-card-account-details-outline"
              variant="solo"
              flat
              density="comfortable"
              class="modern-input"
              @update:model-value="onRucInput"
              inputmode="numeric"
            />
          </div>
        </v-col>

        <v-col cols="12" md="6">
          <div class="field-wrapper">
            <label class="input-label" for="empresa-telefono">Telefono</label>
            <v-text-field
              id="empresa-telefono"
              v-model="form.telefono"
              :rules="[rules.telefono]"
              placeholder="+593 9..."
              maxlength="20"
              prepend-inner-icon="mdi-phone-outline"
              variant="solo"
              flat
              density="comfortable"
              class="modern-input"
              @update:model-value="onTelefonoInput"
              autocomplete="tel"
            />
          </div>
        </v-col>

        <v-col cols="12">
          <div class="field-wrapper">
            <label class="input-label" for="empresa-direccion">Direccion Matriz</label>
            <v-textarea
              id="empresa-direccion"
              v-model.trim="form.direccion"
              :rules="[rules.direccion]"
              placeholder="Indique calle principal, secundaria y referencia..."
              prepend-inner-icon="mdi-map-marker-outline"
              variant="solo"
              flat
              density="comfortable"
              rows="2"
              no-resize
              class="modern-input"
              maxlength="220"
              autocomplete="street-address"
            />
          </div>
        </v-col>
      </v-row>

      <footer class="form-actions d-flex align-center justify-end mt-4">
        <v-btn
          variant="text"
          color="medium-emphasis"
          class="rounded-xl px-6 mr-2 font-weight-bold text-none"
          aria-label="Cancelar formulario de empresa"
          @click="$emit('cancel')"
        >
          Cancelar
        </v-btn>

        <v-btn
          :color="mode === 'create' ? 'primary' : 'warning'"
          height="48"
          min-width="170"
          class="rounded-xl font-weight-black text-none shadow-btn"
          :loading="empresaStore.loading"
          :disabled="empresaStore.loading"
          type="submit"
          :aria-busy="empresaStore.loading"
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

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useEmpresaStore, type EmpresaPayload } from '@/stores/empresaStore';

type FormMode = 'create' | 'edit';

interface EmpresaFormData {
  id?: number;
  nombre?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
}

const props = withDefaults(
  defineProps<{
    mode?: FormMode;
    initialData?: EmpresaFormData | null;
  }>(),
  {
    mode: 'create',
    initialData: null,
  },
);

const emit = defineEmits<{
  (e: 'submit-success'): void;
  (e: 'cancel'): void;
}>();

const empresaStore = useEmpresaStore();
const formRef = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null);
const formValido = ref(false);

const form = reactive({
  nombre: '',
  ruc: '',
  direccion: '',
  telefono: '',
});

const rules = {
  required: (v: string) => !!v?.trim() || 'Dato requerido',
  min: (v: string) => (v?.trim()?.length ?? 0) >= 3 || 'Minimo 3 caracteres',
  ruc: (v: string) => !v || /^\d{10,13}$/.test(v) || 'RUC invalido (10 a 13 digitos)',
  telefono: (v: string) =>
    !v || /^[+0-9()\-\s]{7,20}$/.test(v) || 'Telefono invalido',
  direccion: (v: string) =>
    !v || v.trim().length >= 6 || 'Direccion muy corta (minimo 6 caracteres)',
};

function resetForm() {
  form.nombre = '';
  form.ruc = '';
  form.direccion = '';
  form.telefono = '';
}

function hydrateForm(val: EmpresaFormData | null) {
  if (!val) {
    resetForm();
    return;
  }

  form.nombre = val.nombre ?? '';
  form.ruc = (val.ruc ?? '').replace(/\D/g, '').slice(0, 13);
  form.direccion = val.direccion ?? '';
  form.telefono = val.telefono ?? '';
}

function onRucInput() {
  form.ruc = (form.ruc || '').replace(/\D/g, '').slice(0, 13);
}

function onTelefonoInput() {
  form.telefono = (form.telefono || '').replace(/[^+0-9()\-\s]/g, '').slice(0, 20);
}

function toPayload(): EmpresaPayload {
  const payload: EmpresaPayload = {
    nombre: form.nombre.trim(),
  };

  const ruc = form.ruc.trim();
  const direccion = form.direccion.trim();
  const telefono = form.telefono.trim();

  if (ruc) payload.ruc = ruc;
  if (direccion) payload.direccion = direccion;
  if (telefono) payload.telefono = telefono;

  return payload;
}

watch(
  () => props.initialData,
  (val) => {
    hydrateForm(val);
  },
  { immediate: true },
);

watch(
  () => props.mode,
  () => {
    if (props.mode === 'create' && !props.initialData) {
      resetForm();
    }
  },
);

async function handleSubmit() {
  const validation = await formRef.value?.validate();
  if (!validation?.valid) return;

  try {
    const payload = toPayload();
    if (props.mode === 'create') {
      await empresaStore.crearEmpresa(payload);
    } else {
      const empresaId = Number(props.initialData?.id);
      if (!empresaId) {
        throw new Error('No se encontro la empresa a editar.');
      }
      await empresaStore.actualizarEmpresa(empresaId, payload);
    }
    emit('submit-success');
  } catch {
    // Error ya centralizado en empresaStore.error
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
