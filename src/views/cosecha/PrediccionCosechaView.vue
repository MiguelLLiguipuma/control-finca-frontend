<template>
	<v-container fluid class="pa-4 pa-md-6 bg-background min-h-screen">
		<v-row justify="center">
			<v-col cols="12" xl="11">
				<v-card rounded="xl" elevation="3" class="mb-6" color="surface">
					<v-card-text class="d-flex flex-wrap align-center gap-3">
						<v-avatar color="info" variant="tonal" size="56">
							<v-icon size="30">mdi-chart-line</v-icon>
						</v-avatar>
						<div class="flex-grow-1">
							<h1 class="text-h4 font-weight-black text-high-emphasis mb-0">
								Predicción Consolidada de Cosecha
							</h1>
							<div class="text-body-2 text-medium-emphasis mt-1">
								Consolidado multi-finca y detalle individual por unidad productiva.
							</div>
						</div>
						<v-btn
							color="info"
							variant="tonal"
							prepend-icon="mdi-refresh"
							:loading="loading"
							@click="cargarPredicciones"
						>
							Actualizar
						</v-btn>
					</v-card-text>
				</v-card>

				<ViewHelpHint
					class="mb-4"
					title="¿Cómo leer esta Predicción Consolidada?"
					summary="Esta vista combina varias fincas para estimar racimos del próximo embarque y mostrar riesgo operativo por unidad productiva."
					:steps="[
						'Selecciona una o más fincas.',
						'Actualiza la predicción para recalcular datos.',
						'Revisa el bloque consolidado (total).',
						'Analiza el detalle por finca y sus cintas críticas.',
					]"
					:notes="[
						'El rango mínimo-máximo indica escenario esperado.',
						'Confianza alta sugiere menor variabilidad histórica.',
						'Ideal y Riesgo ayudan a priorizar cortes en campo.',
					]"
				/>

				<v-card rounded="xl" elevation="2" class="mb-6" color="surface">
					<v-card-text>
						<v-row dense class="align-center">
							<v-col cols="12" md="8">
								<v-autocomplete
									v-model="fincasSeleccionadas"
									:items="itemsFincas"
									item-title="title"
									item-value="value"
									multiple
									chips
									clearable
									label="Fincas a consolidar"
									variant="outlined"
									hide-details
								/>
							</v-col>
							<v-col cols="6" md="2">
								<v-btn
									block
									variant="tonal"
									color="primary"
									@click="seleccionarTodas"
								>
									Todas
								</v-btn>
							</v-col>
							<v-col cols="6" md="2">
								<v-btn
									block
									variant="text"
									color="medium-emphasis"
									@click="fincasSeleccionadas = []"
								>
									Limpiar
								</v-btn>
							</v-col>
						</v-row>
					</v-card-text>
				</v-card>

				<v-alert
					v-if="error"
					type="error"
					variant="tonal"
					class="mb-4"
				>
					{{ error }}
				</v-alert>
				<v-alert
					v-if="aviso"
					type="warning"
					variant="tonal"
					class="mb-4"
				>
					{{ aviso }}
				</v-alert>

				<v-row dense class="mb-6">
					<v-col cols="12" sm="6" lg="3">
						<v-sheet class="pa-4 metric-card rounded-xl" color="surface">
							<div class="text-caption text-medium-emphasis">Racimos estimados (total)</div>
							<div class="text-h4 font-weight-black">{{ consolidado.totalRacimosEstimados }}</div>
						</v-sheet>
					</v-col>
					<v-col cols="12" sm="6" lg="3">
						<v-sheet class="pa-4 metric-card rounded-xl" color="surface">
							<div class="text-caption text-medium-emphasis">Rango total</div>
							<div class="text-h6 font-weight-black">
								{{ consolidado.totalRangoMinimo }} - {{ consolidado.totalRangoMaximo }}
							</div>
						</v-sheet>
					</v-col>
					<v-col cols="12" sm="6" lg="3">
						<v-sheet class="pa-4 metric-card rounded-xl" color="surface">
							<div class="text-caption text-medium-emphasis">Ideal / Riesgo</div>
							<div class="text-h6 font-weight-black">
								{{ consolidado.totalIdeal }} / {{ consolidado.totalRiesgo }}
							</div>
						</v-sheet>
					</v-col>
					<v-col cols="12" sm="6" lg="3">
						<v-sheet class="pa-4 metric-card rounded-xl" color="surface">
							<div class="text-caption text-medium-emphasis">Confianza global</div>
							<div class="d-flex align-center mt-1">
								<v-chip size="small" :color="colorConfianza(consolidado.confianzaGlobal)">
									{{ consolidado.confianzaGlobal }}
								</v-chip>
								<span class="ml-2 text-body-2 text-medium-emphasis">
									Rechazo pond. {{ consolidado.rechazoPonderadoPct }}%
								</span>
							</div>
						</v-sheet>
					</v-col>
				</v-row>

				<v-card rounded="xl" elevation="2" color="surface" class="mb-6">
					<v-card-text>
						<div class="text-subtitle-1 font-weight-black mb-3">Detalle por finca</div>
						<div v-if="loading" class="text-center py-8">
							<v-progress-circular indeterminate color="info" />
						</div>
						<div v-else-if="!detalles.length" class="text-body-2 text-medium-emphasis py-4">
							Selecciona una o más fincas para calcular consolidado y detalle individual.
						</div>
						<div v-else class="table-scroll">
							<v-table density="comfortable">
								<thead>
									<tr>
										<th>Finca</th>
										<th>Empresa</th>
										<th>Semana Obj.</th>
										<th>Estimado</th>
										<th>Rango</th>
										<th>Ideal</th>
										<th>Riesgo</th>
										<th>Confianza</th>
										<th>Tendencia</th>
									</tr>
								</thead>
								<tbody>
									<tr v-for="item in detalles" :key="item.fincaId">
										<td class="font-weight-bold">{{ item.fincaNombre }}</td>
										<td>{{ item.empresaNombre }}</td>
										<td>Sem {{ item.semanaObjetivo }}/{{ item.anioObjetivo }}</td>
										<td class="font-weight-medium">{{ item.racimosEstimados }}</td>
										<td>{{ item.rangoMinimo }} - {{ item.rangoMaximo }}</td>
										<td>{{ item.racimosIdeal }}</td>
										<td>{{ item.racimosRiesgo }}</td>
										<td>
											<v-chip size="x-small" :color="colorConfianza(item.confianza)">
												{{ item.confianza }}
											</v-chip>
										</td>
										<td>{{ item.tendencia }}</td>
									</tr>
								</tbody>
							</v-table>
						</div>
					</v-card-text>
				</v-card>

				<v-expansion-panels v-if="detalles.length" variant="accordion">
					<v-expansion-panel
						v-for="item in detalles"
						:key="`panel-${item.fincaId}`"
					>
						<v-expansion-panel-title>
							<div class="d-flex align-center justify-space-between w-100 pr-2">
								<div>
									<div class="font-weight-black">{{ item.fincaNombre }}</div>
									<div class="text-caption text-medium-emphasis">{{ item.empresaNombre }}</div>
								</div>
								<div class="text-right">
									<div class="text-body-2 font-weight-bold">{{ item.racimosEstimados }} racimos</div>
									<div class="text-caption text-medium-emphasis">
										Meta UC: {{ item.metaUc }} · Prom UC: {{ item.promedioUcDiario.toFixed(2) }}
									</div>
								</div>
							</div>
						</v-expansion-panel-title>
						<v-expansion-panel-text>
							<div class="table-scroll">
								<v-table density="compact">
									<thead>
										<tr>
											<th>Cinta</th>
											<th>Saldo</th>
											<th>Madurez</th>
											<th>Días</th>
											<th>Fecha Estimada</th>
											<th>Cajas</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="fila in item.topCintas" :key="`${item.fincaId}-${fila.calendario_id}`">
											<td>{{ fila.color_cinta }}</td>
											<td>{{ fila.saldo_en_campo }}</td>
											<td>{{ fila.progreso_madurez.toFixed(1) }}%</td>
											<td>{{ fila.dias_faltantes }}</td>
											<td>{{ fila.fecha_estimada }}</td>
											<td>{{ fila.cajas_esperadas }}</td>
										</tr>
									</tbody>
								</v-table>
							</div>
						</v-expansion-panel-text>
					</v-expansion-panel>
				</v-expansion-panels>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useEmpresaStore } from '@/stores/empresaStore';
import { useFincaStore } from '@/stores/fincaStore';
import { cosechaService } from '@/services/cosecha/cosechaService';
import ViewHelpHint from '@/components/ui/ViewHelpHint.vue';
import {
	construirConsolidado,
	construirDetalleFinca,
	type PrediccionConsolidadaTotal,
	type PrediccionFincaDetalle,
} from '@/domain/cosecha/prediccionConsolidada';

const fincaStore = useFincaStore();
const empresaStore = useEmpresaStore();
const { fincasConEmpresa } = storeToRefs(fincaStore);

const loading = ref(false);
const error = ref('');
const aviso = ref('');
const fincasSeleccionadas = ref<number[]>([]);
const detalles = ref<PrediccionFincaDetalle[]>([]);

const consolidadoVacio: PrediccionConsolidadaTotal = {
	totalFincas: 0,
	totalRacimosEstimados: 0,
	totalRangoMinimo: 0,
	totalRangoMaximo: 0,
	totalIdeal: 0,
	totalRiesgo: 0,
	rechazoPonderadoPct: 0,
	confianzaGlobal: 'BAJA',
};

const consolidado = computed(() =>
	detalles.value.length ? construirConsolidado(detalles.value) : consolidadoVacio,
);

const itemsFincas = computed(() =>
	(fincasConEmpresa.value || []).map((f) => ({
		value: Number(f.id),
		title: `${f.nombre} · ${f.empresa_nombre || 'No asignada'}`,
	})),
);

function colorConfianza(value: string): string {
	const v = String(value || '').toUpperCase();
	if (v === 'ALTA') return 'success';
	if (v === 'MEDIA') return 'warning';
	return 'error';
}

function seleccionarTodas() {
	fincasSeleccionadas.value = itemsFincas.value.map((f) => Number(f.value));
	void cargarPredicciones();
}

async function cargarPredicciones() {
	error.value = '';
	aviso.value = '';
	detalles.value = [];

	const ids = Array.from(new Set((fincasSeleccionadas.value || []).map(Number))).filter(
		(n) => Number.isInteger(n) && n > 0,
	);
	if (!ids.length) return;

	loading.value = true;
	try {
		let respuestas: PrediccionFincaDetalle[] = [];
		let alertaParcial = '';

		try {
			const multi = await cosechaService.getPrediccionMulti(ids);
			const exitosas = (multi.items || []).filter((x) => x.ok && x.data);

				if (exitosas.length) {
					respuestas = exitosas.map((item) => {
						const fincaId = Number(item.finca_id);
						const finca = (fincasConEmpresa.value || []).find((f) => Number(f.id) === fincaId);
						return construirDetalleFinca({
							fincaId,
							fincaNombre: item.finca_nombre || finca?.nombre || `Finca ${fincaId}`,
							empresaNombre: item.empresa_nombre || finca?.empresa_nombre || 'No asignada',
							data: item.data!,
						});
					});
				if (multi.total_fallidas > 0 && multi.total_exitosas > 0) {
					alertaParcial = `${multi.total_fallidas} finca(s) no pudieron calcularse en esta corrida.`;
				}
			}
		} catch {
			// Fallback temporal por compatibilidad si el backend aun no está desplegado.
		}

		if (!respuestas.length) {
			respuestas = await Promise.all(
				ids.map(async (fincaId) => {
					const finca = (fincasConEmpresa.value || []).find((f) => Number(f.id) === fincaId);
					const data = await cosechaService.getPrediccion(fincaId);
					return construirDetalleFinca({
						fincaId,
						fincaNombre: finca?.nombre || `Finca ${fincaId}`,
						empresaNombre: finca?.empresa_nombre || 'No asignada',
						data,
					});
				}),
			);
		}

		detalles.value = respuestas.sort((a, b) =>
			a.fincaNombre.localeCompare(b.fincaNombre),
		);
		aviso.value = alertaParcial;
	} catch (e: any) {
		error.value =
			e?.response?.data?.error ||
			'No se pudo calcular la predicción consolidada para las fincas seleccionadas.';
	} finally {
		loading.value = false;
	}
}

onMounted(async () => {
	try {
		if (!empresaStore.empresas.length) {
			await empresaStore.fetchEmpresas();
		}
		await fincaStore.obtenerFincas();
	} catch {
		error.value = 'No fue posible cargar el catálogo de fincas.';
		return;
	}

	// Default: hasta 3 primeras fincas para mostrar consolidado inicial sin saturar.
	fincasSeleccionadas.value = itemsFincas.value.slice(0, 3).map((x) => Number(x.value));
	await cargarPredicciones();
});
</script>

<style scoped>
.metric-card {
	border: 1px solid rgba(var(--v-border-color), 0.16);
}

.table-scroll {
	overflow-x: auto;
	-webkit-overflow-scrolling: touch;
}

.table-scroll :deep(table) {
	min-width: 860px;
}
</style>
