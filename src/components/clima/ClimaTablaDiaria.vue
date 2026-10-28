<script setup lang="ts">
import { formatoClima, fechaClima, type ClimaDia } from '@/domain/clima';
defineProps<{ filas: ClimaDia[] }>();
const soloFaltantes = defineModel<boolean>('soloFaltantes', { required: true });
const headers = [
  { title: 'Fecha', key: 'fecha' }, { title: 'Temperatura (°C)', key: 'temp_media' },
  { title: 'UC estimadas', key: 'unidades_calor_dia' }, { title: 'Lluvia parcial (mm)', key: 'precipitacion_mm' },
  { title: 'Calidad del dato', key: 'disponible', sortable: false },
];
</script>

<template>
  <section aria-label="Historial climático por día">
    <header class="tabla-header">
      <h2>Detalle por día</h2>
      <v-checkbox v-model="soloFaltantes" label="Solo días sin registro" density="compact" hide-details />
    </header>
    <v-data-table :headers="headers" :items="filas" item-value="fecha" :items-per-page="15"
      :items-per-page-options="[15,30,90]" items-per-page-text="Días por página" no-data-text="No hay días que coincidan con este filtro"
      page-text="{0}-{1} de {2}" first-page-label="Primera página" prev-page-label="Página anterior"
      next-page-label="Página siguiente" last-page-label="Última página"
      class="clima-tabla" density="comfortable">
      <template #item.fecha="{ item }">{{ fechaClima(item.fecha) }}</template>
      <template #item.temp_media="{ item }">{{ formatoClima(item.temp_media) }}</template>
      <template #item.unidades_calor_dia="{ item }">{{ formatoClima(item.unidades_calor_dia) }}</template>
      <template #item.precipitacion_mm="{ item }">{{ formatoClima(item.precipitacion_mm) }}</template>
      <template #item.disponible="{ item }"><v-chip size="small" variant="tonal" :color="item.disponible ? 'info' : 'warning'">{{ item.disponible ? 'Muestra puntual' : 'Sin registro' }}</v-chip></template>
    </v-data-table>
  </section>
</template>

<style scoped>
.tabla-header { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
.tabla-header h2 { font-size:18px; font-weight:700; }
.tabla-header :deep(.v-checkbox) { flex:0 1 auto; }
.clima-tabla { border:1px solid rgba(var(--v-theme-on-surface),.12); border-radius:8px; }
.clima-tabla :deep(th) { white-space:nowrap; }
</style>
