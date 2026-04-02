<template>
  <v-navigation-drawer
    v-model="isSidebarOpen"
    app
    :permanent="!isMobileView"
    :temporary="isMobileView"
    :width="sidebarWidth"
    :rail="isMiniSidebar && !isMobileView && !isHoverExpanded"
    :color="isDark ? '#0f172a' : 'white'"
    elevation="0"
    class="border-e-sm transition-sidebar"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="sidebar-header" v-if="shouldShowContent || isMiniSidebar">
      <div class="logo-container" :class="{ 'logo-container-rail': !shouldShowContent }">
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
        :aria-label="isMiniSidebar ? 'Expandir menú lateral' : 'Contraer menú lateral'"
        :title="isMiniSidebar ? 'Expandir menú lateral' : 'Contraer menú lateral'"
        @click.stop="handleSidebarToggle"
      >
        <v-icon size="20">
          {{ isMiniSidebar ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
        </v-icon>
      </v-btn>
    </div>

    <v-divider class="sidebar-divider" />

    <div class="sidebar-scroll">
      <section
        v-for="section in visibleSections"
        :key="section.key"
        class="menu-section"
      >
        <div
          v-if="shouldShowContent"
          class="section-label px-4 mb-1"
        >
          {{ section.label }}
        </div>

        <v-list nav class="sidebar-list">
          <v-list-item
            v-for="item in section.items"
            :key="item.route"
            :value="item.route"
            :active="isItemActive(item.route)"
            class="nav-item mb-2"
            :class="{
              'nav-item-mobile': isMobileView,
              'nav-item-active': isItemActive(item.route),
              'nav-item-rail': !shouldShowContent,
            }"
            :aria-label="item.title"
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
              <span class="menu-badge">
                {{ item.badge }}
              </span>
            </template>

            <template #append v-else-if="isItemActive(item.route) && shouldShowContent">
              <div class="active-indicator" />
            </template>
          </v-list-item>
        </v-list>
      </section>
    </div>

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

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme, useDisplay } from 'vuetify'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useAuthStore } from '@/stores/auth/authStore'
import type { AppPermission } from '@/utils/rbac'
import { storeToRefs } from 'pinia'

interface MenuItem {
  title: string
  icon: string
  route: string
  permission?: AppPermission
  badge?: string
  section: 'general' | 'operacion' | 'control' | 'admin'
}

interface MenuSection {
  key: MenuItem['section']
  label: string
  items: MenuItem[]
}

const sidebarStore = useSidebarStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()
const theme = useTheme()

const { isSidebarOpen, isMiniSidebar, isMobileView, isHoverExpanded } = storeToRefs(sidebarStore)
const hoverTimeout = ref<ReturnType<typeof window.setTimeout> | null>(null)

// Reactividad de Tema
const isDark = computed(() => theme.global.current.value.dark)

// --- AQUÍ ESTÁ EL CAMBIO EN EL MENÚ ---
const planningBadge = String(new Date().getFullYear())

const menuItems: MenuItem[] = [
  { 
    title: 'Dashboard', 
    icon: 'mdi-view-dashboard-outline', 
    route: '/reportes',
    permission: 'view.dashboard',
    section: 'general',
  },
  {
    title: 'Balanza',
    icon: 'mdi-scale',
    route: '/balanza',
    permission: 'view.balanza',
    section: 'general',
  },
  
  // --- NUEVO ÍTEM DE PLANIFICACIÓN ---
  { 
    title: 'Calendario Enfunde', 
    icon: 'mdi-calendar-range', // Icono de calendario profesional
    route: '/planificacion/calendario',
    badge: planningBadge,
    permission: 'view.calendario',
    section: 'operacion',
  },
  // -----------------------------------

  { title: 'Registro Enfunde', icon: 'mdi-leaf', route: '/registro-enfunde', permission: 'view.enfunde', section: 'operacion' },
  { title: 'Liquidación Cosecha', icon: 'mdi-basket-check-outline', route: '/registro-cosecha', permission: 'view.cosecha', section: 'operacion' },
  { title: 'Predicción Cosecha', icon: 'mdi-chart-bell-curve-cumulative', route: '/prediccion-cosecha', permission: 'view.cosecha', section: 'control' },
  { title: 'Voucher Embarque', icon: 'mdi-file-document-check-outline', route: '/voucher-embarque', permission: 'view.voucher', section: 'control' },
  { title: 'Centro de Alertas', icon: 'mdi-bell-alert-outline', route: '/alertas', permission: 'view.alertas', section: 'control' },
  { title: 'Auditoría', icon: 'mdi-clipboard-text-search-outline', route: '/auditoria', permission: 'view.auditoria', section: 'control' },
  { title: 'Guía de Uso', icon: 'mdi-help-circle-outline', route: '/ayuda', section: 'general' },
  
  // Sección Administrativa
  { title: 'Gestión Empresas', icon: 'mdi-domain', route: '/empresas', permission: 'view.empresas', section: 'admin' },
  { title: 'Gestión de Fincas', icon: 'mdi-map-marker-radius', route: '/fincas', permission: 'view.fincas', section: 'admin'},
  { title: 'Gestión Usuarios', icon: 'mdi-account-cog-outline', route: '/usuarios', permission: 'view.usuarios', section: 'admin' },
]

const sectionOrder: Array<{ key: MenuItem['section']; label: string }> = [
  { key: 'general', label: 'Vista General' },
  { key: 'operacion', label: 'Operación' },
  { key: 'control', label: 'Control y Seguimiento' },
  { key: 'admin', label: 'Administración' },
]

const visibleSections = computed<MenuSection[]>(() =>
  sectionOrder
    .map((section) => ({
      key: section.key,
      label: section.label,
      items: menuItems.filter(
        (item) =>
          item.section === section.key &&
          (!item.permission || authStore.can(item.permission)),
      ),
    }))
    .filter((section) => section.items.length > 0),
)

const sidebarWidth = computed(() => sidebarStore.currentSidebarWidth)
const shouldShowContent = computed(
  () => !isMiniSidebar.value || isMobileView.value || isHoverExpanded.value,
)
const isItemActive = (itemRoute: string) =>
  route.path === itemRoute || route.path.startsWith(`${itemRoute}/`)

const navigateTo = (routePath: string) => {
  if (!routePath) return
  router.push(routePath)
  if (isMobileView.value) sidebarStore.closeSidebar()
}

const handleSidebarToggle = () => sidebarStore.toggleSidebar()

// --- LÓGICA DE HOVER CON RETRASO ---
const handleMouseEnter = () => {
  if (isMobileView.value) return
  if (hoverTimeout.value) {
    clearTimeout(hoverTimeout.value)
    hoverTimeout.value = null
  }
  if (isMiniSidebar.value) {
    sidebarStore.setHoverExpanded(true)
  }
}

const handleMouseLeave = () => {
  if (isMobileView.value) return
  if (!isMiniSidebar.value) return
  hoverTimeout.value = setTimeout(() => {
    sidebarStore.setHoverExpanded(false)
  }, 200)
}

watch(mobile, (val) => sidebarStore.setMobileView(Boolean(val)), { immediate: true })

onUnmounted(() => {
  if (hoverTimeout.value) clearTimeout(hoverTimeout.value)
})
</script>

<style scoped>
.transition-sidebar {
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              background-color 0.3s ease !important;
}

.sidebar-header {
  height: 68px;
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

.logo-container-rail {
  width: 100%;
  justify-content: center;
}

.logo-text { 
  font-size: 1rem;
  font-weight: 800;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.02em;
  white-space: nowrap;
}

/* NAV ITEMS */
.nav-item {
  color: rgba(var(--v-theme-on-surface), 0.72) !important;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  overflow: hidden;
  min-height: 44px;
  border: 1px solid transparent;
  position: relative;
}

.nav-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.035) !important;
}

.nav-item-mobile {
  min-height: 48px;
}

.nav-item-rail {
  width: 56px;
  min-height: 56px;
  margin-inline: auto;
  padding-inline: 0 !important;
  border-radius: 16px !important;
}

.nav-item-rail :deep(.v-list-item__prepend) {
  width: 100%;
  margin-inline-end: 0;
  justify-content: center;
}

.nav-item-rail :deep(.v-list-item__spacer) {
  display: none;
}

.nav-item-rail :deep(.v-list-item__content),
.nav-item-rail :deep(.v-list-item__append) {
  display: none;
}

.nav-item-rail .nav-icon {
  font-size: 22px;
}

.nav-item-rail:deep(.v-list-item__overlay) {
  border-radius: 16px;
}

.nav-item:deep(.v-list-item--active) {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  color: rgb(var(--v-theme-primary)) !important;
  border-color: rgba(var(--v-theme-primary), 0.12) !important;
}

.nav-icon {
  font-size: 18px;
  opacity: 0.9;
}

.v-list-item--active .nav-icon {
  opacity: 1;
}

/* INDICADOR LATERAL */
.active-indicator {
  width: 3px;
  height: 16px;
  border-radius: 4px;
  background: rgb(var(--v-theme-primary));
}

.sidebar-divider {
  opacity: 0.1;
  border-color: rgba(var(--v-border-color), 0.2) !important;
}

.sidebar-scroll {
  padding: 8px 10px 14px;
  overflow-y: auto;
  height: calc(100% - 69px - 58px);
}

.menu-section + .menu-section {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.06);
}

.section-label {
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), 0.36);
}

.footer-text {
  font-size: 0.62rem;
  font-weight: 800;
  color: rgba(var(--v-theme-on-surface), 0.36);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.menu-badge {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
  border-radius: 999px;
  padding: 1px 7px;
}

.nav-title {
  white-space: nowrap;
  font-size: 0.93rem;
}

@media (max-width: 959px) {
  .sidebar-scroll {
    height: calc(100% - 73px - 56px);
    padding-inline: 12px;
  }

  .nav-item:hover {
    transform: none;
  }
}
</style>
