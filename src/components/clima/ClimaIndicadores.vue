<script setup lang="ts">
import { computed } from 'vue';
import { formatoClima, fechaClima, resumenClima, type ClimaDia } from '@/domain/clima';
const props = defineProps<{ dias: ClimaDia[] }>();
const resumen = computed(() => resumenClima(props.dias));
const indicadores = computed(() => [
  { label: 'Temperatura de la muestra', valor: formatoClima(resumen.value.ultimaMuestra?.temp_media), unidad: '°C', detalle: `Última del período: ${fechaClima(resumen.value.ultimaMuestra?.fecha || null)}` },
  { label: 'Lluvia de la muestra', valor: formatoClima(resumen.value.ultimaMuestra?.precipitacion_mm), unidad: 'mm', detalle: 'Ventana de captura no documentada; no es total diario' },
  { label: 'UC estimadas registradas', valor: formatoClima(resumen.value.ucRegistradas), unidad: 'UC', detalle: `${resumen.value.diasConUc} registros del período · base de cálculo 14 °C` },
  { label: 'Cobertura del historial', valor: `${resumen.value.diasConRegistro} / ${props.dias.length}`, unidad: 'días', detalle: `${resumen.value.diasSinRegistro} días sin registro` },
]);
</script>

<template>
  <div class="clima-indicadores">
    <article v-for="item in indicadores" :key="item.label" class="clima-indicador">
      <h2>{{ item.label }}</h2>
      <p class="valor">{{ item.valor }} <span>{{ item.unidad }}</span></p>
      <p class="detalle">{{ item.detalle }}</p>
    </article>
  </div>
</template>

<style scoped>
.clima-indicadores { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; margin-block: 20px; }
.clima-indicador { padding: 18px; border: 1px solid rgba(var(--v-theme-on-surface),.12); border-radius: 8px; background: rgb(var(--v-theme-surface)); }
h2 { font-size: 13px; font-weight: 600; }
.valor { margin-block: 12px 6px; font-size: 26px; font-weight: 750; overflow-wrap: anywhere; }
.valor span { font-size: 13px; font-weight: 500; }
.detalle { font-size: 12px; color: rgba(var(--v-theme-on-surface),.7); }
@media(max-width:1100px) { .clima-indicadores { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:599px) { .clima-indicadores { gap:10px; } .clima-indicador { padding:12px; } .valor { font-size:22px; } }
</style>
