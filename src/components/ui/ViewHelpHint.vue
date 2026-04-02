<template>
  <v-expansion-panels variant="accordion" class="help-hint">
    <v-expansion-panel>
      <v-expansion-panel-title class="help-title">
        <div class="d-flex align-center gap-2">
          <v-icon size="18" color="info">mdi-help-circle-outline</v-icon>
          <span class="font-weight-bold">{{ title }}</span>
        </div>
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <div class="text-body-2 text-medium-emphasis mb-3">{{ summary }}</div>

        <div v-if="steps.length" class="mb-3">
          <div class="text-caption font-weight-bold text-high-emphasis mb-2">Pasos recomendados</div>
          <v-list density="compact" class="pa-0">
            <v-list-item
              v-for="(step, index) in steps"
              :key="`step-${index}`"
              class="px-0"
            >
              <template #prepend>
                <v-avatar size="18" color="info" variant="tonal" class="mr-2">
                  <span class="text-caption font-weight-bold">{{ index + 1 }}</span>
                </v-avatar>
              </template>
              <v-list-item-title class="text-body-2">{{ step }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>

        <div v-if="notes.length">
          <div class="text-caption font-weight-bold text-high-emphasis mb-2">Puntos clave</div>
          <v-list density="compact" class="pa-0">
            <v-list-item
              v-for="(note, index) in notes"
              :key="`note-${index}`"
              class="px-0"
            >
              <template #prepend>
                <v-icon size="16" color="primary" class="mr-2">mdi-check-circle-outline</v-icon>
              </template>
              <v-list-item-title class="text-body-2">{{ note }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </div>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    summary: string;
    steps?: string[];
    notes?: string[];
  }>(),
  {
    steps: () => [],
    notes: () => [],
  },
);
</script>

<style scoped>
.help-hint :deep(.v-expansion-panel) {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px !important;
  background: rgba(var(--v-theme-info), 0.03);
}

.help-hint :deep(.v-expansion-panel-title__overlay) {
  opacity: 0 !important;
}

.help-title {
  min-height: 52px;
}

.gap-2 {
  gap: 8px;
}
</style>
