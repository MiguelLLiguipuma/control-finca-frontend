<template>
  <v-app-bar
    app
    flat
    height="100"
    color="transparent"
    class="px-4"
  >
    <v-card class="floating-header mx-auto w-100 bg-surface" elevation="2">
      <v-container fluid class="py-1">
        <v-row align="center" justify="space-between" no-gutters>
          
          <v-col cols="auto" class="d-flex align-center">
            <v-btn 
              icon 
              variant="text"
              @click="toggleSidebar()" 
              class="nav-btn mr-2"
            >
              <v-icon size="28">mdi-menu</v-icon>
            </v-btn>
            
            <v-breadcrumbs 
              :items="['Dashboard', 'Reportes']" 
              class="breadcrumbs d-none d-sm-flex"
            />
          </v-col>

          <v-col cols="auto" class="text-center">
            <div class="brand-container">
              <v-icon size="32" color="primary" class="brand-icon mr-2">mdi-sprout-outline</v-icon>
              <span class="brand-text d-none d-md-inline">ControlFinca</span>
            </div>
          </v-col>

          <v-col cols="auto" class="d-flex align-center justify-end">
            <div class="user-actions d-flex align-center gap-2">
              
              <v-btn icon variant="text" @click="toggleDarkMode">
                <v-icon :color="theme.global.current.value.dark ? 'yellow' : 'slate-600'">
                  {{ theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night' }}
                </v-icon>
              </v-btn>

              <div class="user-info d-none d-sm-flex mr-2 align-center">
                <v-avatar size="36" color="primary" class="mr-2">
                  <span class="text-white font-weight-bold text-h6">
                    {{ authStore.userInitials }}
                  </span>
                </v-avatar>
                <div class="user-details text-left">
                  <div class="user-name text-caption font-weight-bold">
                    {{ authStore.userName }}
                  </div>
                  <div class="user-role text-overline" style="font-size: 0.6rem !important;">
                    {{ authStore.userRole }}
                  </div>
                </div>
              </div>

              <v-menu location="bottom end">
                <template v-slot:activator="{ props }">
                  <v-btn icon v-bind="props" variant="tonal" size="small">
                    <v-icon>mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
                <v-list nav width="180" class="rounded-lg mt-2">
                  <v-list-item prepend-icon="mdi-account-outline" title="Mi Perfil" />
                  <v-list-item prepend-icon="mdi-cog-outline" title="Ajustes" />
                  <v-divider class="my-2" />
                  <v-list-item 
                    prepend-icon="mdi-logout" 
                    title="Salir" 
                    color="error" 
                    @click="authStore.logout()"
                  />
                </v-list>
              </v-menu>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-card>
  </v-app-bar>
</template>

<script setup>
import { useTheme } from 'vuetify'; // 1. Importamos el hook de tema
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '../stores/auth/authStore';

const theme = useTheme(); // 2. Instanciamos el tema
const sidebarStore = useSidebarStore();
const authStore = useAuthStore();

const toggleSidebar = () => sidebarStore.toggleSidebar();

// 3. Función para alternar entre light y dark
const toggleDarkMode = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
};
</script>

<style scoped>
.floating-header {
  border-radius: 16px !important;
  /* 4. Quitamos el blanco fijo y usamos opacidad sobre el color de superficie del tema */
  background: rgba(var(--v-theme-surface), 0.8) !important;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
  max-width: 1400px;
}

.brand-text {
  font-size: 1.1rem;
  font-weight: 800;
  /* 5. Quitamos color fijo para que se adapte automáticamente */
  letter-spacing: -0.5px;
}

.user-info {
  /* 6. Fondo adaptable para la info del usuario */
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), 0.05);
}

.user-name { line-height: 1.2; }
.user-role { opacity: 0.7; line-height: 1; }

.gap-2 { gap: 8px; }

:deep(.v-toolbar__content) {
  padding: 0 !important;
}
</style>