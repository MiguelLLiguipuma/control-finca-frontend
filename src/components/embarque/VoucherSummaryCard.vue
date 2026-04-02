<template>
  <v-card variant="flat" class="rounded-xl voucher-card-border voucher-shadow-sm summary-side-card voucher-sticky-actions reveal-block reveal-3">
    <v-card-text class="pa-5">
      <div class="summary-side-title">Resumen y acciones</div>
      <div class="summary-side-grid mt-4">
        <div class="summary-stat">
          <span>Racimos buenos</span>
          <strong>{{ embarqueStore.totales.racimos_buenos }}</strong>
        </div>
        <div class="summary-stat">
          <span>Rechazo</span>
          <strong>{{ embarqueStore.totales.racimos_rechazo }}</strong>
        </div>
        <div class="summary-stat">
          <span>Total racimos</span>
          <strong>{{ embarqueStore.totales.total_racimos }}</strong>
        </div>
        <div class="summary-stat">
          <span>Total cajas</span>
          <strong>{{ embarqueStore.totales.total_cajas.toFixed(2) }}</strong>
        </div>
        <div class="summary-stat summary-stat--full">
          <span>Ratio comercial</span>
          <strong>{{ embarqueStore.totales.ratio_comercial_global.toFixed(4) }}</strong>
        </div>
        <div class="summary-stat summary-stat--full">
          <span>Ratio operativo</span>
          <strong>{{ embarqueStore.totales.ratio_operativo_global.toFixed(4) }}</strong>
        </div>
      </div>
      <v-divider class="my-4" />
      <div class="d-flex flex-column gap-2">
        <v-btn
          block
          color="primary"
          class="font-weight-black voucher-premium-btn btn-save"
          :loading="embarqueStore.submitting"
          :disabled="embarqueStore.submitting || !embarqueStore.esEditable || !embarqueStore.lineas.length"
          :aria-busy="embarqueStore.submitting"
          aria-label="Guardar borrador"
          @click="$emit('guardar')"
        >
          Guardar Borrador
        </v-btn>

        <v-btn
          block
          color="success"
          class="font-weight-black voucher-premium-btn btn-confirm"
          :loading="embarqueStore.submitting"
          :disabled="embarqueStore.submitting || !embarqueStore.puedeConfirmar || !canConfirmVoucher"
          :aria-busy="embarqueStore.submitting"
          aria-label="Confirmar voucher"
          @click="$emit('confirmar')"
        >
          Confirmar Voucher
        </v-btn>
        <v-alert v-if="motivoBloqueoConfirmar" type="info" variant="tonal" density="compact" class="mt-1" role="status" aria-live="polite">
          {{ motivoBloqueoConfirmar }}
        </v-alert>

        <v-btn
          block
          color="error"
          variant="tonal"
          class="font-weight-bold voucher-premium-btn btn-cancel"
          :disabled="embarqueStore.submitting || !embarqueStore.voucherActual || !embarqueStore.esEditable || !canCancelVoucher"
          aria-label="Anular voucher"
          @click="$emit('abrir-dialogo-anular')"
        >
          Anular Voucher
        </v-btn>

        <v-btn
          block
          color="secondary"
          variant="outlined"
          class="font-weight-bold voucher-premium-btn"
          :disabled="embarqueStore.submitting || !embarqueStore.lineas.length"
          aria-label="Imprimir o exportar voucher"
          @click="$emit('imprimir')"
        >
          Imprimir / PDF
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import type { useEmbarqueStore } from '@/stores/embarque/embarqueStore';

defineProps<{
  embarqueStore: ReturnType<typeof useEmbarqueStore>;
  canConfirmVoucher: boolean;
  canCancelVoucher: boolean;
  motivoBloqueoConfirmar: string;
}>();

defineEmits<{
  (e: 'guardar'): void;
  (e: 'confirmar'): void;
  (e: 'abrir-dialogo-anular'): void;
  (e: 'imprimir'): void;
}>();
</script>
