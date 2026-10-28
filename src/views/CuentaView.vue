<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useAuthStore } from '@/stores/auth/authStore';
import { propietarioCosecha } from '@/utils/cosechaLocal';
import { readLocalWork, exportLocalWork } from '@/utils/localWork';
import LogoutDialog from '@/components/auth/LogoutDialog.vue';

const auth = useAuthStore();
const work = ref(readLocalWork(null));
const error = shallowRef('');
const logoutOpen = shallowRef(false);
const hasWork = computed(() => work.value.pending + work.value.failed + work.value.drafts > 0 || work.value.unreadable);
function refresh() { work.value = readLocalWork(propietarioCosecha()); }
function download() {
  error.value = '';
  try {
    const backup = exportLocalWork(propietarioCosecha());
    if (!Object.keys(backup.entries).length) { refresh(); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `control-finca-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { error.value = 'No se pudo descargar el respaldo. Conserva los datos de este navegador.'; }
}
onMounted(refresh);
</script>

<template>
  <v-container class="account-page">
    <header class="account-page__header"><h1>Mi cuenta</h1><v-btn variant="text" prepend-icon="mdi-logout" @click="logoutOpen = true">Cerrar sesión</v-btn></header>
    <section class="account-page__section" aria-labelledby="account-access">
      <h2 id="account-access">Identidad y acceso</h2>
      <dl class="account-page__identity">
        <div><dt>Usuario</dt><dd>{{ auth.userName }}</dd></div>
        <div><dt>Rol</dt><dd>{{ auth.userRole }}</dd></div>
      </dl>
      <p>Para cambiar tus datos, recuperar tu contraseña o solicitar acceso a otra finca, contacta al administrador de tu empresa.</p>
    </section>
    <section class="account-page__section" aria-labelledby="account-local">
      <div class="account-page__header"><h2 id="account-local">Trabajo en este dispositivo</h2><v-btn icon="mdi-refresh" variant="text" aria-label="Actualizar trabajo local" title="Actualizar trabajo local" @click="refresh" /></div>
      <p>Solo se muestran los reportes de cosecha de esta cuenta guardados en este navegador.</p>
      <v-alert v-if="work.unreadable" type="warning" variant="tonal" class="my-4">Hay datos locales que requieren revisión. No borres los datos del navegador.</v-alert>
      <dl class="account-page__counts">
        <div><dd>{{ work.pending }}</dd><dt>Pendientes de envío</dt></div>
        <div><dd>{{ work.failed }}</dd><dt>Por corregir</dt></div>
        <div><dd>{{ work.drafts }}</dd><dt>Borradores</dt></div>
      </dl>
      <div class="account-page__actions">
        <v-btn v-if="auth.can('view.cosecha')" color="primary" variant="flat" to="/conteo-cosecha-movil">Revisar conteos</v-btn>
        <v-btn variant="outlined" prepend-icon="mdi-download" :disabled="!hasWork" @click="download">Descargar respaldo local</v-btn>
      </div>
      <p class="mt-4">El respaldo contiene datos de tu operación, no contraseñas ni tokens. Guárdalo en un lugar privado. Su recuperación requiere revisión técnica; descargarlo no sincroniza los reportes.</p>
      <v-alert v-if="error" type="error" variant="tonal" class="mt-4">{{ error }}</v-alert>
    </section>
    <section class="account-page__section" aria-labelledby="account-help">
      <h2 id="account-help">Ayuda y cuidado de tus datos</h2>
      <p>No compartas tu cuenta. En equipos compartidos, cierra sesión al terminar. No borres los datos del navegador si hay reportes sin sincronizar.</p>
      <v-btn class="mt-4" variant="text" to="/ayuda">Abrir guía de uso</v-btn>
    </section>
    <LogoutDialog v-model="logoutOpen" />
  </v-container>
</template>

<style scoped>
.account-page { max-width: 960px; padding: 24px; }
.account-page__header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.account-page h1 { font-size: 28px; }
.account-page h2 { font-size: 20px; margin-bottom: 12px; }
.account-page__section { padding: 24px 0; border-bottom: 1px solid rgba(var(--v-border-color), .16); }
.account-page p { color: rgba(var(--v-theme-on-surface), .75); line-height: 1.6; font-size: 14px; }
.account-page__identity, .account-page__counts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 20px 0; }
.account-page dt { font-size: 13px; color: rgba(var(--v-theme-on-surface), .7); }
.account-page dd { font-weight: 650; overflow-wrap: anywhere; }
.account-page__counts dd { font-size: 26px; font-variant-numeric: tabular-nums; }
.account-page__actions { display: flex; flex-wrap: wrap; gap: 12px; }
.account-page :deep(.v-btn) { min-height: 44px; text-transform: none; letter-spacing: 0; }
@media (max-width: 480px) { .account-page { padding: 16px; } .account-page__identity { grid-template-columns: 1fr; } }
</style>
