<script setup lang="ts">
import { computed } from 'vue';
import type { CintaCosecha } from '@/stores/cosecha/cosechaStore';

const props = defineProps<{
  cintas: CintaCosecha[];
  calendarioId: number | null;
  bloqueado: boolean;
  loading: boolean;
}>();
const emit = defineEmits<{
  'update:calendarioId': [id: number | null];
  ajustar: [item: CintaCosecha, campo: 'cantidad_a_cosechar' | 'rechazo', delta: number];
  accion: [accion: 'limpiar' | 'llenar'];
}>();
const activa = computed(() => props.cintas.find(c => c.calendario_id === props.calendarioId));
const opciones = computed(() => props.cintas.map(c => ({
  ...c, titulo: `${c.color_cinta} · Sem. ${c.semana_enfunde}/${c.anio}`,
})));
const disponible = computed(() => activa.value
  ? Math.max(0, activa.value.saldo_en_campo - activa.value.cantidad_a_cosechar - activa.value.rechazo) : 0);
const grupos = [
  { campo: 'cantidad_a_cosechar', titulo: 'Buenos', singular: 'bueno', color: 'primary' },
  { campo: 'rechazo', titulo: 'Rechazos', singular: 'rechazo', color: 'error' },
] as const;

function ajustar(campo: 'cantidad_a_cosechar' | 'rechazo', delta: number) {
  if (!activa.value || props.bloqueado) return;
  if ((delta > 0 && !disponible.value) || (delta < 0 && !activa.value[campo])) return;
  emit('ajustar', activa.value, campo, delta);
}
</script>

<template>
  <section class="manual-panel" aria-label="Conteo por cinta" :aria-busy="loading">
    <v-select
      :model-value="calendarioId" :items="opciones" item-title="titulo" item-value="calendario_id"
      label="Cinta y semana" variant="outlined" density="comfortable" hide-details
      :disabled="bloqueado || !cintas.length" :loading="loading" no-data-text="Sin cintas disponibles"
      @update:model-value="emit('update:calendarioId', $event)"
    >
      <template #selection="{ item }">
        <span class="manual-panel__selection"><span class="manual-panel__swatch" :style="{ backgroundColor: item.raw.color_hex }" />{{ item.title }}</span>
      </template>
      <template #item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps" :subtitle="`${item.raw.edad} semanas de edad`">
          <template #prepend><span class="manual-panel__swatch mr-3" :style="{ backgroundColor: item.raw.color_hex }" /></template>
        </v-list-item>
      </template>
    </v-select>

    <div v-if="loading && !activa" class="manual-panel__empty" role="status">Cargando cintas...</div>
    <template v-else-if="activa">
      <div class="manual-panel__meta">
        <span>{{ activa.edad }} semanas de edad</span>
        <span>Disponible <strong>{{ disponible }}</strong></span>
      </div>
      <div class="manual-panel__counters">
        <div v-for="grupo in grupos" :key="grupo.campo" class="manual-panel__group" :class="`manual-panel__group--${grupo.color}`">
          <span class="manual-panel__label">{{ grupo.titulo }}</span>
          <output class="manual-panel__value" :aria-label="grupo.titulo">{{ activa[grupo.campo] }}</output>
          <v-btn class="manual-panel__add" :color="grupo.color" :variant="grupo.campo === 'rechazo' ? 'tonal' : 'flat'"
            :disabled="bloqueado || !disponible" :aria-label="`Sumar un ${grupo.singular}`"
            @click="ajustar(grupo.campo, 1)">
            <v-icon start>mdi-plus</v-icon>1
          </v-btn>
          <div class="manual-panel__adjust">
            <v-btn variant="outlined" class="manual-panel__minus" :disabled="bloqueado || !activa[grupo.campo]"
              :aria-label="`Restar un ${grupo.singular}`" :title="`Restar un ${grupo.singular}`" @click="ajustar(grupo.campo, -1)">
              <v-icon start>mdi-minus</v-icon>1
            </v-btn>
            <v-btn v-if="grupo.campo === 'cantidad_a_cosechar'" variant="tonal" color="primary"
              :disabled="bloqueado || !disponible" aria-label="Sumar diez buenos" @click="ajustar(grupo.campo, 10)">+10</v-btn>
          </div>
        </div>
      </div>
      <div class="manual-panel__secondary">
        <v-btn variant="text" size="small" :disabled="bloqueado || !disponible" @click="emit('accion', 'llenar')">Todo el saldo</v-btn>
        <v-btn variant="text" size="small" :disabled="bloqueado || !(activa.cantidad_a_cosechar + activa.rechazo)" @click="emit('accion', 'limpiar')">Limpiar cinta</v-btn>
      </div>
    </template>
    <div v-else class="manual-panel__empty" role="status">
      <v-icon size="32">mdi-basket-check-outline</v-icon>
      <strong>Sin cintas con saldo</strong>
      <span>Revisa la finca seleccionada o actualiza el inventario.</span>
    </div>
  </section>
</template>

<style scoped>
.manual-panel { border: 1px solid rgba(var(--v-border-color), .18); border-radius: 8px; padding: 20px; background: rgb(var(--v-theme-surface)); min-width: 0; }
.manual-panel__selection { display: flex; align-items: center; gap: 8px; white-space: normal; overflow-wrap: anywhere; font-weight: 650; }
.manual-panel__swatch { display: inline-block; width: 14px; height: 14px; border: 1px solid rgba(var(--v-theme-on-surface), .35); border-radius: 50%; flex-shrink: 0; }
.manual-panel__meta { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 12px; color: rgba(var(--v-theme-on-surface), .72); margin: 10px 0 16px; }
.manual-panel__meta strong { color: rgb(var(--v-theme-on-surface)); font-variant-numeric: tabular-nums; }
.manual-panel__counters { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.manual-panel__group { display: flex; flex-direction: column; min-width: 0; padding-right: 16px; }
.manual-panel__group + .manual-panel__group { padding: 0 0 0 16px; border-left: 1px solid rgba(var(--v-border-color), .16); }
.manual-panel__label { font-size: 14px; font-weight: 650; }
.manual-panel__value { display: block; font-size: 48px; line-height: 1.2; padding: 8px 0 16px; font-weight: 750; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.manual-panel__add { width: 100%; min-height: 64px; font-size: 24px; border-radius: 8px; }
.manual-panel__adjust { display: flex; gap: 8px; margin-top: 10px; }
.manual-panel__adjust .v-btn { min-width: 0; min-height: 44px; flex: 1; border-radius: 6px; padding-inline: 8px; }
.manual-panel__secondary { display: flex; justify-content: space-between; gap: 8px; border-top: 1px solid rgba(var(--v-border-color), .16); padding-top: 12px; margin-top: 16px; }
.manual-panel__secondary .v-btn { min-height: 44px; }
.manual-panel__empty { min-height: 230px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; font-size: 14px; color: rgba(var(--v-theme-on-surface), .72); }
:deep(.v-btn) { text-transform: none; letter-spacing: 0; font-weight: 650; }
@media (max-width: 600px) {
  .manual-panel { padding: 14px; }
  .manual-panel__group { padding-right: 10px; }
  .manual-panel__group + .manual-panel__group { padding-left: 10px; }
  .manual-panel__secondary { margin-top: 12px; padding-top: 6px; }
}
</style>
