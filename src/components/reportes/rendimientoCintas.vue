<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{
  cintas: { nombre: string; total: number }[]
  loading?: boolean
  error?: string
}>(), { loading: false })
const colores: Record<string, string> = {
  blanca: '#ffffff', negra: '#171717', lila: '#b291ed', roja: '#e14747',
  cafe: '#8b5e3c', amarilla: '#e6ba25', verde: '#24a876', azul: '#3780e7',
}
const filas = computed(() => props.cintas
  .map(cinta => ({ ...cinta, total: Number.isFinite(Number(cinta.total)) ? Math.max(0, Number(cinta.total)) : 0 }))
  .sort((a, b) => b.total - a.total))
const total = computed(() => filas.value.reduce((sum, cinta) => sum + cinta.total, 0))
const formato = (n: number) => n.toLocaleString('es-EC')
const porcentaje = (n: number) => total.value > 0 ? n / total.value * 100 : 0
const color = (nombre: string) => colores[nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || '#929292'
</script>

<template>
  <section class="cintas-panel" aria-labelledby="cintas-title">
    <header class="cintas-header">
      <h2 id="cintas-title">Enfunde por cinta</h2>
      <p class="text-medium-emphasis">Participación en el período</p>
    </header>
    <v-skeleton-loader v-if="loading" type="list-item-three-line, list-item-three-line" />
    <p v-else-if="error || !filas.length" class="cintas-empty text-medium-emphasis">{{ error || 'Sin registros de cintas en este período.' }}</p>
    <template v-else>
      <div class="cintas-total"><strong>{{ formato(total) }}</strong><span class="text-medium-emphasis">fundas registradas</span></div>
      <ul class="cintas-list">
        <li v-for="cinta in filas" :key="cinta.nombre" class="cinta-row">
          <div class="cinta-label">
            <span class="color-dot" :style="{ backgroundColor: color(cinta.nombre) }" aria-hidden="true" />
            <span>{{ cinta.nombre }}</span>
            <strong>{{ formato(cinta.total) }}</strong>
            <span class="cinta-share text-medium-emphasis">{{ porcentaje(cinta.total).toLocaleString('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }}%</span>
          </div>
          <div class="cinta-track" aria-hidden="true"><span :style="{ width: porcentaje(cinta.total) + '%', backgroundColor: color(cinta.nombre) }" /></div>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.cintas-panel { padding: 20px; background: rgb(var(--v-theme-surface)); border: 1px solid rgba(var(--v-theme-on-surface), .12); border-radius: 8px; min-width: 0; height: 100%; }
.cintas-header h2 { font-size: 16px; font-weight: 700; letter-spacing: 0; }
.cintas-header p { font-size: 12px; margin-top: 4px; }
.cintas-total { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; padding: 18px 0; }
.cintas-total strong { font-size: 24px; font-variant-numeric: tabular-nums; }
.cintas-total span { font-size: 12px; }
.cintas-list { list-style: none; padding: 0; }
.cinta-row { padding: 10px 0; }
.cinta-label { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 48px; align-items: center; gap: 8px; font-size: 13px; }
.cinta-label > span { overflow-wrap: anywhere; }
.color-dot { width: 10px; height: 10px; border-radius: 3px; border: 1px solid #999; }
.cinta-share { text-align: right; font-size: 12px; }
.cinta-track { height: 5px; margin-top: 8px; background: rgba(var(--v-theme-on-surface), .07); border-radius: 2px; overflow: hidden; }
.cinta-track span { display: block; height: 100%; border: 1px solid rgba(var(--v-theme-on-surface), .2); }
.cintas-empty { padding: 48px 0; font-size: 14px; text-align: center; }
</style>
