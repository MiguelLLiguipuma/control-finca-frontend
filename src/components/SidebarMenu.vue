<script setup lang="ts">
import { shallowRef, computed, watch, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useDisplay } from 'vuetify';
import { storeToRefs } from 'pinia';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { sidebarHelp, visibleSidebarSections } from '@/navigation/sidebar';
import SidebarNavItem from '@/components/navigation/SidebarNavItem.vue';

const sidebarStore = useSidebarStore();
const authStore = useAuthStore();
const route = useRoute();
const { mobile } = useDisplay();
const { isSidebarOpen, isMiniSidebar, isMobileView, isHoverExpanded } = storeToRefs(sidebarStore);
const hoverTimeout = shallowRef<ReturnType<typeof setTimeout> | null>(null);
const visibleSections = computed(() => visibleSidebarSections(authStore.can));
const shouldShowContent = computed(() => !isMiniSidebar.value || isMobileView.value || isHoverExpanded.value);
const isItemActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`);

function clearHoverTimeout() {
  if (hoverTimeout.value) clearTimeout(hoverTimeout.value);
  hoverTimeout.value = null;
}
function handleMouseEnter() {
  if (isMobileView.value) return;
  clearHoverTimeout();
  if (isMiniSidebar.value) sidebarStore.setHoverExpanded(true);
}
function handleMouseLeave() {
  clearHoverTimeout();
  if (isMobileView.value || !isMiniSidebar.value) return;
  hoverTimeout.value = setTimeout(() => sidebarStore.setHoverExpanded(false), 200);
}
function handleNavigation(event: MouseEvent) {
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) sidebarStore.closeSidebar();
}
function handleToggle() {
  clearHoverTimeout();
  if (isMobileView.value) sidebarStore.closeSidebar();
  else sidebarStore.toggleSidebar();
}

watch(mobile, value => {
  clearHoverTimeout();
  sidebarStore.setMobileView(Boolean(value));
}, { immediate: true });
onUnmounted(clearHoverTimeout);
</script>

<template>
  <v-navigation-drawer v-model="isSidebarOpen" :permanent="!isMobileView" :temporary="isMobileView"
    :width="sidebarStore.currentSidebarWidth" :rail-width="68" :rail="!shouldShowContent"
    color="surface" elevation="0" class="sidebar" aria-label="Menú principal"
    @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
    <template #prepend>
      <div class="sidebar-header" :class="{ 'sidebar-header-rail': !shouldShowContent }">
        <div class="sidebar-brand">
          <v-avatar color="primary" variant="tonal" size="32" rounded="lg">
            <v-icon size="21" aria-hidden="true">mdi-chart-areaspline</v-icon>
          </v-avatar>
          <span v-if="shouldShowContent" class="brand-name">ControlFinca</span>
        </div>
        <v-btn v-if="shouldShowContent" variant="text" size="small"
          :icon="isMobileView ? 'mdi-close' : isMiniSidebar ? 'mdi-chevron-right' : 'mdi-chevron-left'"
          :aria-label="isMobileView ? 'Cerrar menú' : isMiniSidebar ? 'Fijar menú abierto' : 'Contraer menú'"
          :title="isMobileView ? 'Cerrar menú' : isMiniSidebar ? 'Fijar menú abierto' : 'Contraer menú'"
          @click.stop="handleToggle" />
      </div>
    </template>

    <div class="sidebar-sections">
      <section v-for="section in visibleSections" :key="section.key" class="menu-section" :aria-label="section.label">
        <h2 v-if="shouldShowContent" class="section-label">{{ section.label }}</h2>
        <v-list nav class="sidebar-list" :aria-label="section.label">
          <SidebarNavItem v-for="item in section.items" :key="item.route" :item="item"
            :expanded="shouldShowContent" :mobile="isMobileView" :active="isItemActive(item.route)" @navigate="handleNavigation" />
        </v-list>
      </section>
    </div>

    <template #append>
      <v-list nav class="sidebar-footer" aria-label="Ayuda">
        <SidebarNavItem :item="sidebarHelp" :expanded="shouldShowContent" :mobile="isMobileView"
          :active="isItemActive(sidebarHelp.route)" @navigate="handleNavigation" />
      </v-list>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.sidebar { border-inline-end: 1px solid rgba(var(--v-theme-on-surface), 0.12); }
.sidebar-header { min-height: 60px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 4px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1); }
.sidebar-header-rail { justify-content: center; }
.sidebar-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.brand-name { font-size: 16px; font-weight: 800; letter-spacing: 0; }
.sidebar-sections { padding: 8px; }
.sidebar-list { padding: 0; }
.menu-section + .menu-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.09); }
.section-label { margin: 4px 10px 6px; font-size: 11px; font-weight: 700; line-height: 1.5; letter-spacing: 0; text-transform: uppercase; color: rgba(var(--v-theme-on-surface), 0.62); }
.sidebar-footer { padding: 8px; border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1); }
@media (prefers-reduced-motion: reduce) { .sidebar { transition: none !important; } }
</style>
