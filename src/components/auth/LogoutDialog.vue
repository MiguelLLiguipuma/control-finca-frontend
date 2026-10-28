<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth/authStore';
import { useCosechaStore } from '@/stores/cosecha/cosechaStore';
import { propietarioCosecha } from '@/utils/cosechaLocal';
import { readLocalWork } from '@/utils/localWork';

const open = defineModel<boolean>({ required: true });
const auth = useAuthStore();
const harvest = useCosechaStore();
const work = ref(readLocalWork(null));
const busy = computed(() => harvest.submitting || harvest.sincronizando);
watch(open, (value) => { if (value) work.value = readLocalWork(propietarioCosecha()); });
</script>

<template>
  <v-dialog v-model="open" max-width="480" aria-labelledby="logout-title">
    <v-card rounded="lg">
      <v-card-title id="logout-title">Cerrar sesión</v-card-title>
      <v-card-text>
        <p class="mb-3">{{ auth.userName }}</p>
        <v-alert v-if="busy" type="info" variant="tonal">Espera a que termine el envío antes de salir.</v-alert>
        <v-alert v-else-if="work.unreadable" type="warning" variant="tonal">No se pudo comprobar todo el almacenamiento local. Revisa tus reportes antes de salir.</v-alert>
        <p v-else-if="work.pending || work.failed || work.drafts">
          En este dispositivo hay {{ work.pending }} reportes pendientes, {{ work.failed }} por corregir y {{ work.drafts }} borradores de cosecha.
        </p>
        <p class="mt-3">Los reportes guardados localmente se conservan para esta cuenta, pero no están respaldados en el servidor hasta sincronizarse. Los cambios sin guardar en otros formularios se perderán.</p>
      </v-card-text>
      <v-card-actions class="pa-4 flex-wrap">
        <v-btn variant="text" @click="open = false">Seguir trabajando</v-btn>
        <v-btn color="primary" variant="flat" :disabled="busy" @click="auth.logout()">Cerrar sesión</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.v-btn) { min-height: 44px; text-transform: none; letter-spacing: 0; }
</style>
