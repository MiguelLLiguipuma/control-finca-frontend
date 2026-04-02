<template>
  <v-app>
    <a href="#main-content" class="skip-link">Saltar al contenido principal</a>

    <template v-if="!isPublicRoute">
      <SidebarMenu />
      <Header />
    </template>

    <v-main
      id="main-content"
      tabindex="-1"
      :class="{ 'auth-main': isPublicRoute }"
    >
      <RouterView />
    </v-main>

    <v-snackbar
      v-model="uiStore.snackbar.show"
      :color="uiStore.snackbar.color"
      :timeout="uiStore.snackbar.timeout"
      location="top right"
      elevation="24"
      class="mt-4"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-3">
          {{ 
            uiStore.snackbar.color === 'error' ? 'mdi-alert-circle' : 
            uiStore.snackbar.color === 'warning' ? 'mdi-alert' : 
            'mdi-information' 
          }}
        </v-icon>
        <span class="font-weight-medium">{{ uiStore.snackbar.text }}</span>
      </div>

      <template v-slot:actions>
        <v-btn
          variant="text"
          icon="mdi-close"
          aria-label="Cerrar notificación"
          @click="uiStore.snackbar.show = false"
        ></v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import Header from './components/HeaderView.vue';
import SidebarMenu from './components/SidebarMenu.vue';
import { useUIStore } from './stores/uiStore';
import { useCosechaStore } from './stores/cosecha/cosechaStore';

const cosechaStore = useCosechaStore();
const route = useRoute();
const uiStore = useUIStore();
const isPublicRoute = computed(() =>
	route.matched.some((record) => Boolean(record.meta.public)),
);

onMounted(() => {
  cosechaStore.inicializarMonitoreoRed();
});
</script>

<style>
/* Estilos globales para evitar scrollbars dobles y asegurar fuentes */
html { overflow-y: auto !important; }

.skip-link {
  position: absolute;
  left: 16px;
  top: -48px;
  z-index: 2000;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-weight: 700;
  text-decoration: none;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 16px;
}

/* Opcional: mejora el contraste del texto en el snackbar */
.v-snackbar__content {
  font-size: 0.95rem !important;
  letter-spacing: 0.3px;
}

.auth-main {
  padding-top: 0 !important;
}

#main-content {
  scroll-margin-top: 110px;
}
</style>
