<template>
  <v-container fluid class="bg-background min-h-screen pa-4 pa-md-6 transition-colors voucher-shell voucher-print-root">
    <v-row justify="center">
      <v-col cols="12" xl="11">
        <div class="print-header">
          <div class="print-title">Voucher de Embarque</div>
          <div class="print-meta">
            <span>Fecha: {{ embarqueStore.fechaEmbarque }}</span>
            <span v-if="embarqueStore.voucherActual"> · Nro: {{ embarqueStore.voucherActual.numero_voucher }}</span>
            <span v-if="embarqueStore.voucherActual"> · Estado: {{ embarqueStore.voucherActual.estado }}</span>
          </div>
        </div>

        <div class="print-only">
          <div class="print-sheet">
            <header class="print-sheet__header">
              <div>
                <div class="print-sheet__eyebrow">ControlFinca · Operacion de Embarque</div>
                <h1 class="print-sheet__title">Voucher de Embarque</h1>
              </div>
              <div class="print-sheet__badge">
                {{ embarqueStore.voucherActual?.numero_voucher || 'BORRADOR' }}
              </div>
            </header>

            <section class="print-sheet__meta">
              <div><strong>Fecha:</strong> {{ embarqueStore.fechaEmbarque }}</div>
              <div><strong>Estado:</strong> {{ embarqueStore.voucherActual?.estado || 'BORRADOR' }}</div>
              <div><strong>Semana Corte:</strong> {{ embarqueStore.semanaCorte || '--' }}</div>
              <div><strong>Fincas:</strong> {{ fincasSeleccionadasTexto }}</div>
            </section>

            <section class="print-sheet__totals">
              <table>
                <tbody>
                  <tr>
                    <th>Racimos Buenos</th>
                    <td>{{ embarqueStore.totales.racimos_buenos }}</td>
                    <th>Total Cajas</th>
                    <td>{{ embarqueStore.totales.total_cajas.toFixed(2) }}</td>
                  </tr>
                  <tr>
                    <th>Racimos Rechazo</th>
                    <td>{{ embarqueStore.totales.racimos_rechazo }}</td>
                    <th>Ratio Comercial</th>
                    <td>{{ embarqueStore.totales.ratio_comercial_global.toFixed(4) }}</td>
                  </tr>
                  <tr>
                    <th>Total Racimos</th>
                    <td>{{ embarqueStore.totales.total_racimos }}</td>
                    <th>Ratio Operativo</th>
                    <td>{{ embarqueStore.totales.ratio_operativo_global.toFixed(4) }}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="print-sheet__lines">
              <table>
                <thead>
                  <tr>
                    <th>Finca</th>
                    <th>Cinta</th>
                    <th>Sem</th>
                    <th>Buenos</th>
                    <th>Rechazo</th>
                    <th>Total</th>
                    <th>Cajas</th>
                    <th>Ratio Com</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(linea, idx) in embarqueStore.lineas" :key="`print-${linea.finca_id}-${linea.calendario_id}-${idx}`">
                    <td>{{ linea.finca_nombre }}</td>
                    <td>{{ linea.cinta_color }}</td>
                    <td>{{ linea.semana_enfunde ?? '--' }}</td>
                    <td class="text-right">{{ linea.racimos_buenos }}</td>
                    <td class="text-right">{{ linea.racimos_rechazo }}</td>
                    <td class="text-right">{{ linea.total_racimos }}</td>
                    <td class="text-right">{{ linea.cajas_embarcadas.toFixed(2) }}</td>
                    <td class="text-right">{{ linea.ratio_comercial_linea.toFixed(4) }}</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="print-sheet__obs">
              <strong>Observaciones:</strong>
              <span>{{ embarqueStore.observaciones || 'Sin observaciones.' }}</span>
            </section>

            <section class="print-sheet__signatures">
              <div>
                <div class="line"></div>
                <span>Responsable de Embarque</span>
              </div>
              <div>
                <div class="line"></div>
                <span>Supervisor de Campo</span>
              </div>
            </section>
          </div>
        </div>

        <div class="print-hidden">
        <v-card variant="flat" class="rounded-xl mb-6 hero-card border shadow-sm bg-surface">
          <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-4 pa-6">
            <div>
              <div class="d-flex align-center gap-2 mb-2">
                <v-avatar color="primary" variant="tonal" size="42">
                  <v-icon size="24">mdi-ferry</v-icon>
                </v-avatar>
                <div class="section-eyebrow">Operacion de Embarque</div>
              </div>
              <h1 class="text-h3 font-weight-black text-high-emphasis hero-title">Voucher de Embarque</h1>
              <div class="text-subtitle-1 text-medium-emphasis">Cierre diario de cosecha y ratio de cajas</div>
            </div>

            <div class="d-flex align-center gap-2">
              <v-chip v-if="embarqueStore.voucherActual" :color="chipEstado.color" size="large" label>
                {{ chipEstado.text }}
              </v-chip>
              <v-chip v-if="embarqueStore.voucherActual" color="primary" variant="tonal" size="large">
                {{ embarqueStore.voucherActual.numero_voucher }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <v-card variant="flat" class="rounded-xl mb-6 controls-card border shadow-sm bg-surface">
          <v-card-text class="pa-5">
            <v-row>
              <v-col cols="12" md="3">
                <label class="custom-label">Fecha Embarque</label>
                <v-menu v-model="menuFecha" :close-on-content-click="false" location="bottom center">
                  <template #activator="{ props }">
                    <v-text-field
                      v-bind="props"
                      :model-value="embarqueStore.fechaEmbarque"
                      density="comfortable"
                      variant="outlined"
                      hide-details
                      readonly
                      prepend-inner-icon="mdi-calendar"
                      :disabled="embarqueStore.submitting"
                    />
                  </template>
                  <v-date-picker
                    v-model="fechaVoucherPicker"
                    color="primary"
                    :min="fechaMinima"
                    :max="fechaMaxima"
                    :allowed-dates="fechaVoucherPermitida"
                    @update:model-value="menuFecha = false"
                  />
                </v-menu>
                <div class="text-caption text-medium-emphasis mt-2">
                  Fechas con voucher existente se muestran bloqueadas.
                </div>
                <v-alert
                  v-if="estadoFechaSeleccionada"
                  class="mt-2"
                  variant="tonal"
                  density="compact"
                  :type="estadoFechaSeleccionada.cosecha && estadoFechaSeleccionada.voucher ? 'warning' : 'info'"
                >
                  <span v-if="estadoFechaSeleccionada.cosecha && estadoFechaSeleccionada.voucher">
                    Fecha con cosecha y voucher existentes.
                  </span>
                  <span v-else-if="estadoFechaSeleccionada.cosecha">
                    Fecha con cosecha registrada.
                  </span>
                  <span v-else>
                    Fecha con voucher registrado.
                  </span>
                </v-alert>
              </v-col>

              <v-col cols="12" md="3">
                <label class="custom-label">Fincas (misma empresa)</label>
                <v-autocomplete
                  v-model="embarqueStore.fincaIds"
                  :items="fincasDisponibles"
                  item-title="nombre"
                  item-value="id"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  clearable
                  multiple
                  chips
                  closable-chips
                  :disabled="embarqueStore.submitting"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.empresa_nombre || `Empresa ${item.raw.empresa_id}`" />
                  </template>
                </v-autocomplete>
              </v-col>

              <v-col cols="12" md="2">
                <label class="custom-label">Semana Corte</label>
                <v-text-field
                  v-model.number="embarqueStore.semanaCorte"
                  type="number"
                  min="1"
                  max="52"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                />
              </v-col>

              <v-col cols="12" md="4" class="d-flex align-end gap-2 flex-wrap">
                <v-btn
                  color="primary"
                  class="font-weight-bold premium-btn"
                  :loading="embarqueStore.loading"
                  :disabled="embarqueStore.submitting"
                  @click="refrescarBase"
                >
                  Cargar Base del Dia
                </v-btn>

                <v-btn
                  variant="tonal"
                  color="secondary"
                  class="font-weight-bold premium-btn"
                  :loading="embarqueStore.loading"
                  :disabled="embarqueStore.submitting"
                  @click="buscarVouchers"
                >
                  Buscar Vouchers
                </v-btn>
              </v-col>
            </v-row>

            <v-row class="mt-1">
              <v-col cols="12" md="5">
                <label class="custom-label">Ingreso General de Cajas (Semana)</label>
                <v-text-field
                  v-model.number="cajasSemanaInput"
                  type="number"
                  min="0"
                  step="0.01"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                />
              </v-col>
              <v-col cols="12" md="3" class="d-flex align-end">
                <v-btn
                  block
                  color="primary"
                  variant="tonal"
                  class="font-weight-bold premium-btn"
                  :disabled="!embarqueStore.esEditable || embarqueStore.submitting || !embarqueStore.lineas.length"
                  @click="aplicarCajasSemana"
                >
                  Aplicar a Lineas
                </v-btn>
              </v-col>
              <v-col cols="12" md="4">
                <label class="custom-label">Buscar Voucher por Fecha</label>
                <v-menu v-model="menuFechaBusqueda" :close-on-content-click="false" location="bottom center">
                  <template #activator="{ props }">
                    <v-text-field
                      v-bind="props"
                      :model-value="fechaBusqueda"
                      density="comfortable"
                      variant="outlined"
                      hide-details
                      readonly
                      prepend-inner-icon="mdi-magnify"
                      :disabled="embarqueStore.submitting"
                    />
                  </template>
                  <v-date-picker
                    v-model="fechaBusquedaPicker"
                    color="secondary"
                    :min="fechaMinima"
                    :max="fechaMaxima"
                    @update:model-value="menuFechaBusqueda = false"
                  />
                </v-menu>
              </v-col>
              <v-col cols="12" md="3">
                <label class="custom-label">Buscar por Numero</label>
                <v-text-field
                  v-model="numeroVoucherBusqueda"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  clearable
                  placeholder="VCH-2026-0001"
                  prepend-inner-icon="mdi-pound"
                  :disabled="embarqueStore.submitting"
                  @keyup.enter="buscarVouchers"
                />
              </v-col>
              <v-col cols="12" md="2">
                <label class="custom-label">Modo Numero</label>
                <v-btn-toggle
                  v-model="modoBusquedaNumero"
                  mandatory
                  density="comfortable"
                  divided
                  color="secondary"
                  class="w-100"
                >
                  <v-btn value="contains" size="small">Parcial</v-btn>
                  <v-btn value="exact" size="small">Exacto</v-btn>
                </v-btn-toggle>
              </v-col>
            </v-row>

            <v-row class="mt-2">
              <v-col cols="12">
                <v-alert
                  v-if="avisoEmpresa"
                  type="warning"
                  variant="tonal"
                  density="comfortable"
                  class="mb-3"
                >
                  {{ avisoEmpresa }}
                </v-alert>
                <label class="custom-label">Observaciones</label>
                <v-textarea
                  v-model="embarqueStore.observaciones"
                  rows="2"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                  :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <v-alert
          v-if="embarqueStore.error"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ embarqueStore.error }}
        </v-alert>
        <v-alert
          v-else-if="mensajeBusqueda"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          {{ mensajeBusqueda }}
        </v-alert>

        <v-card variant="flat" class="rounded-xl mb-6 table-card border shadow-sm bg-surface">
          <v-card-text class="pa-0">
            <v-table density="comfortable" fixed-header height="420px">
              <thead>
                <tr>
                  <th>Finca</th>
                  <th>Cinta</th>
                  <th>Sem</th>
                  <th class="text-right">Buenos</th>
                  <th class="text-right">Rechazo</th>
                  <th class="text-right">Total</th>
                  <th class="text-right">Cajas</th>
                  <th class="text-right">Ratio Com</th>
                  <th class="text-right">Ratio Op</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(linea, idx) in embarqueStore.lineas" :key="`${linea.finca_id}-${linea.calendario_id}-${idx}`">
                  <td>{{ linea.finca_nombre }}</td>
                  <td>{{ linea.cinta_color }}</td>
                  <td>{{ linea.semana_enfunde ?? '--' }}</td>
                  <td class="text-right">{{ linea.racimos_buenos }}</td>
                  <td class="text-right">{{ linea.racimos_rechazo }}</td>
                  <td class="text-right">{{ linea.total_racimos }}</td>
                  <td class="text-right" style="width: 160px;">
                    <v-text-field
                      :model-value="linea.cajas_embarcadas"
                      type="number"
                      min="0"
                      step="0.01"
                      density="compact"
                      variant="outlined"
                      hide-details
                      class="text-right"
                      :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                      @update:model-value="(v) => embarqueStore.setCajaLinea(idx, Number(v))"
                      @blur="embarqueStore.normalizarLinea(idx)"
                    />
                  </td>
                  <td class="text-right">{{ linea.ratio_comercial_linea.toFixed(4) }}</td>
                  <td class="text-right">{{ linea.ratio_operativo_linea.toFixed(4) }}</td>
                </tr>

                <tr v-if="!embarqueStore.lineas.length">
                  <td colspan="9" class="text-center py-10 text-medium-emphasis">No hay lineas cargadas para esta fecha.</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>

        <v-row>
          <v-col cols="12" md="8">
            <v-card variant="flat" class="rounded-xl totals-card border shadow-sm bg-surface">
              <v-card-text class="pa-6 d-flex flex-wrap gap-6">
                <div class="kpi-box">
                  <div class="text-caption text-medium-emphasis">Racimos Buenos</div>
                  <div class="text-h4 font-weight-black">{{ embarqueStore.totales.racimos_buenos }}</div>
                </div>
                <div class="kpi-box">
                  <div class="text-caption text-medium-emphasis">Rechazo</div>
                  <div class="text-h4 font-weight-black">{{ embarqueStore.totales.racimos_rechazo }}</div>
                </div>
                <div class="kpi-box">
                  <div class="text-caption text-medium-emphasis">Total Racimos</div>
                  <div class="text-h4 font-weight-black">{{ embarqueStore.totales.total_racimos }}</div>
                </div>
                <div class="kpi-box">
                  <div class="text-caption text-medium-emphasis">Total Cajas</div>
                  <div class="text-h4 font-weight-black">{{ embarqueStore.totales.total_cajas.toFixed(2) }}</div>
                </div>
                <div class="kpi-box kpi-highlight">
                  <div class="text-caption text-medium-emphasis">Ratio Comercial</div>
                  <div class="text-h4 font-weight-black text-primary">{{ embarqueStore.totales.ratio_comercial_global.toFixed(4) }}</div>
                </div>
                <div class="kpi-box">
                  <div class="text-caption text-medium-emphasis">Ratio Operativo</div>
                  <div class="text-h4 font-weight-black">{{ embarqueStore.totales.ratio_operativo_global.toFixed(4) }}</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card variant="flat" class="rounded-xl actions-card border shadow-sm bg-surface">
              <v-card-text class="pa-5 d-flex flex-column gap-2">
                <v-btn
                  block
                  color="primary"
                  class="font-weight-black premium-btn"
                  :loading="embarqueStore.submitting"
                  :disabled="embarqueStore.submitting || !embarqueStore.esEditable || !embarqueStore.lineas.length"
                  @click="guardar"
                >
                  Guardar Borrador
                </v-btn>

                <v-btn
                  block
                  color="success"
                  class="font-weight-black premium-btn"
                  :loading="embarqueStore.submitting"
                  :disabled="embarqueStore.submitting || !embarqueStore.puedeConfirmar"
                  @click="confirmar"
                >
                  Confirmar Voucher
                </v-btn>

                <v-btn
                  block
                  color="error"
                  variant="tonal"
                  class="font-weight-bold premium-btn"
                  :disabled="embarqueStore.submitting || !embarqueStore.voucherActual || !embarqueStore.esEditable"
                  @click="dialogAnular = true"
                >
                  Anular Voucher
                </v-btn>

                <v-btn
                  block
                  color="secondary"
                  variant="outlined"
                  class="font-weight-bold mt-2 premium-btn"
                  :disabled="embarqueStore.submitting || !embarqueStore.lineas.length"
                  @click="imprimirVoucher"
                >
                  Imprimir / PDF
                </v-btn>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="flat" class="rounded-xl mt-6 border shadow-sm bg-surface">
          <v-card-text class="pa-4">
            <div class="text-h6 font-weight-black mb-3 section-title">Vouchers del dia</div>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th class="text-right">Racimos</th>
                  <th class="text-right">Cajas</th>
                  <th class="text-right">Ratio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in embarqueStore.listado" :key="item.id">
                  <td>{{ item.numero_voucher }}</td>
                  <td>{{ item.fecha_embarque }}</td>
                  <td>
                    <v-chip size="small" :color="colorEstado(item.estado)">{{ item.estado }}</v-chip>
                  </td>
                  <td class="text-right">{{ item.total_racimos }}</td>
                  <td class="text-right">{{ item.total_cajas.toFixed(2) }}</td>
                  <td class="text-right">{{ item.ratio_comercial_global.toFixed(4) }}</td>
                  <td class="text-right">
                    <v-btn size="small" variant="text" color="primary" @click="embarqueStore.cargarVoucher(item.id)">Abrir</v-btn>
                  </td>
                </tr>
                <tr v-if="!embarqueStore.listado.length">
                  <td colspan="7" class="text-center text-medium-emphasis py-6">Sin vouchers para la fecha seleccionada.</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
        </div>
      </v-col>
    </v-row>

    <v-dialog v-model="dialogAnular" max-width="520">
      <v-card>
        <v-card-title class="text-h6 font-weight-bold">Anular Voucher</v-card-title>
        <v-card-text>
          <v-textarea
            v-model="motivoAnulacion"
            label="Motivo de anulacion"
            rows="3"
            variant="outlined"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogAnular = false">Cancelar</v-btn>
          <v-btn color="error" :loading="embarqueStore.submitting" @click="anular">Confirmar Anulacion</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useFincaStore } from '@/stores/fincaStore';
import { useEmbarqueStore } from '@/stores/embarque/embarqueStore';
import type { EmbarqueEstado } from '@/services/embarque/embarqueTypes';
import { cosechaService } from '@/services/cosecha/cosechaService';

const fincaStore = useFincaStore();
const embarqueStore = useEmbarqueStore();
const { fincas } = storeToRefs(fincaStore);

const dialogAnular = ref(false);
const motivoAnulacion = ref('');
const cajasSemanaInput = ref<number>(0);
const avisoEmpresa = ref('');
const menuFecha = ref(false);
const fechaVoucherPicker = ref<Date | null>(new Date());
const menuFechaBusqueda = ref(false);
const fechaBusqueda = ref(new Date().toISOString().split('T')[0]);
const fechaBusquedaPicker = ref<Date | null>(new Date());
const numeroVoucherBusqueda = ref('');
const modoBusquedaNumero = ref<'contains' | 'exact'>('contains');
const mensajeBusqueda = ref('');
const fechasOcupadas = ref<Record<string, { cosecha: boolean; voucher: boolean }>>({});

const chipEstado = computed(() => {
  const estado = embarqueStore.voucherActual?.estado;
  if (estado === 'CONFIRMADO') return { text: 'CONFIRMADO', color: 'success' };
  if (estado === 'ANULADO') return { text: 'ANULADO', color: 'error' };
  return { text: 'BORRADOR', color: 'warning' };
});

const fincaPorId = computed(() => {
  const map = new Map<number, { empresa_id: number }>();
  for (const finca of fincas.value) {
    map.set(finca.id, { empresa_id: finca.empresa_id });
  }
  return map;
});

const empresaBloqueadaId = computed<number | null>(() => {
  const primerId = embarqueStore.fincaIds[0];
  if (!primerId) return null;
  return fincaPorId.value.get(primerId)?.empresa_id ?? null;
});

const fincasDisponibles = computed(() => {
  if (!empresaBloqueadaId.value) return fincas.value;
  return fincas.value.filter((finca) => finca.empresa_id === empresaBloqueadaId.value);
});
const fincasSeleccionadasTexto = computed(() => {
  const ids = new Set(embarqueStore.fincaIds);
  const nombres = fincas.value
    .filter((finca) => ids.has(finca.id))
    .map((finca) => finca.nombre)
    .filter(Boolean);
  return nombres.length ? nombres.join(', ') : 'No especificadas';
});

const fechaMaxima = computed(() => new Date());
const fechaMinima = computed(() => {
  const f = new Date();
  f.setFullYear(f.getFullYear() - 1);
  return f;
});

const estadoFechaSeleccionada = computed(() => fechasOcupadas.value[embarqueStore.fechaEmbarque] || null);

function colorEstado(estado: EmbarqueEstado): string {
  if (estado === 'CONFIRMADO') return 'success';
  if (estado === 'ANULADO') return 'error';
  return 'warning';
}

function toIsoDate(value: Date): string {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function toIsoDateUnknown(value: unknown): string | null {
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value === 'string') return value.slice(0, 10);
  if (value && typeof value === 'object') {
    const raw = value as Record<string, unknown>;
    if (raw.date instanceof Date) return toIsoDate(raw.date);
    if (typeof raw.date === 'string') return raw.date.slice(0, 10);
    if (typeof raw.isoDate === 'string') return raw.isoDate.slice(0, 10);
    if (typeof raw.formatted === 'string') return raw.formatted.slice(0, 10);
  }
  return null;
}

function fechaVoucherPermitida(value: unknown): boolean {
  const iso = toIsoDateUnknown(value);
  if (!iso) return false;
  const estado = fechasOcupadas.value[iso];
  if (!estado?.voucher) return true;
  return iso === embarqueStore.fechaEmbarque;
}

function syncPickerWithStoreDate() {
  const parsed = new Date(`${embarqueStore.fechaEmbarque}T00:00:00`);
  fechaVoucherPicker.value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function syncBusquedaPicker() {
  const parsed = new Date(`${fechaBusqueda.value}T00:00:00`);
  fechaBusquedaPicker.value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function cargarFechasOcupadas() {
  const ids = embarqueStore.fincaIds.length
    ? embarqueStore.fincaIds
    : fincaStore.fincaSeleccionadaId
      ? [fincaStore.fincaSeleccionadaId]
      : [];
  if (!ids.length) {
    fechasOcupadas.value = {};
    return;
  }

  try {
    const data = await cosechaService.getFechasOcupadas({
      finca_ids: ids.join(','),
      fecha_desde: toIsoDate(fechaMinima.value),
      fecha_hasta: toIsoDate(fechaMaxima.value),
    });
    const map: Record<string, { cosecha: boolean; voucher: boolean }> = {};
    for (const item of data.fechas || []) {
      if (!item?.fecha) continue;
      map[item.fecha] = {
        cosecha: Boolean(item.cosecha),
        voucher: Boolean(item.voucher),
      };
    }
    fechasOcupadas.value = map;
  } catch {
    fechasOcupadas.value = {};
  }
}

async function refrescarBase() {
  mensajeBusqueda.value = '';
  embarqueStore.resetFormulario();
  await embarqueStore.cargarPreliquidacion();
  cajasSemanaInput.value = 0;
  fechaBusqueda.value = embarqueStore.fechaEmbarque;
  syncBusquedaPicker();
  await embarqueStore.cargarListado(fechaBusqueda.value);
}

function aplicarCajasSemana() {
  embarqueStore.setCajasTotalesSemana(cajasSemanaInput.value);
}

async function guardar() {
  mensajeBusqueda.value = '';
  await embarqueStore.guardarVoucher();
  fechaBusqueda.value = embarqueStore.fechaEmbarque;
  syncBusquedaPicker();
  await embarqueStore.cargarListado(fechaBusqueda.value);
}

async function confirmar() {
  mensajeBusqueda.value = '';
  await embarqueStore.confirmarVoucher();
  fechaBusqueda.value = embarqueStore.fechaEmbarque;
  syncBusquedaPicker();
  await embarqueStore.cargarListado(fechaBusqueda.value);
}

async function anular() {
  await embarqueStore.anularVoucher(motivoAnulacion.value);
  if (!embarqueStore.error) {
    dialogAnular.value = false;
    motivoAnulacion.value = '';
    await embarqueStore.cargarListado(fechaBusqueda.value);
  }
}

async function buscarVouchers() {
  await embarqueStore.buscarVouchersAvanzado({
    fecha: fechaBusqueda.value,
    numeroVoucher: numeroVoucherBusqueda.value,
    numeroVoucherExacto: modoBusquedaNumero.value === 'exact',
    fechaDesde: toIsoDate(fechaMinima.value),
    fechaHasta: toIsoDate(fechaMaxima.value),
  });
  if (!embarqueStore.error && embarqueStore.listado.length === 0) {
    mensajeBusqueda.value = numeroVoucherBusqueda.value
      ? `No se encontro voucher con numero "${numeroVoucherBusqueda.value}".`
      : `No hay vouchers para ${fechaBusqueda.value}.`;
    return;
  }
  mensajeBusqueda.value = '';
}

watch(
  () => embarqueStore.fechaEmbarque,
  () => {
    syncPickerWithStoreDate();
    if (!fechaBusqueda.value) {
      fechaBusqueda.value = embarqueStore.fechaEmbarque;
      syncBusquedaPicker();
    }
  },
);

watch(
  () => embarqueStore.fincaIds.slice(),
  async (ids) => {
    const normalizados = Array.from(new Set(ids.filter((id) => Number(id) > 0)));
    if (!normalizados.length) {
      avisoEmpresa.value = '';
      await cargarFechasOcupadas();
      mensajeBusqueda.value = '';
      await embarqueStore.cargarListado(fechaBusqueda.value);
      return;
    }

    const empresaObjetivo = fincaPorId.value.get(normalizados[0])?.empresa_id;
    const permitidos = normalizados.filter(
      (id) => fincaPorId.value.get(id)?.empresa_id === empresaObjetivo,
    );

    if (permitidos.length !== normalizados.length) {
      embarqueStore.fincaIds = permitidos;
      avisoEmpresa.value = 'Solo se permiten fincas de una misma empresa por voucher.';
      return;
    }

    avisoEmpresa.value = '';
    await cargarFechasOcupadas();
    mensajeBusqueda.value = '';
    await embarqueStore.cargarListado(fechaBusqueda.value);
  },
);

watch(fechaVoucherPicker, (value) => {
  if (!value) return;
  embarqueStore.fechaEmbarque = toIsoDate(value);
});

watch(fechaBusquedaPicker, (value) => {
  if (!value) return;
  fechaBusqueda.value = toIsoDate(value);
});

onMounted(async () => {
  await fincaStore.obtenerFincas();
  syncPickerWithStoreDate();
  fechaBusqueda.value = embarqueStore.fechaEmbarque;
  syncBusquedaPicker();
  await cargarFechasOcupadas();
  mensajeBusqueda.value = '';
  await embarqueStore.cargarListado(fechaBusqueda.value);
});

function imprimirVoucher() {
  window.print();
}
</script>

<style scoped>
.transition-colors { transition: background-color 0.3s ease, color 0.3s ease; }
.voucher-shell { position: relative; }
.border { border: 1px solid rgba(var(--v-border-color), 0.1) !important; }
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important; }
.bg-background-opacity { background-color: rgba(var(--v-theme-on-surface), 0.03) !important; }

.hero-card {
  background:
    linear-gradient(120deg, rgba(var(--v-theme-primary), 0.1), rgba(var(--v-theme-secondary), 0.08)),
    rgb(var(--v-theme-surface));
}

.hero-title {
  letter-spacing: -0.02em;
}

.section-eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.section-title {
  letter-spacing: -0.01em;
}

.controls-card :deep(.v-field),
.actions-card :deep(.v-btn) {
  border-radius: 12px;
}

.premium-btn {
  letter-spacing: 0.02em;
}

.table-card :deep(.v-table) {
  background: transparent;
}

.table-card :deep(.v-table thead th) {
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.kpi-box {
  min-width: 140px;
  padding: 10px 14px;
  border-radius: 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.kpi-highlight {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.3);
}

.custom-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.65);
  margin-bottom: 6px;
}

.gap-2 {
  gap: 8px;
}

.min-h-screen {
  min-height: 100vh;
}

.print-header {
  display: none;
}

.print-only {
  display: none;
}

@media (max-width: 960px) {
  .hero-title {
    font-size: 2rem !important;
  }

  .kpi-box {
    min-width: calc(50% - 8px);
    flex: 1 1 calc(50% - 8px);
  }
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 1.65rem !important;
  }

  .kpi-box {
    min-width: 100%;
    flex: 1 1 100%;
  }

  .section-eyebrow {
    font-size: 0.66rem;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  .voucher-print-root {
    background: #fff !important;
    padding: 0 !important;
    color: #111827 !important;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 11px;
    line-height: 1.3;
  }

  .print-header {
    display: block;
    margin: 0 0 10px 0;
    border-bottom: 1px solid #d4d4d8;
    padding-bottom: 8px;
  }

  .print-hidden {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .print-sheet {
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 10px;
  }

  .print-sheet__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }

  .print-sheet__eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #4b5563;
  }

  .print-sheet__title {
    margin: 2px 0 0 0;
    font-size: 18px;
    line-height: 1.1;
    color: #111827;
  }

  .print-sheet__badge {
    border: 1px solid #9ca3af;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 700;
    color: #1f2937;
  }

  .print-sheet__meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 10px;
    font-size: 10px;
    margin-bottom: 8px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
  }

  .print-sheet__totals table,
  .print-sheet__lines table {
    width: 100%;
    border-collapse: collapse;
  }

  .print-sheet__totals {
    margin-bottom: 8px;
  }

  .print-sheet__totals th,
  .print-sheet__totals td {
    font-size: 10px;
    border: 1px solid #e5e7eb;
    padding: 4px 6px;
    text-align: left;
  }

  .print-sheet__totals th {
    width: 23%;
    background: #f8fafc;
    color: #374151;
  }

  .print-sheet__lines thead th {
    font-size: 9px;
    text-transform: uppercase;
    border: 1px solid #d1d5db;
    background: #f8fafc;
    color: #374151;
    padding: 4px 5px;
  }

  .print-sheet__lines tbody td {
    font-size: 9.5px;
    border: 1px solid #e5e7eb;
    color: #111827;
    padding: 4px 5px;
  }

  .print-sheet__obs {
    margin-top: 8px;
    font-size: 10px;
    display: grid;
    gap: 2px;
  }

  .print-sheet__signatures {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .print-sheet__signatures .line {
    border-bottom: 1px solid #6b7280;
    margin-bottom: 4px;
    min-height: 24px;
  }

  .print-sheet__signatures span {
    font-size: 9px;
    color: #374151;
  }

  .print-title {
    font-size: 20px;
    font-weight: 800;
    color: #111827;
  }

  .print-meta {
    font-size: 10px;
    color: #374151;
    margin-top: 2px;
  }

  .actions-card {
    display: none !important;
  }

  :deep(.v-btn),
  :deep(.v-field),
  :deep(.v-alert) {
    display: none !important;
  }

  :deep(.v-table) {
    border: 1px solid #d4d4d8;
  }

  :deep(.v-table thead th) {
    font-size: 9px !important;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #374151 !important;
    background: #f8fafc !important;
    border-bottom: 1px solid #d1d5db !important;
  }

  :deep(.v-table tbody td) {
    font-size: 10px !important;
    color: #111827 !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }

  :deep(.v-card) {
    box-shadow: none !important;
    border: 1px solid #e5e7eb !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  :deep(.v-container),
  :deep(.v-row),
  :deep(.v-col) {
    max-width: 100% !important;
  }
}
</style>
