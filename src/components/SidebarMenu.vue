<template>
  <v-navigation-drawer
    v-model="isSidebarOpen"
    app
    :permanent="!isMobileView"
    :temporary="isMobileView"
    :width="sidebarWidth"
    :rail="isMiniSidebar && !isMobileView"
    :color="isDark ? '#0f172a' : 'white'"
    elevation="0"
    class="border-e-sm transition-sidebar"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="sidebar-header" v-if="shouldShowContent || isMiniSidebar">
      <div class="logo-container">
        <v-avatar color="primary" variant="tonal" size="36" rounded="lg">
          <v-icon size="24">mdi-chart-areaspline</v-icon>
        </v-avatar>
        <span v-if="shouldShowContent" class="logo-text">ControlFinca</span>
      </div>

      <v-btn
        v-if="!isMobileView && shouldShowContent"
        icon
        variant="text"
        size="small"
        color="medium-emphasis"
        @click.stop="handleSidebarToggle"
      >
        <v-icon size="20">
          {{ isMiniSidebar ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
        </v-icon>
      </v-btn>
    </div>

    <v-divider class="sidebar-divider" />

    <v-list nav class="sidebar-list mt-2">
      <v-list-item
        v-for="item in visibleMenuItems"
        :key="item.route"
        :value="item.route"
        :active="isItemActive(item.route)"
        class="nav-item mb-2"
        @click="navigateTo(item.route)"
        rounded="lg"
      >
        <template #prepend>
          <v-icon class="nav-icon" :icon="item.icon" />
        </template>

        <v-list-item-title class="nav-title font-weight-bold">
          {{ item.title }}
        </v-list-item-title>

        <template #append v-if="item.badge && shouldShowContent">
          <v-badge
            :content="item.badge"
            color="primary"
            inline
            class="custom-badge"
          />
        </template>
        
        <template #append v-else-if="isItemActive(item.route) && shouldShowContent">
          <div class="active-indicator" />
        </template>
      </v-list-item>
    </v-list>

    <template #append>
      <div class="sidebar-footer">
        <v-divider class="sidebar-divider" />
        <div 
          class="footer-content px-4 py-4 d-flex align-center" 
          :class="{ 'justify-center': isMiniSidebar }"
        >
          <v-icon size="16" color="medium-emphasis" :class="{ 'mr-2': !isMiniSidebar }">
            mdi-information-outline
          </v-icon>
          <span v-if="shouldShowContent" class="footer-text">Versión 2.1.0</span>
        </div>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme, useDisplay } from 'vuetify'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useAuthStore } from '@/stores/auth/authStore'
import { storeToRefs } from 'pinia'

const sidebarStore = useSidebarStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()
const theme = useTheme()

const { isSidebarOpen, isMiniSidebar, isMobileView } = storeToRefs(sidebarStore)
const hoverTimeout = ref(null)

// Reactividad de Tema
const isDark = computed(() => theme.global.current.value.dark)

// --- AQUÍ ESTÁ EL CAMBIO EN EL MENÚ ---
const menuItems = ref([
  { 
    title: 'Dashboard', 
    icon: 'mdi-view-dashboard-outline', 
    route: '/reportes',
    permission: 'view.dashboard',
  },
  {
    title: 'Balanza',
    icon: 'mdi-scale',
    route: '/balanza',
    permission: 'view.balanza',
  },
  
  // --- NUEVO ÍTEM DE PLANIFICACIÓN ---
  { 
    title: 'Calendario Enfunde', 
    icon: 'mdi-calendar-range', // Icono de calendario profesional
    route: '/planificacion/calendario',
    badge: '2026', // Opcional: Destaca que es para el nuevo año
    permission: 'view.calendario',
  },
  // -----------------------------------

  { title: 'Registro Enfunde', icon: 'mdi-leaf', route: '/registro-enfunde', permission: 'view.enfunde' },
  { title: 'Liquidación Cosecha', icon: 'mdi-basket-check-outline', route: '/registro-cosecha', permission: 'view.cosecha' },
  { title: 'Voucher Embarque', icon: 'mdi-file-document-check-outline', route: '/voucher-embarque', permission: 'view.voucher' },
  { title: 'Centro de Alertas', icon: 'mdi-bell-alert-outline', route: '/alertas', permission: 'view.alertas' },
  { title: 'Auditoría', icon: 'mdi-clipboard-text-search-outline', route: '/auditoria', permission: 'view.auditoria' },
  
  // Sección Administrativa
  { title: 'Gestión Empresas', icon: 'mdi-domain', route: '/empresas', permission: 'view.empresas' },
  { title: 'Gestión de Fincas', icon: 'mdi-map-marker-radius', route: '/fincas', permission: 'view.fincas'},
  { title: 'Gestión Usuarios', icon: 'mdi-account-cog-outline', route: '/usuarios', permission: 'view.usuarios' },
])
const visibleMenuItems = computed(() =>
  menuItems.value.filter((item) => !item.permission || authStore.can(item.permission)),
)

const sidebarWidth = computed(() => sidebarStore.currentSidebarWidth)
const shouldShowContent = computed(() => !isMiniSidebar.value || isMobileView.value)
const isItemActive = (itemRoute) => route.path === itemRoute

const navigateTo = (routePath) => {
  if (!routePath) return
  router.push(routePath)
  if (isMobileView.value) sidebarStore.closeSidebar()
}

const handleSidebarToggle = () => sidebarStore.toggleSidebar()

// --- LÓGICA DE HOVER CON RETRASO ---
const handleMouseEnter = () => {
  if (isMobileView.value) return
  clearTimeout(hoverTimeout.value) 
  if (isMiniSidebar.value) {
    sidebarStore.setMiniSidebar(false)
  }
}

const handleMouseLeave = () => {
  if (isMobileView.value) return
  hoverTimeout.value = setTimeout(() => {
    if (!isMiniSidebar.value) {
      sidebarStore.setMiniSidebar(true)
    }
  }, 200)
}

watch(mobile, (val) => sidebarStore.setMobileView(val), { immediate: true })

onUnmounted(() => clearTimeout(hoverTimeout.value))
</script>

<style scoped>
.transition-sidebar {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              background-color 0.3s ease !important;
}

.sidebar-header {
  height: 72px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo-container {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 40px;
}

.logo-text { 
  font-size: 1.1rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.5px;
  white-space: nowrap;
}

/* NAV ITEMS */
.nav-item {
  color: rgba(var(--v-theme-on-surface), 0.6) !important;
  transition: all 0.2s ease;
  overflow: hidden;
}

.nav-item:deep(.v-list-item--active) {
  background: rgba(var(--v-theme-primary), 0.1) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

.nav-icon {
  font-size: 20px;
  opacity: 0.8;
}

.v-list-item--active .nav-icon {
  opacity: 1;
}

/* INDICADOR LATERAL */
.active-indicator {
  width: 4px;
  height: 18px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}

.sidebar-divider {
  opacity: 0.1;
  border-color: rgba(var(--v-border-color), 0.2) !important;
}

.footer-text {
  font-size: 0.65rem;
  font-weight: 800;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.custom-badge :deep(.v-badge__wrapper) {
  font-size: 8px;
  height: 16px;
  min-width: 16px;
}

.nav-title {
  white-space: nowrap;
}
</style>
