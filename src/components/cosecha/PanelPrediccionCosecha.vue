<template>
	<v-card class="mb-6" rounded="xl" elevation="3" color="surface">
		<v-card-text class="pa-4 pa-md-5">
			<div class="d-flex align-center mb-4 pred-head">
				<v-avatar color="info" variant="tonal" size="42" class="mr-3">
					<v-icon>mdi-chart-timeline-variant</v-icon>
				</v-avatar>
				<div>
					<div class="text-subtitle-1 font-weight-black text-high-emphasis">
						Predicción de Cosecha
					</div>
					<div class="text-caption text-medium-emphasis">
						Proyección basada en clima y unidades calor acumuladas
					</div>
				</div>
				<v-spacer class="d-none d-sm-flex" />
				<v-btn
					size="small"
					variant="tonal"
					color="info"
					class="pred-refresh-btn"
					prepend-icon="mdi-refresh"
					:disabled="!fincaId || loading"
					:loading="loading"
					@click="cargarPrediccion"
				>
					Actualizar
				</v-btn>
			</div>

			<v-alert
				type="info"
				variant="tonal"
				density="comfortable"
				class="mb-4"
			>
				<div class="text-body-2">
					<strong>Cómo leer este panel:</strong> "Meta UC" es la meta de unidades calor para madurez,
					"Rango" es el escenario esperado de racimos y "Confianza" indica estabilidad del pronóstico.
				</div>
			</v-alert>

			<v-row dense class="mb-4">
				<v-col cols="12" sm="4">
					<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
						<div class="text-caption text-medium-emphasis">Meta UC</div>
						<div class="text-h6 font-weight-black text-high-emphasis">
							{{ metaAplicada }}
						</div>
					</v-sheet>
				</v-col>
				<v-col cols="12" sm="4">
					<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
						<div class="text-caption text-medium-emphasis">Promedio UC diario (7 días)</div>
						<div class="text-h6 font-weight-black text-high-emphasis">
							{{ promedioUC }}
						</div>
					</v-sheet>
				</v-col>
				<v-col cols="12" sm="4">
					<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
						<div class="text-caption text-medium-emphasis">Lotes proyectados</div>
						<div class="text-h6 font-weight-black text-high-emphasis">
							{{ filas.length }}
						</div>
					</v-sheet>
				</v-col>
			</v-row>

			<v-row v-if="proximoEmbarqueVista" dense class="mb-4">
				<v-col cols="12" md="8">
					<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
						<div class="d-flex flex-wrap align-center justify-space-between gap-2">
							<div>
								<div class="text-caption text-medium-emphasis">Próximo embarque estimado</div>
								<div class="text-h6 font-weight-black text-high-emphasis">
									Sem {{ proximoEmbarqueVista.semana_objetivo }}/{{ proximoEmbarqueVista.anio_objetivo }} · {{ proximoEmbarqueVista.racimos_estimados }} racimos
								</div>
							</div>
							<div class="d-flex flex-wrap align-center gap-2">
								<v-chip size="small" variant="tonal" color="info">
									Rango: {{ proximoEmbarqueVista.rango_minimo }} - {{ proximoEmbarqueVista.rango_maximo }}
								</v-chip>
								<v-chip size="small" variant="tonal" color="success">
									Ideal: {{ proximoEmbarqueVista.racimos_rango_ideal }}
								</v-chip>
								<v-chip size="small" variant="tonal" color="warning">
									Riesgo: {{ proximoEmbarqueVista.racimos_en_riesgo }}
								</v-chip>
							</div>
						</div>
					</v-sheet>
				</v-col>
				<v-col cols="12" md="4">
					<v-sheet class="pa-3 rounded-lg metric-card h-100" color="surface">
						<div class="text-caption text-medium-emphasis mb-2">Calidad de predicción</div>
						<div class="d-flex flex-wrap align-center gap-2 mb-2">
							<v-chip size="small" :color="colorConfianzaAvanzada(proximoEmbarqueVista.confianza)">
								{{ proximoEmbarqueVista.confianza }}
							</v-chip>
							<v-chip size="small" variant="tonal" color="primary">
								{{ proximoEmbarqueVista.tendencia }}
							</v-chip>
						</div>
						<div class="text-body-2 text-medium-emphasis">
							Rechazo estimado: <strong class="text-high-emphasis">{{ proximoEmbarqueVista.rechazo_estimado_pct }}%</strong> ·
							Edad promedio: <strong class="text-high-emphasis">{{ proximoEmbarqueVista.edad_promedio_corte }}</strong> sem
						</div>
						<div v-if="cachePrediccion" class="text-caption text-disabled mt-2">
							{{ cachePrediccion.hit ? 'Desde cache' : 'Recalculado' }} · {{ cachePrediccion.algoritmo_version }}
						</div>
						<div v-else class="text-caption text-disabled mt-2">
							Datos derivados localmente (sin bloque avanzado del backend)
						</div>
					</v-sheet>
				</v-col>
			</v-row>

			<v-sheet class="pa-3 rounded-lg metric-card mb-4" color="surface">
				<div class="d-flex align-center justify-space-between mb-3 flex-wrap gap-2">
					<div class="text-subtitle-2 font-weight-black text-high-emphasis">
						Modelo Embarque (Demo)
					</div>
					<v-switch
						v-model="usarModeloDemo"
						hide-details
						density="compact"
						color="primary"
						label="Usar datos de prueba"
					/>
				</div>

				<div v-if="usarModeloDemo">
					<div class="text-body-2 text-medium-emphasis mb-3">
						Compara aproximado actual del sistema vs modelo ponderado (base + estacional + tendencia).
					</div>
					<v-row dense>
						<v-col cols="12" sm="6" md="3">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">Aprox. actual sistema</div>
								<div class="text-h6 font-weight-black">{{ aproximadoSistemaDemo }}</div>
							</v-sheet>
						</v-col>
						<v-col cols="12" sm="6" md="3">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">Estimado nuevo neto</div>
								<div class="text-h6 font-weight-black">{{ modeloDemo?.estimadoNeto ?? '--' }}</div>
							</v-sheet>
						</v-col>
						<v-col cols="12" sm="6" md="3">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">Rango confiable</div>
								<div class="text-h6 font-weight-black">
									{{ modeloDemo?.rangoMin ?? '--' }} - {{ modeloDemo?.rangoMax ?? '--' }}
								</div>
							</v-sheet>
						</v-col>
						<v-col cols="12" sm="6" md="3">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">Delta vs sistema</div>
								<div class="text-h6 font-weight-black">
									{{ deltaDemoAbs }} ({{ deltaDemoPct }}%)
								</div>
							</v-sheet>
						</v-col>
					</v-row>

					<div class="mt-3 text-body-2 text-medium-emphasis">
						Pesos dinámicos:
						base <strong>{{ modeloDemo?.pesos.base ?? '--' }}</strong>,
						estacional <strong>{{ modeloDemo?.pesos.estacional ?? '--' }}</strong>,
						tendencia <strong>{{ modeloDemo?.pesos.tendencia ?? '--' }}</strong>.
					</div>
				</div>
			</v-sheet>

			<div v-if="!fincaId" class="text-medium-emphasis text-body-2 py-2">
				Selecciona una finca para ver proyección.
			</div>
			<div v-else-if="loading" class="d-flex justify-center py-6">
				<v-progress-circular indeterminate color="info" />
			</div>
			<div v-else-if="error" class="text-error text-body-2 py-2">
				{{ error }}
			</div>
			<div v-else-if="!filas.length" class="text-medium-emphasis text-body-2 py-2">
				No hay lotes con saldo para proyectar.
			</div>
			<div v-else>
				<div class="table-scroll">
					<v-table density="comfortable" class="pred-table">
					<thead>
						<tr>
							<th>Cinta</th>
							<th>Saldo</th>
							<th>Madurez</th>
							<th>Confianza</th>
							<th>Días</th>
							<th>Fecha Estimada</th>
							<th>Cajas</th>
							<th>Estado</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="item in filas" :key="item.calendario_id">
							<td>
								<div class="d-flex align-center">
									<span class="color-dot mr-2" :style="{ backgroundColor: item.color_hex }"></span>
									<span class="font-weight-bold">{{ item.color_cinta }}</span>
								</div>
							</td>
							<td class="font-weight-medium">{{ item.saldo_en_campo }}</td>
							<td>
								<v-chip
									size="small"
									variant="tonal"
									:color="colorMadurezPrediccion(item.progreso_madurez)"
								>
									{{ item.progreso_madurez.toFixed(1) }}%
								</v-chip>
							</td>
							<td>
								<v-tooltip location="top">
									<template #activator="{ props: ttProps }">
										<v-chip
											v-bind="ttProps"
											size="small"
											variant="tonal"
											:color="colorConfianzaPrediccion(item.confianza)"
										>
											{{ item.confianza }}
										</v-chip>
									</template>
									<span>{{ item.explicacion }}</span>
								</v-tooltip>
							</td>
							<td class="font-weight-medium">{{ item.dias_faltantes }}</td>
							<td>{{ formatearFecha(item.fecha_estimada) }}</td>
							<td class="font-weight-medium">{{ item.cajas_esperadas }}</td>
							<td>
								<v-chip size="small" :color="colorEstadoPrediccion(item.mensaje_clima)">
									{{ item.mensaje_clima }}
								</v-chip>
							</td>
						</tr>
					</tbody>
					</v-table>
				</div>

				<v-divider class="my-4" />

				<div class="d-flex align-center mb-3">
					<div class="text-subtitle-2 font-weight-black text-high-emphasis">
						Backtesting Operativo (ultimas 8 semanas)
					</div>
					<v-spacer />
					<v-chip
						v-if="backtestingSemanal.length"
						size="small"
						variant="tonal"
						:color="diagnosticoBacktesting.estadoColor"
					>
						{{ diagnosticoBacktesting.estadoLabel }}
					</v-chip>
				</div>

				<div v-if="backtestingSemanal.length" class="mb-3">
					<v-row dense>
						<v-col cols="12" sm="4">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">MAE Cajas/Sem</div>
								<div class="text-h6 font-weight-black text-high-emphasis">
									{{ resumenBacktesting.mae.toFixed(2) }}
								</div>
							</v-sheet>
						</v-col>
						<v-col cols="12" sm="4">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">MAPE (%)</div>
								<div class="text-h6 font-weight-black text-high-emphasis">
									{{ resumenBacktesting.mape.toFixed(2) }}%
								</div>
							</v-sheet>
						</v-col>
						<v-col cols="12" sm="4">
							<v-sheet class="pa-3 rounded-lg metric-card" color="surface">
								<div class="text-caption text-medium-emphasis">Sesgo (%)</div>
								<div class="text-h6 font-weight-black text-high-emphasis">
									{{ resumenBacktesting.sesgoPct.toFixed(2) }}%
								</div>
							</v-sheet>
						</v-col>
					</v-row>

					<div class="table-scroll">
						<v-table density="compact" class="pred-table mt-2">
						<thead>
							<tr>
								<th>Semana</th>
								<th>Real</th>
								<th>Estimado</th>
								<th>Error Abs</th>
								<th>Error %</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in backtestingSemanal" :key="row.key">
								<td>{{ row.semanaLabel }}</td>
								<td>{{ row.cajasReales.toFixed(2) }}</td>
								<td>{{ row.cajasEstimadas.toFixed(2) }}</td>
								<td>{{ row.errorAbs.toFixed(2) }}</td>
								<td>{{ row.errorPct.toFixed(2) }}%</td>
							</tr>
						</tbody>
						</v-table>
					</div>

					<v-alert
						v-if="diagnosticoBacktesting.recomiendaRecalibrar"
						type="warning"
						variant="tonal"
						class="mt-3"
						density="comfortable"
					>
						{{ diagnosticoBacktesting.mensaje }}
					</v-alert>
				</div>
				<div v-else class="text-medium-emphasis text-body-2">
					No hay suficientes vouchers confirmados para backtesting en este periodo.
				</div>
			</div>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/es';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
	cosechaService,
} from '../../services/cosecha/cosechaService';
import { embarqueService } from '@/services/embarque/embarqueService';
import { useCosechaStore } from '../../stores/cosecha/cosechaStore';
import {
	type PrediccionCosechaVM,
	type DiagnosticoBacktestingVM,
	type BacktestingResumenVM,
	type BacktestingSemanaVM,
	type PrediccionFilaVM,
	construirBacktestingSemanal,
	diagnosticarBacktesting,
	resumirBacktestingSemanal,
	colorEstadoPrediccion,
	colorConfianzaPrediccion,
	colorMadurezPrediccion,
	construirPrediccionVM,
	crearPrediccionVacia,
} from '@/domain/cosecha/prediccionCosecha';
import {
	HISTORICO_EMBARQUE_DEMO,
	calcularModeloDemo,
} from '@/domain/cosecha/prediccionEmbarqueDemo';

dayjs.extend(customParseFormat);
dayjs.extend(isoWeek);
dayjs.locale('es');

const props = defineProps<{
	fincaId: number | null;
}>();

const loading = ref(false);
const error = ref('');
const metaAplicada = ref<number | string>(crearPrediccionVacia().metaAplicada);
const promedioUC = ref<string>(String(crearPrediccionVacia().promedioUC));
const proyecciones = ref<PrediccionFilaVM[]>(crearPrediccionVacia().filas);
const proximoEmbarque = ref<PrediccionCosechaVM['proximoEmbarque']>(null);
const cachePrediccion = ref<PrediccionCosechaVM['cache']>(null);
const usarModeloDemo = ref(true);
const backtestingSemanal = ref<BacktestingSemanaVM[]>([]);
const resumenBacktesting = ref<BacktestingResumenVM>({
	mae: 0,
	mape: 0,
	sesgoPct: 0,
	totalSemanas: 0,
});
const diagnosticoBacktesting = ref<DiagnosticoBacktestingVM>({
	estadoLabel: 'ESTABLE',
	estadoColor: 'success',
	recomiendaRecalibrar: false,
	mensaje: '',
});
const cosechaStore = useCosechaStore();

const filas = computed(() => proyecciones.value);
const proximoEmbarqueVista = computed(() => {
	if (proximoEmbarque.value) return proximoEmbarque.value;
	if (!filas.value.length) return null;
	const anio = new Date().getFullYear();
	const estimado = filas.value.reduce((acc, item) => acc + Number(item.saldo_en_campo || 0), 0);
	const ideal = Math.round(estimado * 0.65);
	const riesgo = Math.max(0, estimado - ideal);
	return {
		anio_objetivo: anio,
		semana_objetivo: cosechaStore.semanaActual || 0,
		racimos_estimados: Math.round(estimado),
		rango_minimo: Math.round(estimado * 0.9),
		rango_maximo: Math.round(estimado * 1.1),
		racimos_rango_ideal: ideal,
		racimos_en_riesgo: riesgo,
		rechazo_estimado_pct: 0,
		edad_promedio_corte: 0,
		tendencia: 'ESTABLE',
		confianza: 'MEDIA',
		sigma: 0,
		factor_estacional: 1,
		metodo: 'fallback_ui',
	};
});

const modeloDemo = computed(() => {
	if (!usarModeloDemo.value) return null;
	return calcularModeloDemo(HISTORICO_EMBARQUE_DEMO, cosechaStore.semanaActual || 1, 8.5);
});

const aproximadoSistemaDemo = computed(() => {
	return Number(proximoEmbarqueVista.value?.racimos_estimados || 0);
});

const deltaDemoAbs = computed(() => {
	if (!modeloDemo.value) return '--';
	const delta = modeloDemo.value.estimadoNeto - aproximadoSistemaDemo.value;
	return delta.toFixed(2);
});

const deltaDemoPct = computed(() => {
	if (!modeloDemo.value || aproximadoSistemaDemo.value <= 0) return '--';
	const pct = ((modeloDemo.value.estimadoNeto - aproximadoSistemaDemo.value) / aproximadoSistemaDemo.value) * 100;
	return pct.toFixed(2);
});

function formatearFecha(fecha: string): string {
	if (!fecha) return '--';
	const d = dayjs(fecha, 'YYYY-MM-DD', true);
	return d.isValid() ? d.format('DD/MM/YYYY') : '--';
}

function colorConfianzaAvanzada(confianza: string): string {
	const c = String(confianza || '').toUpperCase();
	if (c === 'ALTA') return 'success';
	if (c === 'MEDIA') return 'warning';
	return 'error';
}

async function cargarPrediccion() {
	if (!props.fincaId) {
		const emptyVM = crearPrediccionVacia();
		proyecciones.value = emptyVM.filas;
		metaAplicada.value = emptyVM.metaAplicada;
		promedioUC.value = String(emptyVM.promedioUC);
		backtestingSemanal.value = [];
		resumenBacktesting.value = { mae: 0, mape: 0, sesgoPct: 0, totalSemanas: 0 };
		diagnosticoBacktesting.value = diagnosticarBacktesting(resumenBacktesting.value);
		error.value = '';
		return;
	}

	loading.value = true;
	error.value = '';

	try {
		const data = await cosechaService.getPrediccion(props.fincaId);
		const vm = construirPrediccionVM(data);
		metaAplicada.value = vm.metaAplicada;
		promedioUC.value = String(vm.promedioUC);
		proyecciones.value = vm.filas;
		proximoEmbarque.value = vm.proximoEmbarque;
		cachePrediccion.value = vm.cache;
		cosechaStore.configurarVentanaCorte(vm.semanaInicio, vm.semanaFin);

		const fechaHasta = dayjs().format('YYYY-MM-DD');
		const fechaDesde = dayjs().subtract(8, 'week').startOf('week').format('YYYY-MM-DD');
		const vouchers = await embarqueService.listVouchers({
			finca_id: props.fincaId,
			estado: 'CONFIRMADO',
			fecha_desde: fechaDesde,
			fecha_hasta: fechaHasta,
		});
		backtestingSemanal.value = construirBacktestingSemanal(
			vouchers.items || [],
			vm.ratioAplicado,
		);
		resumenBacktesting.value = resumirBacktestingSemanal(backtestingSemanal.value);
		diagnosticoBacktesting.value = diagnosticarBacktesting(resumenBacktesting.value);
	} catch {
		error.value = 'No fue posible cargar la predicción para esta finca.';
		const emptyVM = crearPrediccionVacia();
		proyecciones.value = emptyVM.filas;
		proximoEmbarque.value = null;
		cachePrediccion.value = null;
		backtestingSemanal.value = [];
		resumenBacktesting.value = { mae: 0, mape: 0, sesgoPct: 0, totalSemanas: 0 };
		diagnosticoBacktesting.value = diagnosticarBacktesting(resumenBacktesting.value);
	} finally {
		loading.value = false;
	}
}

watch(() => props.fincaId, cargarPrediccion, { immediate: true });
</script>

<style scoped>
.metric-card {
	border: 1px solid rgba(var(--v-border-color), 0.12);
}

.table-scroll {
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
}

.table-scroll :deep(table) {
	min-width: 760px;
}

.pred-table th {
	font-size: 0.72rem;
	text-transform: uppercase;
	letter-spacing: 0.4px;
}

.color-dot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	display: inline-block;
}

@media (max-width: 600px) {
	.pred-head {
		align-items: flex-start !important;
		gap: 10px;
	}

	.pred-refresh-btn {
		width: 100%;
	}
}
</style>
