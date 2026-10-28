<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, watch } from 'vue'
import { evaluarEstadoFinca, type SenalesFinca } from '@/domain/estadoFinca'
import plantaUrl from '@/assets/banano-estados.webp'

const props = defineProps<{
  senales: SenalesFinca
  anio: number
  loading?: boolean
  puedeVerAlertas?: boolean
  fincaId?: number | null
}>()
const ahora = shallowRef(new Date())
const detalles = shallowRef(false)
const animacion = shallowRef(true)
const reduceMovimiento = shallowRef(false)
const imagenFallida = shallowRef(false)
watch(() => props.senales.consultadoEn, () => { ahora.value = new Date() })
const lectura = computed(() => evaluarEstadoFinca(props.senales, props.anio, ahora.value))
const estado = computed(() => props.loading ? 'sin-datos' : lectura.value.estado)
const posicion = computed(() => ({ favorable: '0%', atencion: '50%', critico: '100%', 'sin-datos': '0%' })[estado.value])
let reloj: ReturnType<typeof setInterval> | undefined
let media: MediaQueryList | undefined
function actualizarMovimiento() { reduceMovimiento.value = media?.matches ?? false }
onMounted(() => {
  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  actualizarMovimiento()
  media.addEventListener('change', actualizarMovimiento)
  reloj = setInterval(() => { ahora.value = new Date() }, 60_000)
})
onUnmounted(() => {
  clearInterval(reloj)
  media?.removeEventListener('change', actualizarMovimiento)
})
</script>

<template>
  <section class="botanical-health" :data-estado="estado" aria-label="Lectura operativa de la finca" :aria-busy="loading">
    <figure class="botanical-figure">
      <button class="plant-button" type="button" :disabled="loading" :aria-expanded="detalles && !loading"
        aria-label="Ver los indicadores representados por la planta" title="Ver indicadores" @click="detalles = !detalles">
        <span v-if="!imagenFallida" class="plant-window" :class="{ 'plant-moving': animacion && !reduceMovimiento && !loading && estado !== 'sin-datos' }">
          <img :src="plantaUrl" alt="" class="plant-image" :style="{ objectPosition: posicion + ' center' }" @error="imagenFallida = true" />
        </span>
        <span v-else class="plant-fallback">Ilustración no disponible</span>
      </button>
      <figcaption class="botanical-caption">Musa spp. <span>· Banano</span></figcaption>
      <label v-if="!reduceMovimiento" class="motion-toggle">
        <input v-model="animacion" type="checkbox" /> Animación
      </label>
    </figure>

    <div class="botanical-content">
      <div class="botanical-heading">
        <h2>El pulso de tu finca</h2>
        <span class="scope-label">Finca completa</span>
      </div>
      <div role="status" class="plant-status">
        <span class="status-dot" aria-hidden="true" />
        {{ loading ? 'Consultando indicadores…' : lectura.titulo }}
      </div>
      <p class="next-action">{{ loading ? 'Preparando la lectura de producción y fumigación.' : lectura.siguiente }}</p>
      <dl class="plant-metrics">
        <div>
          <dt>Índice de producción</dt>
          <dd>{{ loading ? 'Consultando…' : lectura.produccion }}</dd>
          <p>{{ loading ? ' ' : lectura.periodoProduccion }}</p>
        </div>
        <div>
          <dt>Fumigación · estado actual</dt>
          <dd>{{ loading ? 'Consultando…' : lectura.fumigacion }}</dd>
          <p>Según el último registro</p>
        </div>
      </dl>
      <p v-if="!loading && lectura.incompleto" class="incomplete-label">Lectura parcial: faltan indicadores vigentes.</p>
      <div class="botanical-actions">
        <v-btn variant="text" size="small" color="primary" :disabled="loading" :aria-expanded="detalles && !loading"
          @click="detalles = !detalles">{{ detalles && !loading ? 'Ocultar criterios' : 'Ver criterios' }}</v-btn>
        <v-btn v-if="puedeVerAlertas" :to="{ path: '/alertas', query: fincaId ? { finca_id: String(fincaId), tab: 'alertas', abiertas: '1' } : {} }" variant="text" size="small" append-icon="mdi-arrow-right">Ver alertas</v-btn>
      </div>
      <div v-if="detalles && !loading" class="botanical-details">
        <ul><li v-for="motivo in lectura.motivos" :key="motivo">{{ motivo }}</li></ul>
        <p>El índice existente combina corte ideal, rechazo, edad de cosecha y variación semanal. El semáforo de fumigación refleja el tiempo desde el último registro, no una inspección de enfermedad.</p>
      </div>
      <p class="botanical-disclaimer">Representación de indicadores operativos, no un diagnóstico de la planta. No incluye mediciones de sensores ni estrés climático.</p>
    </div>
  </section>
</template>

<style scoped>
.botanical-health { display: grid; grid-template-columns: 210px minmax(0, 1fr); align-items: center; gap: 28px; padding: 12px 0 24px; margin-bottom: 24px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .12); letter-spacing: 0; }
.botanical-figure { margin: 0; text-align: center; min-width: 0; }
.plant-button { display: block; width: 100%; border-radius: 6px; cursor: pointer; }
.plant-button:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
.plant-window { display: block; width: 100%; aspect-ratio: 627 / 836; transform-origin: 50% 95%; }
.plant-image { display: block; width: 100%; height: 100%; object-fit: cover; }
[data-estado="sin-datos"] .plant-image { filter: grayscale(1); opacity: .55; }
.plant-moving { animation: botanical-sway 7s ease-in-out infinite alternate; }
.plant-fallback { display: grid; place-items: center; min-height: 220px; font-size: 12px; }
.botanical-caption { margin-top: 2px; font-size: 12px; font-style: italic; color: rgba(var(--v-theme-on-surface), .7); }
.botanical-caption span { font-style: normal; }
.motion-toggle { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; font-size: 11px; color: rgba(var(--v-theme-on-surface), .7); cursor: pointer; }
.motion-toggle input { accent-color: rgb(var(--v-theme-primary)); }
.botanical-content { min-width: 0; }
.botanical-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 16px; }
.botanical-heading h2 { font-size: 20px; font-weight: 700; line-height: 1.3; }
.scope-label { font-size: 12px; color: rgba(var(--v-theme-on-surface), .65); }
.plant-status { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 650; margin: 10px 0 6px; }
[data-estado="favorable"] .plant-status { color: #24743c; }
[data-estado="atencion"] .plant-status { color: #895900; }
[data-estado="critico"] .plant-status { color: #b52e38; }
:global(.v-theme--dark) [data-estado="favorable"] .plant-status { color: #86d99c; }
:global(.v-theme--dark) [data-estado="atencion"] .plant-status { color: #f3c667; }
:global(.v-theme--dark) [data-estado="critico"] .plant-status { color: #ff9fa6; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.next-action { font-size: 13px; line-height: 1.6; max-width: 620px; }
.plant-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 18px 0 10px; }
.plant-metrics dt { font-size: 12px; color: rgba(var(--v-theme-on-surface), .7); }
.plant-metrics dd { font-size: 18px; font-weight: 650; margin: 3px 0; overflow-wrap: anywhere; }
.plant-metrics p { font-size: 11px; color: rgba(var(--v-theme-on-surface), .65); }
.botanical-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-left: -8px; }
.botanical-actions :deep(.v-btn) { letter-spacing: 0; text-transform: none; }
.incomplete-label { font-size: 12px; margin: 8px 0; }
.botanical-disclaimer { font-size: 11px; line-height: 1.5; color: rgba(var(--v-theme-on-surface), .65); margin-top: 8px; max-width: 660px; }
.botanical-details { font-size: 12px; line-height: 1.6; padding: 12px 0; }
.botanical-details ul { padding-left: 18px; margin-bottom: 8px; }
@keyframes botanical-sway { from { transform: rotate(-.7deg); } to { transform: rotate(.7deg); } }
@media (prefers-reduced-motion: reduce) { .plant-moving { animation: none; } }
@media (max-width: 759px) {
  .botanical-health { grid-template-columns: 150px minmax(0, 1fr); gap: 20px; }
  .plant-metrics { grid-template-columns: 1fr; gap: 10px; }
}
@media (max-width: 479px) {
  .botanical-health { grid-template-columns: 1fr; gap: 12px; }
  .botanical-figure { width: 150px; justify-self: center; }
  .plant-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .plant-metrics dd { font-size: 16px; }
}
</style>
