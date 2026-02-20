<template>
	<v-card class="mb-6" rounded="xl" elevation="3" color="surface">
		<v-card-text class="pa-4 pa-md-5">
			<div class="d-flex align-center mb-4">
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
				<v-spacer />
				<v-btn
					size="small"
					variant="tonal"
					color="info"
					prepend-icon="mdi-refresh"
					:disabled="!fincaId || loading"
					:loading="loading"
					@click="cargarPrediccion"
				>
					Actualizar
				</v-btn>
			</div>

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
						<div class="text-caption text-medium-emphasis">Promedio UC diario</div>
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
				<v-table density="comfortable" class="pred-table">
					<thead>
						<tr>
							<th>Cinta</th>
							<th>Saldo</th>
							<th>Madurez</th>
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
									:color="item.progreso_madurez >= 90 ? 'error' : item.progreso_madurez >= 75 ? 'warning' : 'info'"
								>
									{{ item.progreso_madurez.toFixed(1) }}%
								</v-chip>
							</td>
							<td class="font-weight-medium">{{ item.dias_faltantes }}</td>
							<td>{{ formatearFecha(item.fecha_estimada) }}</td>
							<td class="font-weight-medium">{{ item.cajas_esperadas }}</td>
							<td>
								<v-chip size="small" :color="item.mensaje_clima === 'Corte Urgente' ? 'error' : item.mensaje_clima === 'Proxima Cosecha' ? 'warning' : 'success'">
									{{ item.mensaje_clima }}
								</v-chip>
							</td>
						</tr>
					</tbody>
				</v-table>
			</div>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
	cosechaService,
	type PrediccionCosechaItem,
} from '../../services/cosecha/cosechaService';
import { useCosechaStore } from '../../stores/cosecha/cosechaStore';

const props = defineProps<{
	fincaId: number | null;
}>();

const loading = ref(false);
const error = ref('');
const metaAplicada = ref<number | string>('--');
const promedioUC = ref<string>('--');
const proyecciones = ref<PrediccionCosechaItem[]>([]);
const cosechaStore = useCosechaStore();

const filas = computed(() =>
	[...proyecciones.value].sort((a, b) => a.dias_faltantes - b.dias_faltantes),
);

function formatearFecha(fecha: string): string {
	if (!fecha) return '--';
	return new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES');
}

async function cargarPrediccion() {
	if (!props.fincaId) {
		proyecciones.value = [];
		metaAplicada.value = '--';
		promedioUC.value = '--';
		error.value = '';
		return;
	}

	loading.value = true;
	error.value = '';

	try {
		const data = await cosechaService.getPrediccion(props.fincaId);
		metaAplicada.value = data.meta_aplicada || '--';
		promedioUC.value = data.promedio_climatico_semanal || '--';
		proyecciones.value = data.proyecciones || [];
		cosechaStore.configurarVentanaCorte(data.semana_inicio, data.semana_fin);
	} catch {
		error.value = 'No fue posible cargar la predicción para esta finca.';
		proyecciones.value = [];
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
</style>
