<template>
  <v-card variant="flat" class="rounded-xl bg-surface border shadow-sm overflow-hidden h-100">
    <div class="pa-5 border-b bg-header-subtle d-flex align-center justify-space-between">
      <div>
        <div class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-chart-donut</v-icon>
          <span class="text-overline font-weight-black text-high-emphasis">Rendimiento de Cintas</span>
        </div>
        <p class="text-caption text-medium-emphasis mb-0 d-flex align-center">
          <v-icon size="14" class="mr-1">mdi-clock-outline</v-icon>
          Actualizado: {{ horaActual }}
        </p>
      </div>
      <v-chip color="primary" variant="tonal" size="small" class="font-weight-bold">
        {{ eficienciaTotal }}% Eficiencia
      </v-chip>
    </div>

    <v-card-text class="pa-6">
      <v-row>
        <v-col cols="12" md="5" class="d-flex flex-column align-center justify-center border-right-md">
          <div class="gauge-container mb-6">
            <svg class="gauge-svg" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="85" fill="none" :stroke="isDark ? '#334155' : '#f1f5f9'" stroke-width="12" />
              <circle
                v-for="(segment, i) in gaugeSegments"
                :key="i"
                cx="100"
                cy="100"
                r="85"
                fill="none"
                :stroke="segment.color"
                stroke-width="14"
                stroke-dasharray="534"
                :stroke-dashoffset="534 - (534 * segment.porcentaje) / 100"
                stroke-linecap="round"
                :transform="`rotate(${segment.inicio}, 100, 100)`"
                class="gauge-segment"
              />
              
              <text
                v-for="(segment, i) in gaugeSegments"
                :key="'text-' + i"
                v-show="segment.porcentaje > 7"
                :x="calcularX(segment.inicio + (segment.porcentaje * 3.6) / 2)"
                :y="calcularY(segment.inicio + (segment.porcentaje * 3.6) / 2)"
                fill="white"
                font-size="10"
                font-weight="900"
                text-anchor="middle"
                dominant-baseline="middle"
                style="text-shadow: 0px 1px 2px rgba(0,0,0,0.5); pointer-events: none;"
              >
                {{ Math.round(segment.porcentaje) }}%
              </text>
            </svg>
            <div class="gauge-center-content">
              <span class="text-h3 font-weight-black text-high-emphasis">{{ totalFundasFormateado }}</span>
              <span class="text-caption font-weight-bold text-medium-emphasis uppercase tracking-widest">Fundas</span>
            </div>
          </div>

          <div class="w-100 px-4">
            <div v-for="cinta in cintasOrdenadas.slice(0, 4)" :key="cinta.nombre" class="d-flex align-center mb-2">
              <div class="color-indicator mr-2" :style="{ backgroundColor: colorReal(cinta.nombre) }"></div>
              <span class="text-caption font-weight-bold text-medium-emphasis flex-grow-1">{{ cinta.nombre }}</span>
              <span class="text-caption font-weight-black text-high-emphasis">{{ calcularPorcentaje(cinta.total) }}%</span>
            </div>
          </div>
        </v-col>

        <v-col cols="12" md="7">
          <div class="d-flex align-center justify-space-between mb-4">
            <span class="text-subtitle-2 font-weight-bold text-high-emphasis">Ranking de Producción</span>
            <span class="text-caption text-medium-emphasis font-weight-bold">Meta: {{ metaDiariaFormateada }}</span>
          </div>
          
          <div class="cintas-scroll-area">
            <div
              v-for="(cinta, index) in cintasOrdenadas"
              :key="cinta.nombre"
              class="cinta-row-minimal mb-3 pa-3 rounded-lg border"
              :class="{ 'leader-row': index === 0 }"
            >
              <div class="d-flex align-center justify-space-between mb-1">
                <div class="d-flex align-center">
                  <div class="rank-badge mr-3" :style="{ color: colorReal(cinta.nombre) }">#{{ index + 1 }}</div>
                  <span class="text-body-2 font-weight-bold text-medium-emphasis">{{ cinta.nombre }}</span>
                </div>
                <span class="text-body-2 font-weight-black text-high-emphasis">{{ cinta.total }} <small class="text-medium-emphasis">und</small></span>
              </div>
              <v-progress-linear
                :model-value="(cinta.total / (cintaTop.total || 1)) * 100"
                height="6"
                rounded
                :color="colorReal(cinta.nombre)"
                :bg-color="isDark ? 'slate-700' : 'slate-100'"
              />
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card-text>

    <v-divider />
    <div class="pa-4 bg-footer-subtle d-flex justify-space-around text-center">
      <div>
        <div class="text-caption font-weight-bold text-medium-emphasis">LÍDER</div>
        <div class="text-body-2 font-weight-black text-primary">{{ cintaTop.nombre }}</div>
      </div>
      <v-divider vertical inset />
      <div>
        <div class="text-caption font-weight-bold text-medium-emphasis">RESTANTE</div>
        <div class="text-body-2 font-weight-black text-high-emphasis">{{ tiempoRestante }}</div>
      </div>
      <v-divider vertical inset />
      <div>
        <div class="text-caption font-weight-bold text-medium-emphasis">PROMEDIO</div>
        <div class="text-body-2 font-weight-black text-high-emphasis">{{ calcularPromedioHora(totalFundas) }} p/h</div>
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from 'vuetify'

const props = defineProps({
  cintas: { type: Array, required: true },
  metaDiaria: { type: Number, default: 10000 }
})

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const horaActual = computed(() => new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }))
const totalFundas = computed(() => props.cintas.reduce((acc, c) => acc + (Number(c.total) || 0), 0))
const totalFundasFormateado = computed(() => new Intl.NumberFormat('es-EC').format(totalFundas.value))
const metaDiariaFormateada = computed(() => new Intl.NumberFormat('es-EC').format(props.metaDiaria))
const eficienciaTotal = computed(() => Math.min(100, Math.round((totalFundas.value / props.metaDiaria) * 100)))

const cintasOrdenadas = computed(() => [...props.cintas].sort((a, b) => b.total - a.total).slice(0, 8))
const cintaTop = computed(() => cintasOrdenadas.value[0] || { nombre: 'N/A', total: 0 })

const gaugeSegments = computed(() => {
  let acumulado = 0
  return cintasOrdenadas.value.map(c => {
    const porc = (c.total / (totalFundas.value || 1)) * 100
    const seg = { color: colorReal(c.nombre), porcentaje: porc, inicio: acumulado - 90 }
    acumulado += (porc * 360) / 100
    return seg
  })
})

const calcularX = (angulo) => 100 + 85 * Math.cos(angulo * Math.PI / 180)
const calcularY = (angulo) => 100 + 85 * Math.sin(angulo * Math.PI / 180)

const calcularPorcentaje = (v) => Math.round((v / (totalFundas.value || 1)) * 100)
const calcularPromedioHora = (v) => Math.round(v / 8)

const tiempoRestante = computed(() => {
  const fin = new Date().setHours(17, 0, 0, 0)
  const dif = fin - new Date()
  if (dif < 0) return 'Turno Finalizado'
  return `${Math.floor(dif/3600000)}h ${Math.floor((dif%3600000)/60000)}m`
})

// Ajustamos ligeramente los colores para que se vean mejor en ambos temas
const colores = { 
  Blanca: '#cbd5e1', 
  Negra: '#1e293b', 
  Lila: '#a855f7', 
  Roja: '#ef4444', 
  Cafe: '#78350f', 
  Amarilla: '#eab308', 
  Verde: '#22c55e', 
  Azul: '#3b82f6' 
}
const colorReal = (n) => {
  if (n === 'Blanca' && isDark.value) return '#f8fafc' // Blanca más brillante en dark
  if (n === 'Negra' && isDark.value) return '#64748b'  // Negra más clara en dark
  return colores[n] || `hsl(${n.length * 40}, 70%, 50%)`
}
</script>

<style scoped>
/* ESTILOS DINÁMICOS BASADOS EN EL TEMA */
.border {
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.border-b {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.bg-header-subtle {
  background-color: rgba(var(--v-theme-on-surface), 0.03) !important;
}

.bg-footer-subtle {
  background-color: rgba(var(--v-theme-on-surface), 0.02) !important;
}

/* GAUGE */
.gauge-container { position: relative; width: 100%; max-width: 200px; }
.gauge-svg { transition: all 0.5s ease; }
.gauge-center-content {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  text-align: center; display: flex; flex-direction: column;
}

.color-indicator { width: 8px; height: 8px; border-radius: 2px; }
.cintas-scroll-area { 
  max-height: 320px; 
  overflow-y: auto; 
  padding-right: 4px; 
}

/* FILAS DEL RANKING */
.cinta-row-minimal { 
  transition: all 0.2s ease; 
  background-color: rgba(var(--v-theme-on-surface), 0.01);
}

.leader-row { 
  border-left: 4px solid rgb(var(--v-theme-primary)) !important; 
  background-color: rgba(var(--v-theme-primary), 0.05) !important;
}

.rank-badge { font-family: 'monospace'; font-weight: 900; font-size: 0.75rem; width: 24px; }

@media (min-width: 960px) {
  .border-right-md { border-right: 1px solid rgba(var(--v-border-color), 0.1); }
}

/* Estilo para el scrollbar en modo oscuro */
.cintas-scroll-area::-webkit-scrollbar { width: 4px; }
.cintas-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 4px;
}
</style>