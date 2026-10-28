<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDisplay } from 'vuetify';
import { useCosechaStore, type PayloadPendienteCosecha } from '@/stores/cosecha/cosechaStore';

const props = defineProps<{
  fincas: { id: number; nombre: string }[];
  errorBorrador?: string;
  hayBorradorAntiguo?: boolean;
}>();
const store = useCosechaStore();
const { xs } = useDisplay();
const abierto = ref(false);
const editando = ref<PayloadPendienteCosecha | null>(null);
const error = ref('');
const ocupado = computed(() => store.submitting || store.sincronizando || Boolean(store.errorAlmacenamiento));
const filas = computed(() => [
  ...store.colaFallida.map(item => ({ item, fallido: true })),
  ...store.colaSincronizacion.map(item => ({ item, fallido: false })),
]);
const total = (item: PayloadPendienteCosecha) => item.detalles.reduce((n, d) => n + d.cantidad_racimos + d.cantidad_rechazo, 0);
const finca = (id: number) => props.fincas.find(item => item.id === id)?.nombre || `Finca ${id}`;
const cinta = (id: number) => {
  const item = store.saldosPendientes.find(item => item.calendario_id === id);
  return item ? `${item.color_cinta} · Semana ${item.semana_enfunde}/${item.anio}` : `Registro de cinta #${id}`;
};

function revisar(item: PayloadPendienteCosecha) {
  editando.value = { ...item, detalles: item.detalles.map(d => ({ ...d })) };
  error.value = '';
}

async function guardarCorreccion() {
  if (!editando.value) return;
  const ok = await store.reintentarFallido(editando.value.id_local, editando.value);
  if (ok) editando.value = null;
  else error.value = 'No se pudo preparar el reenvio. Revisa la fecha, las cantidades enteras y la sesion.';
}

</script>

<template>
  <div class="sync-panel">
    <v-alert v-if="errorBorrador || store.errorAlmacenamiento" type="error" variant="tonal" class="mb-2" role="alert">
      {{ errorBorrador || store.errorAlmacenamiento }}
    </v-alert>
    <v-alert v-if="store.pendientesAntiguos || hayBorradorAntiguo" type="warning" variant="tonal" class="mb-2">
      Hay conteos anteriores sin propietario identificado. Se conservan, pero no se enviarán con esta cuenta automáticamente.
      Solicita revisión técnica para identificar su propietario antes de recuperarlos. No borres los datos del navegador.
    </v-alert>
    <v-alert v-if="error && !abierto" type="error" variant="tonal" class="mb-2">{{ error }}</v-alert>
    <button type="button" class="sync-panel__open" aria-haspopup="dialog" @click="abierto = true">
      <v-icon color="primary">mdi-cellphone-check</v-icon>
      <span class="sync-panel__open-label"><strong>Reportes locales</strong><small>{{ store.colaSincronizacion.length }} pendientes de envío</small></span>
      <span v-if="store.colaFallida.length" class="sync-panel__badge">{{ store.colaFallida.length }} por corregir</span>
      <v-icon size="20">mdi-chevron-right</v-icon>
    </button>
    <v-dialog v-model="abierto" max-width="680" :fullscreen="xs" scrollable :persistent="store.sincronizando || Boolean(editando)" aria-labelledby="sync-panel-title">
      <v-card class="sync-panel__dialog" :rounded="xs ? 0 : 'lg'">
        <div class="sync-panel__header">
          <div><h2 id="sync-panel-title">{{ editando ? 'Corregir reporte' : 'Reportes locales' }}</h2><p>Esta cuenta · Este dispositivo</p></div>
          <v-btn icon="mdi-close" variant="text" aria-label="Cerrar reportes locales" title="Cerrar reportes locales" :disabled="Boolean(editando) || store.sincronizando" @click="abierto = false" />
        </div>
        <v-card-text class="sync-panel__body">
          <v-alert v-if="!store.isOnline" type="warning" variant="tonal" density="compact" class="mb-4">Sin conexión. Los cambios se guardan en este equipo.</v-alert>
          <v-alert v-if="error" type="error" variant="tonal" class="mb-3">{{ error }}</v-alert>
          <div v-if="editando">
            <h3 class="sync-panel__finca">{{ finca(editando.finca_id) }}</h3>
            <v-text-field v-model="editando.fecha" type="date" label="Fecha de corte" variant="outlined" density="comfortable" :disabled="ocupado" />
            <div v-for="detalle in editando.detalles" :key="detalle.calendario_id" class="sync-panel__detalle">
              <span>{{ cinta(detalle.calendario_id) }}</span>
              <v-text-field v-model.number="detalle.cantidad_racimos" type="number" inputmode="numeric" min="0" step="1" label="Buenos" variant="outlined" density="comfortable" :disabled="ocupado" />
              <v-text-field v-model.number="detalle.cantidad_rechazo" type="number" inputmode="numeric" min="0" step="1" label="Rechazos" variant="outlined" density="comfortable" :disabled="ocupado" />
            </div>
            <p class="sync-panel__note">El reenvío conserva la referencia original. Los saldos se validan al sincronizar.</p>
          </div>
          <template v-else>
            <div class="sync-panel__summary"><span><strong>{{ store.colaSincronizacion.length }}</strong> pendientes</span><span><strong>{{ store.colaFallida.length }}</strong> por corregir</span></div>
            <div v-if="!filas.length" class="sync-panel__empty"><v-icon color="success" size="40">mdi-check-circle-outline</v-icon><strong>Todo al día</strong><p>No hay reportes pendientes en este equipo.</p></div>
            <article v-for="fila in filas" :key="fila.item.id_local" class="sync-panel__fila">
              <div class="sync-panel__row-head"><h3>{{ finca(fila.item.finca_id) }}</h3><v-chip size="small" :color="fila.fallido ? 'error' : 'warning'" variant="tonal">{{ fila.fallido ? 'Por corregir' : 'Pendiente' }}</v-chip></div>
              <div class="sync-panel__row-meta"><span>{{ fila.item.fecha }}</span><strong>{{ total(fila.item) }} racimos</strong></div>
              <p v-if="fila.item.ultimoError" class="sync-panel__error">{{ fila.item.ultimoError }}</p>
              <div class="sync-panel__row-footer">
                <details class="sync-panel__reference"><summary>Referencia</summary><small>{{ fila.item.id_local }}</small></details>
                <v-btn v-if="fila.fallido" color="primary" variant="tonal" :disabled="ocupado" @click="revisar(fila.item)">Corregir</v-btn>
              </div>
            </article>
          </template>
        </v-card-text>
        <v-card-actions class="sync-panel__footer">
          <template v-if="editando">
            <v-btn variant="text" :disabled="ocupado" @click="editando = null; error = ''">Cancelar</v-btn>
            <v-btn color="primary" variant="flat" :disabled="ocupado" :loading="store.sincronizando" @click="guardarCorreccion">{{ store.isOnline ? 'Guardar y reintentar' : 'Guardar corrección' }}</v-btn>
          </template>
          <template v-else>
            <v-btn :disabled="store.sincronizando" @click="abierto = false">Cerrar</v-btn>
            <v-btn color="primary" variant="flat" :disabled="ocupado || !store.isOnline || !store.colaSincronizacion.length" :loading="store.sincronizando" @click="store.sincronizarCola()">Sincronizar</v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.sync-panel { margin-bottom: 12px; }
.sync-panel__open { width: 100%; min-height: 72px; padding: 12px; display: flex; gap: 10px; align-items: center; text-align: left; color: rgb(var(--v-theme-on-surface)); border: 1px solid rgba(var(--v-border-color), .18); border-radius: 8px; background: rgb(var(--v-theme-surface)); }
.sync-panel__open:hover { border-color: rgb(var(--v-theme-primary)); }
.sync-panel__open:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
.sync-panel__open-label { display: grid; gap: 3px; flex: 1; min-width: 0; font-size: 14px; }
.sync-panel__open-label small { font-size: 12px; color: rgba(var(--v-theme-on-surface), .7); }
.sync-panel__badge { color: rgb(var(--v-theme-error)); background: rgba(var(--v-theme-error), .08); font-size: 11px; font-weight: 650; border-radius: 4px; padding: 4px 6px; max-width: 88px; text-align: center; }
.sync-panel__header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 16px 20px; border-bottom: 1px solid rgba(var(--v-border-color), .16); }
.sync-panel__header h2 { font-size: 20px; line-height: 1.3; font-weight: 700; }
.sync-panel__header p { font-size: 12px; margin-top: 4px; color: rgba(var(--v-theme-on-surface), .7); }
.sync-panel__body { padding: 20px !important; }
.sync-panel__summary { display: flex; gap: 24px; font-size: 13px; margin-bottom: 4px; padding-bottom: 16px; border-bottom: 1px solid rgba(var(--v-border-color), .16); }
.sync-panel__summary strong { font-size: 18px; font-variant-numeric: tabular-nums; margin-right: 4px; }
.sync-panel__fila { padding: 20px 0; border-bottom: 1px solid rgba(var(--v-border-color), .16); display: grid; gap: 10px; }
.sync-panel__row-head { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; align-items: start; }
.sync-panel__row-head h3, .sync-panel__finca { font-size: 16px; line-height: 1.4; font-weight: 650; overflow-wrap: anywhere; }
.sync-panel__row-head h3 { flex: 1; min-width: 140px; }
.sync-panel__finca { margin-bottom: 20px; }
.sync-panel__row-meta { display: flex; gap: 16px; font-size: 13px; }
.sync-panel__error { font-size: 13px; line-height: 1.5; border-left: 3px solid rgb(var(--v-theme-error)); padding: 6px 10px; background: rgba(var(--v-theme-error), .06); overflow-wrap: anywhere; }
.sync-panel__row-footer { display: flex; align-items: start; gap: 12px; justify-content: space-between; }
.sync-panel__reference { min-width: 0; font-size: 12px; }
.sync-panel__reference summary { cursor: pointer; min-height: 44px; display: list-item; align-content: center; }
.sync-panel__reference small { overflow-wrap: anywhere; }
.sync-panel__detalle { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.sync-panel__detalle > span { grid-column: 1 / -1; font-size: 14px; font-weight: 600; }
.sync-panel__note { font-size: 12px; color: rgba(var(--v-theme-on-surface), .7); line-height: 1.5; }
.sync-panel__empty { display: grid; justify-items: center; gap: 12px; text-align: center; padding: 56px 12px; }
.sync-panel__empty p { font-size: 14px; color: rgba(var(--v-theme-on-surface), .7); }
.sync-panel__footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 16px 20px max(16px, env(safe-area-inset-bottom)); border-top: 1px solid rgba(var(--v-border-color), .16); }
.sync-panel__footer .v-btn { min-height: 44px; margin: 0; }
.sync-panel__backup { height: auto; min-height: 44px; }
.sync-panel :deep(.v-btn), .sync-panel__dialog :deep(.v-btn) { text-transform: none; letter-spacing: 0; font-weight: 650; }
</style>
