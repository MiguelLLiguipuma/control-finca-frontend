<template>
  <v-dialog v-model="dialogOpen" max-width="520">
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
        <v-btn variant="text" @click="dialogOpen = false">Cancelar</v-btn>
        <v-btn color="error" :loading="submitting" @click="$emit('confirm')">Confirmar Anulacion</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const dialogOpen = defineModel<boolean>({ required: true });
const motivoAnulacion = defineModel<string>('motivoAnulacion', { required: true });

defineProps<{
  submitting: boolean;
}>();

defineEmits<{
  (e: 'confirm'): void;
}>();
</script>
