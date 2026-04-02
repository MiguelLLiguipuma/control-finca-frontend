<template>
  <div class="svg-chart-root">
    <div
      v-if="!safeSeries.length || !categoryCount"
      class="svg-chart-empty text-medium-emphasis"
    >
      {{ emptyText }}
    </div>
    <svg
      v-else
      ref="svgRef"
      class="svg-chart"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      :aria-label="ariaLabel"
    >
      <rect width="100%" height="100%" fill="transparent" />

      <g class="grid">
        <line
          v-for="tick in ticks"
          :key="`grid-${tick.value}`"
          :x1="padding.left"
          :y1="tick.y"
          :x2="svgWidth - padding.right"
          :y2="tick.y"
          :stroke="gridColor"
          stroke-width="1"
          stroke-dasharray="4 4"
        />
      </g>

      <g class="y-axis">
        <text
          v-for="tick in ticks"
          :key="`label-${tick.value}`"
          :x="padding.left - 12"
          :y="tick.y + 4"
          text-anchor="end"
          :fill="labelColor"
          font-size="11"
          font-weight="600"
        >
          {{ formatValue(tick.value) }}
        </text>
      </g>

      <line
        v-if="thresholdLine"
        :x1="padding.left"
        :y1="thresholdLine.y"
        :x2="svgWidth - padding.right"
        :y2="thresholdLine.y"
        :stroke="thresholdColor"
        stroke-width="2"
        stroke-dasharray="6 4"
      />

      <g v-if="thresholdLine" class="threshold-label">
        <rect
          :x="svgWidth - padding.right - 112"
          :y="thresholdLine.y - 22"
          width="108"
          height="18"
          rx="6"
          :fill="thresholdColor"
        />
        <text
          :x="svgWidth - padding.right - 58"
          :y="thresholdLine.y - 9"
          text-anchor="middle"
          fill="#fff"
          font-size="10"
          font-weight="700"
        >
          {{ thresholdLabelText }}
        </text>
      </g>

      <g v-if="type === 'bar'" class="bars">
        <g
          v-for="bar in bars"
          :key="bar.key"
        >
          <rect
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            :rx="barRadius"
            :fill="bar.color"
            :opacity="bar.opacity"
          >
            <title>{{ bar.tooltip }}</title>
          </rect>
          <text
            v-if="showDataLabels"
            :x="bar.x + bar.width / 2"
            :y="Math.max(padding.top + 10, bar.y - 8)"
            text-anchor="middle"
            :fill="labelColor"
            font-size="10"
            font-weight="700"
          >
            {{ formatValue(bar.value) }}
          </text>
        </g>
      </g>

      <g v-else class="lines">
        <path
          v-for="line in lines"
          :key="line.name"
          :d="line.path"
          fill="none"
          :stroke="line.color"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <g
          v-for="point in linePoints"
          :key="point.key"
        >
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4"
            :fill="point.color"
          >
            <title>{{ point.tooltip }}</title>
          </circle>
        </g>
      </g>

      <line
        :x1="padding.left"
        :y1="chartBottom"
        :x2="svgWidth - padding.right"
        :y2="chartBottom"
        :stroke="axisColor"
        stroke-width="1"
      />

      <g class="x-axis">
        <g
          v-for="tick in categoryTicks"
          :key="`x-${tick.label}-${tick.index}`"
          :transform="`translate(${tick.x}, ${chartBottom + 18}) rotate(${xLabelRotation})`"
        >
          <text
            text-anchor="middle"
            :fill="labelColor"
            font-size="11"
            font-weight="600"
          >
            {{ tick.label }}
          </text>
        </g>
      </g>

      <text
        v-if="yAxisTitle"
        :x="18"
        :y="svgHeight / 2"
        :fill="labelColor"
        font-size="11"
        font-weight="700"
        text-anchor="middle"
        :transform="`rotate(-90 18 ${svgHeight / 2})`"
      >
        {{ yAxisTitle }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTheme } from 'vuetify'

export interface SvgChartSeries {
  name?: string
  data?: number[]
}

export interface SvgChartExpose {
  exportPng: (filename: string) => Promise<void>
}

const props = withDefaults(defineProps<{
  series: SvgChartSeries[]
  categories: string[]
  type?: 'bar' | 'line'
  height?: number
  colors?: string[]
  threshold?: number | null
  thresholdLabel?: string
  emptyText?: string
  ariaLabel?: string
  yAxisTitle?: string
  showDataLabels?: boolean
}>(), {
  type: 'bar',
  height: 320,
  colors: () => ['#3b82f6'],
  threshold: null,
  thresholdLabel: '',
  emptyText: 'Sin datos disponibles',
  ariaLabel: 'Gráfico de reportes',
  yAxisTitle: 'Fundas',
  showDataLabels: false,
})

const svgRef = ref<SVGSVGElement | null>(null)
const theme = useTheme()
const barRadius = 4
const svgWidth = 960
const svgHeight = computed(() => props.height)
const padding = computed(() => ({
  top: 18,
  right: 20,
  bottom: props.categories.length > 24 ? 88 : props.categories.length > 12 ? 72 : 54,
  left: 64,
}))

const chartWidth = computed(() => svgWidth - padding.value.left - padding.value.right)
const chartHeight = computed(() => svgHeight.value - padding.value.top - padding.value.bottom)
const chartBottom = computed(() => svgHeight.value - padding.value.bottom)
const safeSeries = computed(() =>
  (props.series || []).map((series, index) => ({
    name: series.name || `Serie ${index + 1}`,
    data: Array.isArray(series.data) ? series.data.map((value) => Number(value) || 0) : [],
  })),
)
const categoryCount = computed(() => props.categories?.length || 0)
const maxValue = computed(() => {
  const fromSeries = safeSeries.value.flatMap((series) => series.data)
  const values = props.threshold != null ? [...fromSeries, props.threshold] : fromSeries
  const max = Math.max(0, ...values)
  if (max <= 10) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  return Math.ceil(max / magnitude) * magnitude
})
const ticks = computed(() => {
  const tickCount = 5
  return Array.from({ length: tickCount }, (_, index) => {
    const value = (maxValue.value / (tickCount - 1)) * index
    const y =
      chartBottom.value - (value / maxValue.value) * chartHeight.value
    return { value, y }
  })
})
const categoryStep = computed(() => chartWidth.value / Math.max(1, categoryCount.value))
const xLabelRotation = computed(() => {
  if (categoryCount.value > 24) return -60
  if (categoryCount.value > 12) return -35
  return 0
})
const isDark = computed(() => theme.global.current.value.dark)
const gridColor = computed(() => (isDark.value ? '#334155' : '#e2e8f0'))
const axisColor = computed(() => (isDark.value ? '#475569' : '#cbd5e1'))
const labelColor = computed(() => (isDark.value ? '#cbd5e1' : '#64748b'))
const thresholdColor = '#ef4444'

const categoryTicks = computed(() =>
  (props.categories || []).map((label, index) => ({
    label,
    index,
    x: padding.value.left + categoryStep.value * index + categoryStep.value / 2,
  })),
)

const pickSeriesColor = (seriesIndex: number, value: number): string => {
  if (
    props.type === 'bar' &&
    safeSeries.value.length === 1 &&
    props.threshold != null &&
    value <= props.threshold
  ) {
    return thresholdColor
  }

  return props.colors[seriesIndex] || props.colors[props.colors.length - 1] || '#3b82f6'
}

const bars = computed(() => {
  if (props.type !== 'bar') return []
  const seriesCount = Math.max(1, safeSeries.value.length)
  const groupWidth = categoryStep.value * 0.78
  const barGap = Math.min(8, groupWidth * 0.08)
  const width = Math.max(8, (groupWidth - barGap * (seriesCount - 1)) / seriesCount)

  return safeSeries.value.flatMap((series, seriesIndex) =>
    series.data.map((value, pointIndex) => {
      const height = maxValue.value === 0 ? 0 : (value / maxValue.value) * chartHeight.value
      const x =
        padding.value.left +
        categoryStep.value * pointIndex +
        (categoryStep.value - groupWidth) / 2 +
        seriesIndex * (width + barGap)
      const y = chartBottom.value - height
      return {
        key: `${series.name}-${pointIndex}`,
        value,
        x,
        y,
        width,
        height,
        color: pickSeriesColor(seriesIndex, value),
        opacity: seriesCount > 1 && seriesIndex === 0 ? 0.85 : 1,
        tooltip: `${series.name} · ${props.categories[pointIndex]}: ${formatValue(value)} ${props.yAxisTitle.toLowerCase()}`,
      }
    }),
  )
})

const buildLinePath = (points: { x: number; y: number }[]) =>
  points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

const lines = computed(() => {
  if (props.type !== 'line') return []
  return safeSeries.value.map((series, seriesIndex) => {
    const points = series.data.map((value, pointIndex) => ({
      x: padding.value.left + categoryStep.value * pointIndex + categoryStep.value / 2,
      y: chartBottom.value - (value / maxValue.value) * chartHeight.value,
    }))

    return {
      name: series.name,
      color: props.colors[seriesIndex] || props.colors[props.colors.length - 1] || '#3b82f6',
      path: buildLinePath(points),
    }
  })
})

const linePoints = computed(() => {
  if (props.type !== 'line') return []
  return safeSeries.value.flatMap((series, seriesIndex) =>
    series.data.map((value, pointIndex) => ({
      key: `${series.name}-${pointIndex}`,
      value,
      x: padding.value.left + categoryStep.value * pointIndex + categoryStep.value / 2,
      y: chartBottom.value - (value / maxValue.value) * chartHeight.value,
      color: props.colors[seriesIndex] || props.colors[props.colors.length - 1] || '#3b82f6',
      tooltip: `${series.name} · ${props.categories[pointIndex]}: ${formatValue(value)} ${props.yAxisTitle.toLowerCase()}`,
    })),
  )
})

const thresholdLine = computed(() => {
  if (props.threshold == null) return null
  return {
    y: chartBottom.value - (props.threshold / maxValue.value) * chartHeight.value,
  }
})

const thresholdLabelText = computed(() =>
  props.thresholdLabel || `Umbral ${formatValue(props.threshold || 0)}`,
)

const formatValue = (value: number) =>
  new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }).format(Number(value) || 0)

const exportPng = async (filename: string) => {
  const svg = svgRef.value
  if (!svg) return

  const serializer = new XMLSerializer()
  const source = serializer.serializeToString(svg)
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const image = new Image()

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('No se pudo renderizar el SVG'))
    image.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = svgWidth * 2
  canvas.height = svgHeight.value * 2
  const context = canvas.getContext('2d')
  if (!context) {
    URL.revokeObjectURL(url)
    return
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(url)

  const pngUrl = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = pngUrl
  link.download = filename
  link.click()
}

defineExpose<SvgChartExpose>({
  exportPng,
})
</script>

<style scoped>
.svg-chart-root {
  width: 100%;
}

.svg-chart {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
}

.svg-chart-empty {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed rgba(var(--v-border-color), 0.22);
  border-radius: 18px;
  background: rgba(var(--v-theme-on-surface), 0.02);
  font-weight: 700;
}
</style>
