<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { ConflictoConteo } from '@/composables/useRegistroCosecha';

const props = defineProps<{
  conflictos: ConflictoConteo[];
  corregir: (id: number, buenos: number, rechazo: number) => boolean;
  consultadoEn: number | null;
  copiaLocal: boolean;
  aviso: string;
  errorCopia: string;
  bloqueado: boolean;
  preparando: boolean;
  fincaId: number | null;
  hayRespaldo: boolean;
}>();
defineEmits<{ preparar: []; exportar: [] }>();
const seleccion = ref<number | null>(null);
const buenos = ref<number | string>(0);
const rechazo = ref<number | string>(0);
const error = ref('');
const activo = computed(() => props.conflictos.find(c => c.calendario_id === seleccion.value));
const fechaCopia = computed(() => props.consultadoEn ? new Date(props.consultadoEn).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }) : 'Sin inventario descargado');
const valoresValidos = computed(() => [buenos.value, rechazo.value].every(n => n !== '' && Number.isSafeInteger(Number(n)) && Number(n) >= 0)
  && Number(buenos.value) + Number(rechazo.value) <= (activo.value?.saldo ?? 0));
watch(() => props.fincaId, () => { seleccion.value = null; });

function abrir(item: ConflictoConteo) {
  seleccion.value = item.calendario_id;
  buenos.value = item.buenos;
  rechazo.value = item.rechazo;
  error.value = '';
}
function guardar() {
  if (!activo.value || props.bloqueado) return;
  const retirar = activo.value.saldo === null;
  if (!retirar && !valoresValidos.value) return;
  if (props.corregir(activo.value.calendario_id, retirar ? 0 : Number(buenos.value), retirar ? 0 : Number(rechazo.value))) seleccion.value = null;
  else error.value = 'No se pudo guardar la corrección. El conteo original sigue protegido; revisa el aviso de almacenamiento.';
}
</script>

<template>
  <section class="recovery-panel" aria-label="Protección del conteo">
    <v-alert v-if="conflictos.length" type="warning" variant="tonal" class="mb-3 conflict-alert">
      <div class="font-weight-bold">Tu conteo se conserva: {{ conflictos.length }} {{ conflictos.length === 1 ? 'diferencia de inventario' : 'diferencias de inventario' }}</div>
      <div class="text-body-2 mt-1">Revisa estas cintas antes de enviar. No se han recortado las cantidades.</div>
      <div v-for="item in conflictos" :key="item.calendario_id" class="conflict-row">
        <div class="conflict-copy">
          <strong>{{ item.nombre }}</strong>
          <div>{{ item.buenos }} buenos · {{ item.rechazo }} rechazos</div>
          <div>{{ item.saldo === null ? 'Fuera del inventario disponible. Requiere revisión.' : `Saldo disponible: ${item.saldo}` }}</div>
        </div>
        <v-btn size="small" variant="outlined" :disabled="bloqueado" @click="abrir(item)">Revisar</v-btn>
      </div>
      <v-btn size="small" variant="text" prepend-icon="mdi-download" @click="$emit('exportar')">Descargar respaldo</v-btn>
    </v-alert>

    <div class="offline-bar">
      <v-icon :icon="copiaLocal ? 'mdi-database' : 'mdi-content-save-check'" size="20" aria-hidden="true" />
      <div class="offline-copy">
        <strong class="text-body-2">{{ copiaLocal ? 'Inventario local' : 'Preparación para campo' }}</strong>
        <div class="text-caption">{{ consultadoEn ? `Última consulta: ${fechaCopia}` : fechaCopia }}</div>
      </div>
      <v-btn size="small" variant="outlined" :loading="preparando" :disabled="bloqueado || !fincaId" @click="$emit('preparar')">Preparar sin conexión</v-btn>
      <v-btn v-if="hayRespaldo && !conflictos.length" size="small" variant="text" prepend-icon="mdi-download" @click="$emit('exportar')">Respaldo original</v-btn>
    </div>
    <p v-if="copiaLocal" class="text-caption mt-2">Estos saldos son una copia local. El servidor los validará al sincronizar.</p>
    <v-alert v-if="errorCopia || aviso" :type="errorCopia ? 'warning' : 'info'" variant="tonal" density="compact" class="mt-2" aria-live="polite">{{ errorCopia || aviso }}</v-alert>

    <v-dialog :model-value="Boolean(activo)" max-width="480" @update:model-value="!$event && (seleccion = null)">
      <v-card v-if="activo" rounded="lg" title="Revisar conteo">
        <v-card-text>
          <p class="font-weight-bold mb-2">{{ activo.nombre }}</p>
          <p class="text-body-2 mb-4">Original: {{ activo.buenos }} buenos y {{ activo.rechazo }} rechazos. Se conservará un respaldo antes de aplicar cambios.</p>
          <template v-if="activo.saldo !== null">
            <p class="mb-3">Saldo disponible: <strong>{{ activo.saldo }}</strong></p>
            <div class="correction-fields">
              <v-text-field v-model="buenos" label="Buenos" type="number" inputmode="numeric" min="0" step="1" variant="outlined" />
              <v-text-field v-model="rechazo" label="Rechazos" type="number" inputmode="numeric" min="0" step="1" variant="outlined" />
            </div>
            <p v-if="!valoresValidos" class="text-error text-body-2">Introduce cantidades enteras cuya suma no supere el saldo.</p>
          </template>
          <p v-else>Esta cinta ya no está en el inventario visible. Puedes volver con conexión para consultar el saldo o retirarla de este borrador conservando el respaldo.</p>
          <v-alert v-if="error" type="error" class="mt-3">{{ error }}</v-alert>
        </v-card-text>
        <v-card-actions class="correction-actions">
          <v-btn @click="seleccion = null">Volver</v-btn>
          <v-btn color="primary" variant="flat" :disabled="bloqueado || (activo.saldo !== null && !valoresValidos)" @click="guardar">{{ activo.saldo === null ? 'Retirar y respaldar' : 'Guardar corrección' }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.recovery-panel { margin-block: 16px; }
.conflict-alert :deep(.v-alert__content) { color: rgb(var(--v-theme-on-surface)); }
.offline-bar, .conflict-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.offline-bar { border-block: 1px solid rgba(var(--v-theme-on-surface), 0.12); padding-block: 12px; }
.offline-copy, .conflict-copy { flex: 1 1 180px; min-width: 0; overflow-wrap: anywhere; }
.conflict-row { border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12); padding-block: 12px; margin-top: 12px; font-size: 14px; }
.correction-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.correction-actions { flex-wrap: wrap; justify-content: flex-end; padding: 12px 16px; }
</style>
