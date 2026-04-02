<template>
  <v-card variant="flat" class="rounded-xl voucher-card-border voucher-shadow-sm vouchers-list-card reveal-block reveal-5">
    <v-card-text class="pa-4">
      <div class="text-h6 font-weight-black mb-3">Vouchers del dia</div>
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
              <v-btn size="small" variant="text" color="primary" @click="embarqueStore.cargarVoucher(item.id)">
                Abrir
              </v-btn>
            </td>
          </tr>
          <tr v-if="!embarqueStore.listado.length">
            <td colspan="7" class="text-center text-medium-emphasis py-6">
              Sin vouchers para la fecha seleccionada.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { EmbarqueEstado } from '@/services/embarque/embarqueTypes';
import type { useEmbarqueStore } from '@/stores/embarque/embarqueStore';

defineProps<{
  embarqueStore: ReturnType<typeof useEmbarqueStore>;
  colorEstado: (estado: EmbarqueEstado) => string;
}>();
</script>
