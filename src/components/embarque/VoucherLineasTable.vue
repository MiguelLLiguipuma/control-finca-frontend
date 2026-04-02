<template>
  <v-card variant="flat" class="rounded-xl mb-6 voucher-card-border voucher-shadow-sm detail-table-card reveal-block reveal-4">
    <v-card-text class="pa-0">
      <div class="table-heading">
        <div>
          <div class="table-heading__title">Detalle por cinta y finca</div>
          <div class="table-heading__subtitle">Edita cajas por linea para ajustar ratios de salida.</div>
        </div>
      </div>
      <v-table density="comfortable" fixed-header :height="lineasTableHeight">
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
</template>

<script setup lang="ts">
import type { useEmbarqueStore } from '@/stores/embarque/embarqueStore';

defineProps<{
  embarqueStore: ReturnType<typeof useEmbarqueStore>;
  lineasTableHeight: string;
}>();
</script>
