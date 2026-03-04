<template>
  <v-app>
    <template v-if="!isPublicRoute">
      <SidebarMenu />
      <Header />
    </template>

    <v-main :class="{ 'auth-main': isPublicRoute }">
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
          @click="uiStore.snackbar.show = false"
        ></v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import Header from './components/HeaderView.vue'
import SidebarMenu from './components/SidebarMenu.vue'
import { RouterView } from 'vue-router';
import { useUIStore } from './stores/uiStore'; // ✅ Importamos el store de UI
import { useCosechaStore } from './stores/cosecha/cosechaStore';

const cosechaStore = useCosechaStore();
const route = useRoute();
const isPublicRoute = computed(() => route.matched.some((record) => record.meta.public));

onMounted(() => {
  // Esto activa los escuchadores de window.addEventListener
  cosechaStore.inicializarMonitoreoRed();
});

const uiStore = useUIStore(); // ✅ Instanciamos el store para que el template lo escuche
</script>

<style>
/* Estilos globales para evitar scrollbars dobles y asegurar fuentes */
html { overflow-y: auto !important; }
body { font-family: 'Plus Jakarta Sans', sans-serif; }

/* Opcional: mejora el contraste del texto en el snackbar */
.v-snackbar__content {
  font-size: 0.95rem !important;
  letter-spacing: 0.3px;
}

.auth-main {
  padding-top: 0 !important;
}
</style>
