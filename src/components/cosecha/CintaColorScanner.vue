<script setup lang="ts">
import { computed, onUnmounted, reactive, shallowRef, useTemplateRef } from 'vue';
import {
	detectCintaColorFromRgb,
	getAverageRgbFromImageData,
	getCintaColorHex,
	type CintaColorDetection,
	type CintaColorNombre,
} from '@/domain/cosecha/cintaColorRecognition';

const props = withDefaults(
	defineProps<{
		countableColors?: CintaColorNombre[];
	}>(),
	{
		countableColors: () => [],
	},
);

const emit = defineEmits<{
	(e: 'detected', color: CintaColorNombre | null): void;
	(e: 'counted', color: CintaColorNombre): void;
}>();

const CINTA_COLORS: CintaColorNombre[] = [
	'Blanca',
	'Negra',
	'Lila',
	'Roja',
	'Cafe',
	'Amarilla',
	'Verde',
	'Azul',
];

const videoRef = useTemplateRef<HTMLVideoElement>('videoRef');
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef');
const active = shallowRef(false);
const loading = shallowRef(false);
const error = shallowRef('');
const countWarning = shallowRef('');
const autoCount = shallowRef(false);
const stableColor = shallowRef<CintaColorNombre | null>(null);
const stableSamples = shallowRef(0);
const lastCountAt = shallowRef(0);
const detection = shallowRef<CintaColorDetection>({
	color: null,
	confidence: 0,
	hex: '#94a3b8',
	label: 'Sin lectura',
});
const stream = shallowRef<MediaStream | null>(null);
const intervalId = shallowRef<number | null>(null);
const counts = reactive<Record<CintaColorNombre, number>>({
	Blanca: 0,
	Negra: 0,
	Lila: 0,
	Roja: 0,
	Cafe: 0,
	Amarilla: 0,
	Verde: 0,
	Azul: 0,
});

const statusColor = computed(() => {
	if (error.value) return 'error';
	if (!active.value) return 'medium-emphasis';
	if (detection.value.confidence >= 70) return 'success';
	if (detection.value.confidence >= 45) return 'warning';
	return 'info';
});

const confidenceLabel = computed(() => {
	if (!active.value) return 'Cámara apagada';
	if (!detection.value.color) return 'Ajuste la cinta al recuadro';
	return `${detection.value.confidence}% confianza`;
});

const totalCounted = computed(() =>
	CINTA_COLORS.reduce((total, color) => total + counts[color], 0),
);

const countableColorSet = computed(() => new Set(props.countableColors));
const cameraSupported = computed(
	() =>
		typeof navigator !== 'undefined' &&
		typeof navigator.mediaDevices?.getUserMedia === 'function',
);

const canCountCurrentColor = computed(
	() =>
		active.value &&
		!!detection.value.color &&
		detection.value.confidence >= 55 &&
		canCountColor(detection.value.color),
);

function canCountColor(color: CintaColorNombre): boolean {
	return countableColorSet.value.has(color);
}

function stopScanner() {
	if (intervalId.value) {
		window.clearInterval(intervalId.value);
		intervalId.value = null;
	}
	stream.value?.getTracks().forEach((track) => track.stop());
	stream.value = null;
	active.value = false;
	stableColor.value = null;
	stableSamples.value = 0;
}

function registerCount(color: CintaColorNombre) {
	if (!canCountColor(color)) {
		countWarning.value = `La cinta ${color} no está habilitada en las semanas seleccionadas.`;
		return;
	}
	countWarning.value = '';
	counts[color] += 1;
	lastCountAt.value = Date.now();
	emit('counted', color);
}

function countCurrentColor() {
	const color = detection.value.color;
	if (!color || detection.value.confidence < 45) return;
	registerCount(color);
}

function maybeAutoCount(nextDetection: CintaColorDetection) {
	if (
		!autoCount.value ||
		!nextDetection.color ||
		nextDetection.confidence < 70 ||
		!canCountColor(nextDetection.color)
	) {
		stableColor.value = null;
		stableSamples.value = 0;
		return;
	}

	if (stableColor.value === nextDetection.color) {
		stableSamples.value += 1;
	} else {
		stableColor.value = nextDetection.color;
		stableSamples.value = 1;
	}

	const ready = stableSamples.value >= 3;
	const cooledDown = Date.now() - lastCountAt.value > 1800;
	if (ready && cooledDown) {
		registerCount(nextDetection.color);
		stableSamples.value = 0;
	}
}

function getCameraErrorMessage(cause: unknown): string {
	const err = cause as { name?: string; message?: string } | undefined;
	const name = err?.name || '';

	if (!cameraSupported.value) {
		return 'El navegador no permite usar cámara en esta conexión. Abra el sistema en HTTPS o en localhost.';
	}

	if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
		return 'Permiso de cámara denegado. Active el permiso de cámara para este sitio en el navegador.';
	}

	if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
		return 'No se encontró una cámara disponible en este dispositivo.';
	}

	if (name === 'NotReadableError' || name === 'TrackStartError') {
		return 'La cámara está ocupada por otra aplicación o el sistema no permitió abrirla.';
	}

	if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
		return 'No se encontró una cámara compatible con la configuración solicitada.';
	}

	if (name === 'SecurityError') {
		return 'El navegador bloqueó la cámara por seguridad. Use HTTPS o revise los permisos del sitio.';
	}

	return err?.message
		? `No se pudo activar la cámara: ${err.message}`
		: 'No se pudo activar la cámara.';
}

async function requestCameraStream(): Promise<MediaStream> {
	if (!cameraSupported.value) {
		throw new DOMException('getUserMedia no disponible', 'SecurityError');
	}

	try {
		return await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1280 },
				height: { ideal: 720 },
			},
			audio: false,
		});
	} catch (primaryError) {
		const err = primaryError as { name?: string } | undefined;
		if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
			throw primaryError;
		}

		try {
			return await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false,
			});
		} catch {
			throw primaryError;
		}
	}
}

function sampleFrame() {
	const video = videoRef.value;
	const canvas = canvasRef.value;
	if (!video || !canvas || video.readyState < 2) return;

	const width = video.videoWidth;
	const height = video.videoHeight;
	if (!width || !height) return;

	const sampleSize = Math.round(Math.min(width, height) * 0.34);
	const sourceX = Math.round((width - sampleSize) / 2);
	const sourceY = Math.round((height - sampleSize) / 2);
	canvas.width = sampleSize;
	canvas.height = sampleSize;

	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) return;

	context.drawImage(
		video,
		sourceX,
		sourceY,
		sampleSize,
		sampleSize,
		0,
		0,
		sampleSize,
		sampleSize,
	);

	const imageData = context.getImageData(0, 0, sampleSize, sampleSize);
	const rgb = getAverageRgbFromImageData(imageData);
	const nextDetection = rgb
		? detectCintaColorFromRgb(rgb)
		: {
				color: null,
				confidence: 0,
				hex: '#94a3b8',
				label: 'Color no reconocido',
			};

	detection.value = nextDetection;
	if (nextDetection.confidence >= 55) {
		emit('detected', nextDetection.color);
	}
	maybeAutoCount(nextDetection);
}

async function startScanner() {
	error.value = '';
	loading.value = true;

	try {
		stopScanner();
		const mediaStream = await requestCameraStream();

		stream.value = mediaStream;
		if (videoRef.value) {
			videoRef.value.srcObject = mediaStream;
			await videoRef.value.play();
		}

		active.value = true;
		intervalId.value = window.setInterval(sampleFrame, 650);
		window.setTimeout(sampleFrame, 300);
	} catch (cause) {
		error.value = getCameraErrorMessage(cause);
		stopScanner();
	} finally {
		loading.value = false;
	}
}

function clearDetection() {
	detection.value = {
		color: null,
		confidence: 0,
		hex: '#94a3b8',
		label: 'Sin lectura',
	};
	stableColor.value = null;
	stableSamples.value = 0;
	countWarning.value = '';
	emit('detected', null);
}

onUnmounted(stopScanner);
</script>

<template>
	<v-card border variant="flat" class="scanner-card mb-4">
		<v-card-text class="pa-4">
			<div class="d-flex align-center justify-space-between gap-3 flex-wrap mb-3">
				<div class="d-flex align-center">
					<v-avatar :style="{ backgroundColor: detection.hex + '22' }" rounded="lg" size="44">
						<v-icon :style="{ color: detection.hex }">mdi-camera-iris</v-icon>
					</v-avatar>
					<div class="ml-3">
						<div class="text-subtitle-1 font-weight-black text-high-emphasis">
							Conteo con cámara
						</div>
						<div class="text-caption text-medium-emphasis">
							{{ confidenceLabel }}
						</div>
					</div>
				</div>

				<div class="d-flex align-center gap-2">
					<v-chip
						:color="statusColor"
						variant="tonal"
						size="small"
						class="font-weight-bold"
					>
						{{ detection.label }}
					</v-chip>
					<v-btn
						v-if="active"
						icon="mdi-close"
						size="small"
						variant="text"
						aria-label="Apagar cámara"
						@click="stopScanner"
					/>
					<v-btn
						v-else
						color="primary"
						variant="flat"
						size="small"
						prepend-icon="mdi-camera"
						:loading="loading"
						@click="startScanner"
					>
						Escanear
					</v-btn>
				</div>
			</div>

			<div class="d-flex align-center justify-space-between gap-2 flex-wrap mb-3">
				<v-chip color="primary" variant="tonal" class="font-weight-black">
					<v-icon start size="small">mdi-counter</v-icon>
					{{ totalCounted }} racimos contados en esta sesión
				</v-chip>
				<div class="d-flex align-center gap-2">
					<v-switch
						v-model="autoCount"
						color="success"
						density="compact"
						hide-details
						inset
						label="Auto"
					/>
					<v-btn
						color="success"
						variant="flat"
						size="small"
						prepend-icon="mdi-plus"
						:disabled="!canCountCurrentColor"
						@click="countCurrentColor"
					>
						Contar
					</v-btn>
				</div>
			</div>

			<v-alert
				v-if="error"
				type="error"
				variant="tonal"
				density="compact"
				class="mb-3"
			>
				{{ error }}
			</v-alert>

			<v-alert
				v-if="countWarning"
				type="warning"
				variant="tonal"
				density="compact"
				class="mb-3"
			>
				{{ countWarning }}
			</v-alert>

			<div v-show="active" class="scanner-preview">
				<video
					ref="videoRef"
					class="scanner-video"
					autoplay
					muted
					playsinline
				/>
				<div class="scanner-target" />
				<div class="scanner-swatch" :style="{ backgroundColor: detection.hex }" />
			</div>

			<div v-if="detection.color" class="d-flex justify-end mt-3">
				<v-btn
					color="medium-emphasis"
					variant="text"
					size="small"
					prepend-icon="mdi-backspace-outline"
					@click="clearDetection"
				>
					Limpiar lectura
				</v-btn>
			</div>

			<div class="counter-grid mt-3">
				<button
					v-for="color in CINTA_COLORS"
					:key="color"
					type="button"
					class="counter-pill"
					:class="{ 'counter-pill-active': detection.color === color }"
					:disabled="!canCountColor(color)"
					@click="registerCount(color)"
				>
					<span
						class="counter-dot"
						:style="{ backgroundColor: getCintaColorHex(color) }"
					/>
					<span class="counter-name">{{ color }}</span>
					<span class="counter-value">{{ counts[color] }}</span>
				</button>
			</div>

			<canvas ref="canvasRef" class="scanner-canvas" aria-hidden="true" />
		</v-card-text>
	</v-card>
</template>

<style scoped>
.scanner-card {
	border-radius: 8px;
}

.scanner-preview {
	position: relative;
	overflow: hidden;
	height: 260px;
	border-radius: 8px;
	background: #0f172a;
}

.scanner-video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
}

.scanner-target {
	position: absolute;
	left: 50%;
	top: 50%;
	width: min(44vw, 180px);
	aspect-ratio: 1;
	border: 3px solid rgba(255, 255, 255, 0.86);
	border-radius: 8px;
	transform: translate(-50%, -50%);
	box-shadow: 0 0 0 999px rgba(15, 23, 42, 0.28);
}

.scanner-swatch {
	position: absolute;
	right: 14px;
	bottom: 14px;
	width: 44px;
	height: 44px;
	border: 2px solid rgba(255, 255, 255, 0.86);
	border-radius: 999px;
	box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
}

.scanner-canvas {
	display: none;
}

.counter-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
	gap: 8px;
}

.counter-pill {
	display: grid;
	grid-template-columns: 18px 1fr auto;
	align-items: center;
	gap: 8px;
	min-height: 42px;
	padding: 7px 10px;
	border: 1px solid rgba(var(--v-border-color), 0.18);
	border-radius: 8px;
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
	cursor: pointer;
}

.counter-pill:disabled {
	cursor: not-allowed;
	opacity: 0.42;
}

.counter-pill-active {
	border-color: rgb(var(--v-theme-info));
	background: rgba(var(--v-theme-info), 0.08);
}

.counter-dot {
	width: 16px;
	height: 16px;
	border: 1px solid rgba(var(--v-border-color), 0.28);
	border-radius: 999px;
}

.counter-name {
	overflow: hidden;
	font-size: 0.82rem;
	font-weight: 800;
	text-align: left;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.counter-value {
	font-size: 1rem;
	font-weight: 900;
}

.gap-2 {
	gap: 8px;
}

.gap-3 {
	gap: 12px;
}
</style>
