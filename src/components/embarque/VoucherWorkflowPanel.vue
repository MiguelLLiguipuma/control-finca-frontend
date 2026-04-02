<template>
  <v-card variant="flat" class="rounded-xl voucher-card-border voucher-shadow-sm workflow-card reveal-block reveal-2">
    <v-card-text class="pa-5 pa-md-6">
      <div class="workflow-step">
        <div class="workflow-step__index">1</div>
        <div class="workflow-step__content">
          <div class="workflow-step__title">Contexto del embarque</div>
          <div class="workflow-step__subtitle">Define fecha, fincas y semana de corte.</div>
          <v-row class="mt-2">
            <v-col cols="12" md="4">
              <label class="voucher-custom-label">Fecha Embarque</label>
              <v-menu v-model="menuFecha" :close-on-content-click="false" location="bottom center">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    id="voucher-fecha-embarque"
                    :model-value="embarqueStore.fechaEmbarque"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    readonly
                    prepend-inner-icon="mdi-calendar"
                    :disabled="embarqueStore.submitting"
                    aria-label="Seleccionar fecha de embarque"
                  />
                </template>
                <v-date-picker
                  v-model="fechaVoucherPicker"
                  color="primary"
                  :min="fechaMinima"
                  :max="fechaMaxima"
                  :allowed-dates="fechaVoucherPermitida"
                  aria-label="Calendario de fecha de embarque"
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
                role="status"
                aria-live="polite"
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

            <v-col cols="12" md="5">
              <label class="voucher-custom-label">Fincas (misma empresa)</label>
              <v-autocomplete
                id="voucher-fincas"
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
                aria-label="Seleccionar fincas del voucher"
              >
                <template #item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    :subtitle="item.raw.empresa_nombre || `Empresa ${item.raw.empresa_id}`"
                  />
                </template>
              </v-autocomplete>
            </v-col>

            <v-col cols="12" md="3">
              <label class="voucher-custom-label">Semana Corte</label>
              <v-text-field
                id="voucher-semana-corte"
                v-model.number="embarqueStore.semanaCorte"
                type="number"
                min="1"
                max="52"
                density="comfortable"
                variant="outlined"
                hide-details
                :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                inputmode="numeric"
                aria-label="Semana de corte"
              />
            </v-col>
          </v-row>
          <v-row class="mt-2">
            <v-col cols="12" md="4">
              <v-btn
                block
                color="primary"
                class="font-weight-bold voucher-premium-btn"
                :loading="embarqueStore.loading"
                :disabled="embarqueStore.submitting"
                :aria-busy="embarqueStore.loading"
                aria-label="Cargar base del día"
                @click="$emit('refresh-base')"
              >
                Cargar Base del Dia
              </v-btn>
            </v-col>
            <v-col cols="12" md="4">
              <v-btn
                block
                color="secondary"
                variant="tonal"
                class="font-weight-bold voucher-premium-btn"
                :loading="embarqueStore.loading"
                :disabled="embarqueStore.submitting"
                :aria-busy="embarqueStore.loading"
                aria-label="Buscar vouchers"
                @click="$emit('buscar-vouchers')"
              >
                Buscar Vouchers
              </v-btn>
            </v-col>
          </v-row>
          <v-alert
            v-if="avisoEmpresa"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-3"
            role="status"
            aria-live="polite"
          >
            {{ avisoEmpresa }}
          </v-alert>
        </div>
      </div>

      <v-divider class="my-5" />

      <div class="workflow-step">
        <div class="workflow-step__index">2</div>
        <div class="workflow-step__content">
          <div class="workflow-step__title">Asignacion y busqueda</div>
          <div class="workflow-step__subtitle">
            Asigna cajas generales o por finca y filtra vouchers existentes.
          </div>
          <v-row class="mt-2">
            <v-col cols="12" md="4">
              <label class="voucher-custom-label">Ingreso General de Cajas</label>
              <v-text-field
                id="voucher-cajas-semana"
                v-model.number="cajasSemanaInput"
                type="number"
                min="0"
                step="0.01"
                density="comfortable"
                variant="outlined"
                hide-details
                :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                inputmode="decimal"
                aria-label="Ingreso general de cajas"
              />
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-end">
              <v-btn
                block
                color="primary"
                variant="tonal"
                class="font-weight-bold voucher-premium-btn"
                :disabled="!embarqueStore.esEditable || embarqueStore.submitting || !embarqueStore.lineas.length"
                aria-label="Aplicar cajas a las líneas"
                @click="$emit('aplicar-cajas-semana')"
              >
                Aplicar a lineas
              </v-btn>
            </v-col>
            <v-col cols="12" md="4">
              <label class="voucher-custom-label">Buscar Voucher por Fecha</label>
              <v-menu v-model="menuFechaBusqueda" :close-on-content-click="false" location="bottom center">
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    id="voucher-fecha-busqueda"
                    :model-value="fechaBusqueda"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                    readonly
                    prepend-inner-icon="mdi-magnify"
                    :disabled="embarqueStore.submitting"
                    aria-label="Buscar voucher por fecha"
                  />
                </template>
                <v-date-picker
                  v-model="fechaBusquedaPicker"
                  color="secondary"
                  :min="fechaMinima"
                  :max="fechaMaxima"
                  aria-label="Calendario de búsqueda de voucher"
                  @update:model-value="menuFechaBusqueda = false"
                />
              </v-menu>
            </v-col>
            <v-col cols="12" md="6">
              <label class="voucher-custom-label">Buscar por Numero</label>
              <v-text-field
                id="voucher-numero-busqueda"
                v-model="numeroVoucherBusqueda"
                density="comfortable"
                variant="outlined"
                hide-details
                clearable
                placeholder="VCH-2026-0001"
                prepend-inner-icon="mdi-pound"
                :disabled="embarqueStore.submitting"
                aria-label="Buscar voucher por número"
                @keyup.enter="$emit('buscar-vouchers')"
              />
            </v-col>
            <v-col cols="12" md="6">
              <label class="voucher-custom-label">Modo de Busqueda</label>
              <v-btn-toggle
                v-model="modoBusquedaNumero"
                mandatory
                density="comfortable"
                divided
                color="secondary"
                class="w-100"
                aria-label="Modo de búsqueda por número"
              >
                <v-btn value="contains" size="small">Parcial</v-btn>
                <v-btn value="exact" size="small">Exacto</v-btn>
              </v-btn-toggle>
            </v-col>
          </v-row>
        </div>
      </div>

      <v-row v-if="resumenFincas.length" class="mt-4">
        <v-col cols="12">
          <v-card variant="tonal" color="primary" class="rounded-lg voucher-card-border">
            <v-card-text class="pa-4">
              <div class="text-subtitle-1 font-weight-black mb-3">Distribucion de Cajas por Finca</div>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Finca</th>
                    <th class="text-right">Buenos</th>
                    <th class="text-right">Total</th>
                    <th style="width: 170px;">Cajas Finca</th>
                    <th class="text-right">Ratio Com</th>
                    <th class="text-right">Ratio Op</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in resumenFincas" :key="row.finca_id">
                    <td>{{ row.finca_nombre }}</td>
                    <td class="text-right">{{ row.racimos_buenos }}</td>
                    <td class="text-right">{{ row.total_racimos }}</td>
                    <td>
                      <v-text-field
                        :id="`voucher-cajas-finca-${row.finca_id}`"
                        :model-value="cajasPorFinca[row.finca_id]"
                        type="number"
                        min="0"
                        step="0.01"
                        density="compact"
                        variant="outlined"
                        hide-details
                        :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                        inputmode="decimal"
                        :aria-label="`Cajas para ${row.finca_nombre}`"
                        @update:model-value="actualizarCajasFinca(row.finca_id, $event)"
                      />
                    </td>
                    <td class="text-right">{{ row.ratio_comercial.toFixed(4) }}</td>
                    <td class="text-right">{{ row.ratio_operativo.toFixed(4) }}</td>
                    <td class="text-right">
                      <v-btn
                        size="small"
                        color="primary"
                        variant="tonal"
                        :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
                        :aria-label="`Aplicar cajas a ${row.finca_nombre}`"
                        @click="$emit('aplicar-cajas-finca', row.finca_id)"
                      >
                        Aplicar
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-2">
        <v-col cols="12">
          <label class="voucher-custom-label" for="voucher-observaciones">Observaciones</label>
          <v-textarea
            id="voucher-observaciones"
            v-model="embarqueStore.observaciones"
            rows="2"
            density="comfortable"
            variant="outlined"
            hide-details
            :disabled="!embarqueStore.esEditable || embarqueStore.submitting"
            aria-label="Observaciones del voucher"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { useEmbarqueStore } from '@/stores/embarque/embarqueStore';
import type { Finca } from '@/stores/fincaStore';

interface FechaOcupadaState {
  cosecha: boolean;
  voucher: boolean;
}

interface ResumenFinca {
  finca_id: number;
  finca_nombre: string;
  racimos_buenos: number;
  total_racimos: number;
  total_cajas: number;
  ratio_comercial: number;
  ratio_operativo: number;
}

const menuFecha = defineModel<boolean>('menuFecha', { required: true });
const fechaVoucherPicker = defineModel<Date | null>('fechaVoucherPicker', { required: true });
const menuFechaBusqueda = defineModel<boolean>('menuFechaBusqueda', { required: true });
const fechaBusqueda = defineModel<string>('fechaBusqueda', { required: true });
const fechaBusquedaPicker = defineModel<Date | null>('fechaBusquedaPicker', { required: true });
const numeroVoucherBusqueda = defineModel<string>('numeroVoucherBusqueda', { required: true });
const modoBusquedaNumero = defineModel<'contains' | 'exact'>('modoBusquedaNumero', { required: true });
const cajasSemanaInput = defineModel<number>('cajasSemanaInput', { required: true });
const cajasPorFinca = defineModel<Record<number, number>>('cajasPorFinca', { required: true });

const props = defineProps<{
  embarqueStore: ReturnType<typeof useEmbarqueStore>;
  fincasDisponibles: Finca[];
  fechaMinima: Date;
  fechaMaxima: Date;
  fechaVoucherPermitida: (value: unknown) => boolean;
  estadoFechaSeleccionada: FechaOcupadaState | null;
  avisoEmpresa: string;
  resumenFincas: ResumenFinca[];
}>();

defineEmits<{
  (e: 'refresh-base'): void;
  (e: 'buscar-vouchers'): void;
  (e: 'aplicar-cajas-semana'): void;
  (e: 'aplicar-cajas-finca', fincaId: number): void;
}>();

function actualizarCajasFinca(fincaId: number, value: string | number | null) {
  cajasPorFinca.value = {
    ...cajasPorFinca.value,
    [fincaId]: Number(value || 0),
  };
}
</script>
