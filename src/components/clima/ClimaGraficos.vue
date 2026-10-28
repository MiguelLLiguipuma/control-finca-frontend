<script setup lang="ts">
import { computed } from 'vue';
import SimpleSvgChart from '@/components/reportes/SimpleSvgChart.vue';
import type { ClimaDia } from '@/domain/clima';
const props = defineProps<{ dias: ClimaDia[] }>();
// Match SVG coordinates to its scrollable width so a long period never magnifies the chart.
const anchoGrafico = computed(() => Math.max(560, props.dias.length * 25));
const categorias = computed(() => props.dias.map(row => row.fecha.slice(5).split('-').reverse().join('/')));
const graficos = computed(() => [
  { titulo: 'Precipitación registrada', unidad: 'mm por muestra', color: '#1479b8', datos: props.dias.map(row => row.precipitacion_mm) },
  { titulo: 'Unidades de calor por fecha', unidad: 'UC estimadas', color: '#16816b', datos: props.dias.map(row => row.unidades_calor_dia) },
]);
</script>

<template>
  <div class="clima-graficos">
    <section v-for="grafico in graficos" :key="grafico.titulo" class="clima-grafico">
      <h2>{{ grafico.titulo }}</h2>
      <p class="subtitulo">{{ grafico.unidad }} · Los días sin datos quedan vacíos</p>
      <div class="grafico-scroll" tabindex="0" role="region" :aria-label="grafico.titulo">
        <SimpleSvgChart type="bar" :categories="categorias" :series="[{ name: grafico.titulo, data: grafico.datos }]"
          :colors="[grafico.color]" :fraction-digits="2" :height="300" :width="anchoGrafico" :aria-label="grafico.titulo" :y-axis-title="grafico.unidad"
          :style="{ width: anchoGrafico + 'px' }" empty-text="No hay mediciones disponibles en este período" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.clima-graficos { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; margin-block:24px; }
.clima-grafico { min-width:0; border-block:1px solid rgba(var(--v-theme-on-surface),.12); padding-block:18px; }
h2 { font-size:16px; font-weight:700; }
.subtitulo { margin-block:4px 18px; font-size:12px; color:rgba(var(--v-theme-on-surface),.7); }
.grafico-scroll { overflow-x:auto; padding-bottom:8px; }
.grafico-scroll:focus-visible { outline:2px solid rgb(var(--v-theme-primary)); }
@media(max-width:959px) { .clima-graficos { grid-template-columns:minmax(0,1fr); } }
</style>
