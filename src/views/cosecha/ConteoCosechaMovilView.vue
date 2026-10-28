<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ConteoFotoPanel from '@/components/cosecha/ConteoFotoPanel.vue';
import CosechaSyncPanel from '@/components/cosecha/CosechaSyncPanel.vue';
import CosechaRecoveryPanel from '@/components/cosecha/CosechaRecoveryPanel.vue';
import ConteoManualPanel from '@/components/cosecha/ConteoManualPanel.vue';
import { validarRepartoFoto, type RepartoFoto } from '@/utils/conteoFoto';
import { useRegistroCosecha } from '@/composables/useRegistroCosecha';
import type { CintaCosecha } from '@/stores/cosecha/cosechaStore';
import { toLocalIsoDate } from '@/utils/dateIso';

type CampoConteo = 'cantidad_a_cosechar' | 'rechazo';

const {
  cosechaStore,
  fincas,
  fincaSeleccionada,
  fechaObjetoPicker,
  hayConteoSinEnviar,
  errorBorrador,
  hayBorradorAntiguo,
  hayRespaldoBorrador,
  conflictosConteo, corregirConflicto, exportarBorrador, avisoOffline, preparandoOffline, prepararSinConexion,
  cargarSaldos,
  guardarCosecha,
} = useRegistroCosecha();

const calendarioSeleccionadoId = ref<number | null>(null);
const fotoPendiente = ref(false);
const sesionFoto = ref(0);
const errorFoto = ref('');
const mensajeFoto = ref('');
const fotoAbierta = ref(false);
const confirmarAccion = ref<'limpiar' | 'llenar' | null>(null);
const conteoBloqueado = computed(() => preparandoOffline.value || cosechaStore.loading || cosechaStore.submitting || cosechaStore.sincronizando);
const cintasFoto = computed(() => cintasDisponibles.value.map((item) => ({
  calendario_id: item.calendario_id,
  color_cinta: item.color_cinta,
  color_hex: item.color_hex,
  semana_enfunde: item.semana_enfunde,
  anio: item.anio,
  disponible: saldoDisponible(item),
})));

const fechaCampo = computed({
  get: () => (fechaObjetoPicker.value ? toLocalIsoDate(fechaObjetoPicker.value) : ''),
  set: (value: string) => {
    fechaObjetoPicker.value = value ? new Date(`${value}T00:00:00`) : null;
  },
});

const cintasDisponibles = computed(() =>
  cosechaStore.saldosPendientes
    .filter((item) => Number(item.saldo_en_campo || 0) > 0 || item.cantidad_a_cosechar > 0 || item.rechazo > 0)
    .sort((a, b) => {
      const corteA = cosechaStore.esFrutaDeCorte(a.semana_enfunde, a.anio) ? 0 : 1;
      const corteB = cosechaStore.esFrutaDeCorte(b.semana_enfunde, b.anio) ? 0 : 1;
      if (corteA !== corteB) return corteA - corteB;
      return b.edad - a.edad;
    }),
);

const cintaActiva = computed(() =>
  cintasDisponibles.value.find(
    (item) => item.calendario_id === calendarioSeleccionadoId.value,
  ) || null,
);

watch(
  cintasDisponibles,
  (items) => {
    if (!items.length) {
      calendarioSeleccionadoId.value = null;
      return;
    }
    const existe = items.some((item) => item.calendario_id === calendarioSeleccionadoId.value);
    if (!existe) calendarioSeleccionadoId.value = items[0].calendario_id;
  },
  { immediate: true },
);

function saldoDisponible(item: CintaCosecha) {
  return Math.max(
    0,
    Number(item.saldo_en_campo || 0) -
      Number(item.cantidad_a_cosechar || 0) -
      Number(item.rechazo || 0),
  );
}

function sumar(item: CintaCosecha, campo: CampoConteo, delta: number) {
  if (conteoBloqueado.value) return;
  cosechaStore.ajustarDigitacion(item, campo, delta);
}

function llenarSaldo(item: CintaCosecha) {
  cosechaStore.maximizarBuenos(item);
}

function limpiarCinta(item: CintaCosecha) {
  item.cantidad_a_cosechar = 0;
  item.rechazo = 0;
  cosechaStore.normalizarItemDigitacion(item);
}

function confirmarCambio() {
  if (!cintaActiva.value || conteoBloqueado.value) return;
  if (confirmarAccion.value === 'limpiar') limpiarCinta(cintaActiva.value);
  if (confirmarAccion.value === 'llenar') llenarSaldo(cintaActiva.value);
  confirmarAccion.value = null;
}

async function refrescar() {
  if (!fincaSeleccionada.value || fotoPendiente.value || conteoBloqueado.value) return;
  await cargarSaldos(fincaSeleccionada.value);
}

function aplicarFoto(total: number, reparto: RepartoFoto[]) {
  errorFoto.value = '';
  if (cosechaStore.loading || cosechaStore.submitting || !fincaSeleccionada.value || !fechaCampo.value) return;
  if (!validarRepartoFoto(total, reparto, cintasFoto.value)) {
    errorFoto.value = 'El reparto no coincide con las marcas o supera el saldo disponible. Revisa las cantidades.';
    return;
  }
  for (const fila of reparto) {
    const item = cintasDisponibles.value.find((cinta) => cinta.calendario_id === fila.calendario_id)!;
    cosechaStore.ajustarDigitacion(item, 'cantidad_a_cosechar', fila.cantidad);
  }
  mensajeFoto.value = `${total} racimos añadidos al conteo. Puedes continuar con otra foto o enviar la cosecha.`;
  fotoPendiente.value = false;
  sesionFoto.value++;
}
</script>

<template>
  <v-container fluid class="mobile-count">
    <div class="mobile-count__header">
      <div>
        <h1 class="mobile-count__title">Conteo en campo</h1>
      </div>
      <v-chip
        :color="cosechaStore.isOnline ? 'success' : 'warning'"
        variant="tonal"
        class="font-weight-bold"
      >
        {{ cosechaStore.isOnline ? 'En línea' : 'Sin conexión' }}
      </v-chip>
    </div>

    <p class="mobile-count__save-state text-caption" :class="errorBorrador ? 'text-error' : 'text-medium-emphasis'" role="status">
      {{ errorBorrador ? 'No se pudo guardar. Mantén esta pantalla abierta.' : hayConteoSinEnviar ? 'Borrador guardado en este celular.' : 'Sin conteo nuevo pendiente.' }}
    </p>

    <section class="mobile-count__context" aria-label="Datos de la jornada">
      <v-select
        v-model="fincaSeleccionada"
        :disabled="fotoPendiente || conteoBloqueado"
        :items="fincas"
        item-title="nombre"
        item-value="id"
        label="Finca"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-map-marker-radius"
        hide-details
      />
      <div class="mobile-count__date">
      <v-text-field
        v-model="fechaCampo"
        :disabled="fotoPendiente || conteoBloqueado"
        type="date"
        label="Fecha de corte"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-calendar"
        hide-details
      />
      <v-btn icon="mdi-refresh" variant="text" aria-label="Actualizar inventario" title="Actualizar inventario"
        :loading="cosechaStore.loading" :disabled="fotoPendiente || conteoBloqueado" @click="refrescar" />
      </div>
    </section>

    <div class="mobile-count__workspace">
    <ConteoManualPanel
      v-model:calendario-id="calendarioSeleccionadoId"
      :cintas="cintasDisponibles" :bloqueado="conteoBloqueado" :loading="cosechaStore.loading"
      @ajustar="sumar" @accion="confirmarAccion = $event"
    />
    <aside class="mobile-count__support" aria-label="Resumen y herramientas">
    <section class="mobile-count__totals">
      <div>
        <span>Contados</span>
        <strong>{{ cosechaStore.totalDigitado }}</strong>
      </div>
      <div>
        <span>En campo</span>
        <strong>{{ cosechaStore.totalRestante }}</strong>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        :loading="cosechaStore.submitting || cosechaStore.sincronizando"
        :disabled="cosechaStore.totalDigitado <= 0 || fotoPendiente || conteoBloqueado || conflictosConteo.length > 0 || Boolean(errorBorrador) || !fechaCampo || !fincaSeleccionada"
        @click="guardarCosecha"
      >
        {{ cosechaStore.isOnline ? 'Enviar conteo' : 'Guardar pendiente' }}
      </v-btn>
    </section>

    <v-dialog :model-value="Boolean(confirmarAccion)" max-width="420" @update:model-value="confirmarAccion = null">
      <v-card rounded="lg">
        <v-card-title>{{ confirmarAccion === 'limpiar' ? 'Limpiar conteo' : 'Contar todo el saldo' }}</v-card-title>
        <v-card-text>
          {{ cintaActiva?.color_cinta }} · Semana {{ cintaActiva?.semana_enfunde }}/{{ cintaActiva?.anio }}.
          {{ confirmarAccion === 'limpiar' ? 'Se pondran en cero los buenos y rechazos de esta cinta.' : 'Se completaran los buenos con todo el saldo disponible, conservando los rechazos.' }}
        </v-card-text>
        <v-card-actions>
          <v-btn @click="confirmarAccion = null">Cancelar</v-btn>
          <v-spacer />
          <v-btn :disabled="conteoBloqueado" color="primary" @click="confirmarCambio">Confirmar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CosechaSyncPanel :fincas="fincas" :error-borrador="errorBorrador" :hay-borrador-antiguo="hayBorradorAntiguo" />
    <CosechaRecoveryPanel :conflictos="conflictosConteo" :corregir="corregirConflicto"
      :hay-respaldo="hayRespaldoBorrador"
      :consultado-en="cosechaStore.inventarioConsultadoEn" :copia-local="cosechaStore.inventarioLocal"
      :aviso="avisoOffline" :error-copia="cosechaStore.errorCopiaLocal" :bloqueado="conteoBloqueado || fotoPendiente"
      :preparando="preparandoOffline" :finca-id="fincaSeleccionada" @preparar="prepararSinConexion" @exportar="exportarBorrador" />
    <v-btn variant="text" block class="mobile-count__photo-toggle" :aria-expanded="fotoAbierta" aria-controls="conteo-foto-opcional" @click="fotoAbierta = !fotoAbierta">
      <v-icon start>mdi-camera</v-icon>Conteo por foto
      <span class="mobile-count__optional">{{ fotoPendiente ? 'Sin aplicar' : 'Opcional' }}</span>
      <v-icon end :style="{ transform: fotoAbierta ? 'rotate(180deg)' : undefined }">mdi-chevron-down</v-icon>
    </v-btn>
    </aside>
    </div>
    <div v-show="fotoAbierta" id="conteo-foto-opcional">
      <ConteoFotoPanel
        :key="sesionFoto"
        :finca-id="fincaSeleccionada"
        :cintas="cintasFoto"
        :bloqueado="conteoBloqueado || !fincaSeleccionada || !fechaCampo"
        :error-aplicacion="errorFoto"
        @pending="fotoPendiente = $event"
        @apply="aplicarFoto"
      />
    </div>
    <v-alert v-if="mensajeFoto" type="success" variant="tonal" density="compact" class="mb-3" closable @click:close="mensajeFoto = ''">
      {{ mensajeFoto }}
    </v-alert>
  </v-container>
</template>



<style scoped>
.mobile-count { max-width: 1080px; padding: 24px 24px 48px; color: rgb(var(--v-theme-on-surface)); }
.mobile-count__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mobile-count__title { font-size: 24px; line-height: 1.25; font-weight: 750; letter-spacing: 0; }
.mobile-count__save-state { min-height: 36px; padding-top: 6px; margin-bottom: 12px; }
.mobile-count__context { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 16px; margin-bottom: 20px; }
.mobile-count__date { display: flex; gap: 8px; align-items: center; min-width: 0; }
.mobile-count__date .v-text-field { min-width: 0; }
.mobile-count__workspace { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 24px; align-items: start; }
.mobile-count__support { min-width: 0; }
.mobile-count__totals { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 4px 0 20px; margin-bottom: 16px; border-bottom: 1px solid rgba(var(--v-border-color), .16); }
.mobile-count__totals div { display: grid; gap: 4px; }
.mobile-count__totals span { font-size: 13px; color: rgba(var(--v-theme-on-surface), .72); }
.mobile-count__totals strong { font-size: 28px; font-variant-numeric: tabular-nums; line-height: 1.2; overflow-wrap: anywhere; }
.mobile-count__totals .v-btn { grid-column: 1 / -1; min-height: 48px; }
.mobile-count__photo-toggle { min-height: 52px; padding-inline: 12px; border-top: 1px solid rgba(var(--v-border-color), .16); border-radius: 0; }
.mobile-count__photo-toggle :deep(.v-btn__content) { width: 100%; justify-content: start; white-space: normal; }
.mobile-count__optional { margin-left: auto; padding-left: 8px; font-size: 12px; color: rgba(var(--v-theme-on-surface), .7); }
#conteo-foto-opcional { margin-top: 20px; }
:deep(.v-btn) { text-transform: none; letter-spacing: 0; font-weight: 650; }
@media (max-width: 800px) {
  .mobile-count { padding: 16px 12px 32px; }
  .mobile-count__title { font-size: 21px; }
  .mobile-count__workspace { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .mobile-count__context { grid-template-columns: minmax(0, 1fr); gap: 12px; margin-bottom: 16px; }
  .mobile-count__totals { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; gap: 10px; align-items: center; padding-bottom: 16px; }
  .mobile-count__totals strong { font-size: 22px; }
  .mobile-count__totals .v-btn { grid-column: auto; padding-inline: 12px; }
}
@media (max-width: 360px) {
  .mobile-count__totals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mobile-count__totals .v-btn { grid-column: 1 / -1; }
}
</style>
