<script setup lang="ts">
import type { SidebarItem } from '@/navigation/sidebar';

defineProps<{ item: SidebarItem; expanded: boolean; mobile: boolean; active: boolean }>();
defineEmits<{ navigate: [event: MouseEvent] }>();
</script>

<template>
  <v-tooltip location="end" :disabled="expanded" :text="item.title">
    <template #activator="{ props }">
      <v-list-item v-bind="props" :to="item.route" :active="active" :aria-current="active ? 'page' : undefined"
        :aria-label="item.title" class="nav-item" :class="{ 'nav-item-rail': !expanded, 'nav-item-mobile': mobile }"
        rounded="lg" @click="$emit('navigate', $event)">
        <template #prepend><v-icon :icon="item.icon" class="nav-icon" aria-hidden="true" /></template>
        <v-list-item-title class="nav-title">{{ item.title }}</v-list-item-title>
      </v-list-item>
    </template>
  </v-tooltip>
</template>

<style scoped>
.nav-item { min-height: 42px; margin-block: 2px; color: rgba(var(--v-theme-on-surface), 0.78); border: 1px solid transparent; }
.nav-item:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.nav-item.v-list-item--active { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.08); border-color: rgba(var(--v-theme-primary), 0.16); }
.nav-item.v-list-item--active :deep(.v-list-item__overlay) { opacity: 0; }
.nav-item:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }
.nav-icon { font-size: 20px; opacity: 1; }
.nav-item :deep(.v-list-item__spacer) { width: 12px; }
.nav-title { font-size: 14px; font-weight: 600; white-space: normal; overflow-wrap: anywhere; line-height: 1.3; letter-spacing: 0; }
.nav-item-mobile { min-height: 48px; }
.nav-item-rail { display: flex; justify-content: center; width: 44px; min-height: 44px; margin-inline: auto; padding-inline: 0 !important; }
.nav-item-rail :deep(.v-list-item__prepend) { justify-content: center; }
.nav-item-rail :deep(.v-list-item__spacer), .nav-item-rail :deep(.v-list-item__content) { display: none; }
</style>
