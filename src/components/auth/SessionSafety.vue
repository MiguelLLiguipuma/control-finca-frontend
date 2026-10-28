<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { useAuthStore } from '@/stores/auth/authStore';
import { readSessionToken } from '@/utils/sessionPolicy';

const auth = useAuthStore();
const changed = shallowRef(false);
function checkSession() {
  if (readSessionToken() !== auth.token) changed.value = true;
}
function onStorage(event: StorageEvent) {
  if (event.key === 'token' || event.key === 'user' || event.key === null) checkSession();
}
function reopen() { window.location.replace('/login'); }
onMounted(() => {
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', checkSession);
});
onUnmounted(() => {
  window.removeEventListener('storage', onStorage);
  window.removeEventListener('focus', checkSession);
});
</script>

<template>
  <v-dialog :model-value="changed" persistent max-width="480" aria-labelledby="session-changed-title">
    <v-card rounded="lg">
      <v-card-title id="session-changed-title" class="text-wrap">La sesión cambió en otra pestaña</v-card-title>
      <v-card-text>
        <p>Las solicitudes de esta pantalla se han detenido para no mezclar cuentas.</p>
        <p class="mt-3">Los reportes ya guardados en este dispositivo se conservan con su cuenta original. Los cambios que no llegaron a guardarse pueden perderse al reabrir.</p>
      </v-card-text>
      <v-card-actions class="pa-4"><v-btn color="primary" variant="flat" @click="reopen">Volver al inicio de sesión</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
:deep(.v-btn) { min-height: 44px; height: auto; white-space: normal; text-transform: none; letter-spacing: 0; }
:deep(.v-btn__content) { white-space: normal; padding-block: 8px; }
</style>
