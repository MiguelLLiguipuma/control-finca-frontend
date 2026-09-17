<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ConteoFotoPanel from '@/components/cosecha/ConteoFotoPanel.vue';
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
  cargarSaldos,
  guardarCosecha,
} = useRegistroCosecha();

const calendarioSeleccionadoId = ref<number | null>(null);
const fotoPendiente = ref(false);
const sesionFoto = ref(0);
const errorFoto = ref('');
const mensajeFoto = ref('');
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
    .filter((item) => Number(item.saldo_en_campo || 0) > 0)
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

async function refrescar() {
  if (!fincaSeleccionada.value || fotoPendiente.value || cosechaStore.submitting) return;
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
  <v-container fluid class="mobile-count pa-3 pb-16">
    <div class="mobile-count__header">
      <div>
        <div class="text-caption text-medium-emphasis font-weight-bold">Conteo móvil</div>
        <h1 class="text-h5 font-weight-black text-high-emphasis">Cosecha en campo</h1>
      </div>
      <v-chip
        :color="cosechaStore.isOnline ? 'success' : 'warning'"
        variant="tonal"
        class="font-weight-bold"
      >
        {{ cosechaStore.isOnline ? 'En línea' : 'Sin conexión' }}
      </v-chip>
    </div>

    <v-alert
      v-if="!cosechaStore.isOnline || cosechaStore.colaSincronizacion.length || hayConteoSinEnviar"
      :type="!cosechaStore.isOnline ? 'warning' : 'info'"
      variant="tonal"
      density="comfortable"
      class="mb-3"
    >
      <div class="font-weight-bold">
        {{ cosechaStore.isOnline ? 'Borrador protegido' : 'Modo campo sin conexión' }}
      </div>
      <div class="text-caption">
        El conteo se conserva en este celular. Pendientes: {{ cosechaStore.colaSincronizacion.length }}.
      </div>
    </v-alert>

    <section class="mobile-count__section">
      <v-select
        v-model="fincaSeleccionada"
        :disabled="fotoPendiente || cosechaStore.submitting || cosechaStore.loading || cosechaStore.sincronizando"
        :items="fincas"
        item-title="nombre"
        item-value="id"
        label="Finca"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-map-marker-radius"
        hide-details
      />
      <v-text-field
        v-model="fechaCampo"
        :disabled="fotoPendiente || cosechaStore.submitting || cosechaStore.loading || cosechaStore.sincronizando"
        type="date"
        label="Fecha de corte"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-calendar"
        hide-details
      />
    </section>

    <section class="mobile-count__totals">
      <div>
        <span class="text-caption text-medium-emphasis font-weight-bold">Digitado</span>
        <strong>{{ cosechaStore.totalDigitado }}</strong>
      </div>
      <div>
        <span class="text-caption text-medium-emphasis font-weight-bold">Restante</span>
        <strong>{{ cosechaStore.totalRestante }}</strong>
      </div>
      <v-btn
        color="primary"
        variant="flat"
        rounded="lg"
        :loading="cosechaStore.submitting || cosechaStore.sincronizando"
        :disabled="cosechaStore.totalDigitado <= 0 || fotoPendiente || cosechaStore.loading || !fechaCampo || !fincaSeleccionada"
        @click="guardarCosecha"
      >
        Enviar
      </v-btn>
    </section>

    <section class="mobile-count__section">
      <div class="mobile-count__section-title">
        <div>
          <div class="text-subtitle-2 font-weight-black">Cinta a contar</div>
          <div class="text-caption text-medium-emphasis">Toca una cinta y usa los botones grandes.</div>
        </div>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-refresh"
          :loading="cosechaStore.loading"
          :disabled="fotoPendiente || cosechaStore.submitting"
          @click="refrescar"
        >
          Actualizar
        </v-btn>
      </div>

      <v-chip-group
        v-model="calendarioSeleccionadoId"
        mandatory
        selected-class="mobile-count__chip--selected"
        class="mobile-count__chips"
      >
        <v-chip
          v-for="item in cintasDisponibles"
          :key="item.calendario_id"
          :value="item.calendario_id"
          class="mobile-count__chip"
          variant="outlined"
        >
          <span class="mobile-count__dot" :style="{ backgroundColor: item.color_hex }" />
          <span class="font-weight-black">{{ item.color_cinta }}</span>
          <span class="text-caption ml-1">Sem {{ item.semana_enfunde }}</span>
        </v-chip>
      </v-chip-group>
    </section>

    <ConteoFotoPanel
      :key="sesionFoto"
      :cintas="cintasFoto"
      :bloqueado="cosechaStore.loading || cosechaStore.submitting || !fincaSeleccionada || !fechaCampo"
      :error-aplicacion="errorFoto"
      @pending="fotoPendiente = $event"
      @apply="aplicarFoto"
    />
    <v-alert v-if="mensajeFoto" type="success" variant="tonal" density="compact" class="mb-3" closable @click:close="mensajeFoto = ''">
      {{ mensajeFoto }}
    </v-alert>

    <v-card v-if="cintaActiva" class="mobile-count__counter" variant="flat" border>
      <v-card-text>
        <div class="mobile-count__counter-head">
          <v-avatar
            :style="{ backgroundColor: cintaActiva.color_hex + '22' }"
            rounded="lg"
            size="52"
          >
            <v-icon :style="{ color: cintaActiva.color_hex }">mdi-tag</v-icon>
          </v-avatar>
          <div>
            <div class="text-caption text-medium-emphasis font-weight-bold">Cinta seleccionada</div>
            <div class="text-h6 font-weight-black" :style="{ color: cintaActiva.color_hex }">
              {{ cintaActiva.color_cinta }} · Semana {{ cintaActiva.semana_enfunde }}/{{ cintaActiva.anio }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Edad {{ cintaActiva.edad }} sem · Disponible {{ saldoDisponible(cintaActiva) }}
            </div>
          </div>
        </div>

        <div class="mobile-count__numbers">
          <div>
            <span>Buenos</span>
            <strong>{{ cintaActiva.cantidad_a_cosechar }}</strong>
          </div>
          <div>
            <span>Rechazo</span>
            <strong>{{ cintaActiva.rechazo }}</strong>
          </div>
        </div>

        <div class="mobile-count__actions">
          <v-btn color="success" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'cantidad_a_cosechar', 1)">
            +1 Bueno
          </v-btn>
          <v-btn color="success" variant="tonal" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'cantidad_a_cosechar', 10)">
            +10
          </v-btn>
          <v-btn color="error" variant="tonal" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'rechazo', 1)">
            +1 Rechazo
          </v-btn>
          <v-btn color="medium-emphasis" variant="outlined" size="x-large" rounded="lg" @click="sumar(cintaActiva, 'cantidad_a_cosechar', -1)">
            -1
          </v-btn>
        </div>

        <div class="mobile-count__secondary">
          <v-btn variant="text" color="primary" prepend-icon="mdi-basket-check" @click="llenarSaldo(cintaActiva)">
            Todo el saldo
          </v-btn>
          <v-btn variant="text" color="error" prepend-icon="mdi-broom" @click="limpiarCinta(cintaActiva)">
            Limpiar cinta
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-else type="info" variant="tonal" class="mt-3">
      No hay cintas con saldo para esta finca.
    </v-alert>
  </v-container>
</template>



<style scoped>
.mobile-count {
  min-height: 100vh;
  background: rgb(var(--v-theme-background));
}

.mobile-count__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.mobile-count__section,
.mobile-count__totals,
.mobile-count__counter {
  margin-bottom: 12px;
  border-radius: 8px;
}


.mobile-count__section {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: rgb(var(--v-theme-surface));
}

.mobile-count__section-title,
.mobile-count__totals,
.mobile-count__counter-head,
.mobile-count__secondary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mobile-count__totals {
  position: sticky;
  top: 8px;
  z-index: 2;
  padding: 10px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
}

.mobile-count__totals div,
.mobile-count__numbers div {
  display: grid;
  gap: 2px;
}

.mobile-count__totals strong {
  font-size: 1.35rem;
  line-height: 1;
}

.mobile-count__chips {
  max-height: 136px;
  overflow-y: auto;
}

.mobile-count__chip {
  min-height: 42px;
  margin-bottom: 6px;
}

.mobile-count__chip--selected {
  border-color: rgb(var(--v-theme-primary)) !important;
  background: rgba(var(--v-theme-primary), 0.1) !important;
}

.mobile-count__dot {
  width: 13px;
  height: 13px;
  margin-right: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
}

.mobile-count__counter {
  background: rgb(var(--v-theme-surface));
}

.mobile-count__numbers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 18px 0;
}

.mobile-count__numbers div {
  min-height: 92px;
  place-items: center;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.mobile-count__numbers span {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
}

.mobile-count__numbers strong {
  font-size: 2.6rem;
  line-height: 1;
}

.mobile-count__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mobile-count__actions :deep(.v-btn) {
  min-height: 64px;
  font-weight: 900;
}

.mobile-count__secondary {
  margin-top: 8px;
  flex-wrap: wrap;
}

@media (max-width: 420px) {
  .mobile-count__header,
  .mobile-count__counter-head,
  .mobile-count__section-title {
    align-items: flex-start;
  }

  .mobile-count__actions {
    grid-template-columns: 1fr;
  }

}
</style>
