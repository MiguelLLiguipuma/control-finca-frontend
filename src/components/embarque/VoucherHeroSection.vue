<template>
  <v-card variant="flat" class="rounded-xl mb-6 voucher-hero-alt voucher-card-border voucher-shadow-sm reveal-block reveal-1">
    <v-card-text class="pa-5 pa-md-6">
      <div class="hero-alt-grid">
        <div>
          <div class="hero-alt-kicker">Operacion de embarque</div>
          <h1 class="hero-alt-title">Control de Voucher Diario</h1>
          <p class="hero-alt-subtitle">
            Flujo simple: configura fecha y fincas, carga base, asigna cajas, confirma e imprime.
          </p>
        </div>
        <div class="d-flex align-center justify-end flex-wrap gap-2">
          <v-chip v-if="embarqueStore.voucherActual" :color="chipEstado.color" size="large" label>
            {{ chipEstado.text }}
          </v-chip>
          <v-chip v-if="embarqueStore.voucherActual" color="primary" variant="tonal" size="large">
            {{ embarqueStore.voucherActual.numero_voucher }}
          </v-chip>
        </div>
      </div>
      <div class="hero-alt-metrics mt-4">
        <div class="metric-pill">
          <span>Total racimos</span>
          <strong>{{ embarqueStore.totales.total_racimos }}</strong>
        </div>
        <div class="metric-pill">
          <span>Total cajas</span>
          <strong>{{ embarqueStore.totales.total_cajas.toFixed(2) }}</strong>
        </div>
        <div class="metric-pill">
          <span>Ratio comercial</span>
          <strong>{{ embarqueStore.totales.ratio_comercial_global.toFixed(4) }}</strong>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { useEmbarqueStore } from '@/stores/embarque/embarqueStore';

defineProps<{
  embarqueStore: ReturnType<typeof useEmbarqueStore>;
  chipEstado: { text: string; color: string };
}>();
</script>
