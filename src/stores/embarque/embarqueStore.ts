import { defineStore } from 'pinia';
import { embarqueService } from '@/services/embarque/embarqueService';
import type {
	EmbarqueAnularRequest,
	EmbarqueConfirmRequest,
	EmbarqueDetalleInput,
	EmbarqueEstado,
	EmbarqueListItem,
	EmbarquePreliquidacionLinea,
	EmbarqueVoucher,
} from '@/services/embarque/embarqueTypes';

type LineaEditable = EmbarquePreliquidacionLinea & {
	cajas_embarcadas: number;
	ratio_comercial_linea: number;
	ratio_operativo_linea: number;
};

interface EmbarqueState {
	loading: boolean;
	submitting: boolean;
	error: string | null;
	fechaEmbarque: string;
	fincaIds: number[];
	semanaCorte: number | null;
	observaciones: string;
	lineas: LineaEditable[];
	totales: {
		racimos_buenos: number;
		racimos_rechazo: number;
		total_racimos: number;
		total_cajas: number;
		ratio_comercial_global: number;
		ratio_operativo_global: number;
	};
	voucherActual: EmbarqueVoucher | null;
	listado: EmbarqueListItem[];
}

function hoyISO(): string {
	return new Date().toISOString().split('T')[0];
}

function normalizarFechaISO(value: unknown): string {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value !== 'string') return hoyISO();
	const raw = value.trim();
	const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
	return match ? match[1] : hoyISO();
}

function safeNumber(value: unknown, fallback = 0): number {
	const n = Number(value);
	return Number.isFinite(n) ? n : fallback;
}

function normalizarFincaIds(ids: number[]): number[] {
	return Array.from(
		new Set(
			(ids || [])
				.map((id) => Math.trunc(safeNumber(id, 0)))
				.filter((id) => id > 0),
		),
	);
}

function fechaHaceUnAnioISO(): string {
	const d = new Date();
	d.setFullYear(d.getFullYear() - 1);
	return d.toISOString().slice(0, 10);
}

function calcularRatiosLinea(linea: LineaEditable): LineaEditable {
	const buenos = Math.max(0, Math.trunc(safeNumber(linea.racimos_buenos)));
	const rechazo = Math.max(0, Math.trunc(safeNumber(linea.racimos_rechazo)));
	const total = buenos + rechazo;
	const cajas = Math.max(0, safeNumber(linea.cajas_embarcadas));
	const ratioCom = buenos > 0 ? cajas / buenos : 0;
	const ratioOp = total > 0 ? cajas / total : 0;

	return {
		...linea,
		racimos_buenos: buenos,
		racimos_rechazo: rechazo,
		total_racimos: total,
		cajas_embarcadas: Number(cajas.toFixed(2)),
		ratio_comercial_linea: Number(ratioCom.toFixed(4)),
		ratio_operativo_linea: Number(ratioOp.toFixed(4)),
	};
}

function extraerMensaje(error: unknown): string {
	const e = error as
		| { response?: { data?: { error?: string; message?: string } }; message?: string }
		| undefined;
	return (
		e?.response?.data?.error ||
		e?.response?.data?.message ||
		e?.message ||
		'Error no controlado en voucher de embarque.'
	);
}

export const useEmbarqueStore = defineStore('embarque', {
	state: (): EmbarqueState => ({
		loading: false,
		submitting: false,
		error: null,
		fechaEmbarque: hoyISO(),
		fincaIds: [],
		semanaCorte: null,
		observaciones: '',
		lineas: [],
		totales: {
			racimos_buenos: 0,
			racimos_rechazo: 0,
			total_racimos: 0,
			total_cajas: 0,
			ratio_comercial_global: 0,
			ratio_operativo_global: 0,
		},
		voucherActual: null,
		listado: [],
	}),

	getters: {
		estadoVoucher(): EmbarqueEstado | null {
			return this.voucherActual?.estado || null;
		},
		esEditable(): boolean {
			if (!this.voucherActual) return true;
			return this.voucherActual.estado === 'BORRADOR';
		},
		puedeConfirmar(): boolean {
			if (!this.lineas.length) return false;
			if (!this.esEditable) return false;
			return this.totales.total_cajas > 0;
		},
	},

	actions: {
		recalcularTotales() {
			const base = {
				racimos_buenos: 0,
				racimos_rechazo: 0,
				total_racimos: 0,
				total_cajas: 0,
				ratio_comercial_global: 0,
				ratio_operativo_global: 0,
			};

			for (const linea of this.lineas) {
				base.racimos_buenos += linea.racimos_buenos;
				base.racimos_rechazo += linea.racimos_rechazo;
				base.total_racimos += linea.total_racimos;
				base.total_cajas += linea.cajas_embarcadas;
			}

			base.total_cajas = Number(base.total_cajas.toFixed(2));
			base.ratio_comercial_global =
				base.racimos_buenos > 0
					? Number((base.total_cajas / base.racimos_buenos).toFixed(4))
					: 0;
			base.ratio_operativo_global =
				base.total_racimos > 0
					? Number((base.total_cajas / base.total_racimos).toFixed(4))
					: 0;

			this.totales = base;
		},

		setCajaLinea(index: number, value: number) {
			if (!this.esEditable) return;
			if (index < 0 || index >= this.lineas.length) return;
			const linea = this.lineas[index];
			this.lineas[index] = calcularRatiosLinea({
				...linea,
				cajas_embarcadas: Math.max(0, safeNumber(value, 0)),
			});
			this.recalcularTotales();
		},

		setCajasTotalesSemana(totalCajas: number) {
			if (!this.esEditable || !this.lineas.length) return;
			const total = Math.max(0, safeNumber(totalCajas, 0));

			const baseBuenos = this.lineas.reduce(
				(acc, l) => acc + Math.max(0, l.racimos_buenos),
				0,
			);
			const baseOperativa =
				baseBuenos > 0
					? baseBuenos
					: this.lineas.reduce((acc, l) => acc + Math.max(0, l.total_racimos), 0);

			if (baseOperativa <= 0) {
				this.lineas = this.lineas.map((l) =>
					calcularRatiosLinea({ ...l, cajas_embarcadas: 0 }),
				);
				this.recalcularTotales();
				return;
			}

			let acumulado = 0;
			this.lineas = this.lineas.map((linea, idx) => {
				const pesoBase =
					baseBuenos > 0
						? Math.max(0, linea.racimos_buenos)
						: Math.max(0, linea.total_racimos);

				const proporcional = Number(((total * pesoBase) / baseOperativa).toFixed(2));
				const valor = idx === this.lineas.length - 1
					? Number((total - acumulado).toFixed(2))
					: proporcional;
				acumulado += valor;
				return calcularRatiosLinea({
					...linea,
					cajas_embarcadas: Math.max(0, valor),
				});
			});

			this.recalcularTotales();
		},

		normalizarLinea(index: number) {
			if (index < 0 || index >= this.lineas.length) return;
			this.lineas[index] = calcularRatiosLinea(this.lineas[index]);
			this.recalcularTotales();
		},

		construirPayloadDetalles(): EmbarqueDetalleInput[] {
			return this.lineas.map((l) => ({
				finca_id: l.finca_id,
				calendario_id: l.calendario_id,
				cinta_color: l.cinta_color,
				semana_enfunde: l.semana_enfunde,
				anio_enfunde: l.anio_enfunde,
				racimos_buenos: l.racimos_buenos,
				racimos_rechazo: l.racimos_rechazo,
				cajas_embarcadas: l.cajas_embarcadas,
			}));
		},

		cargarVoucherEnFormulario(voucher: EmbarqueVoucher) {
			this.voucherActual = voucher;
			this.fechaEmbarque = normalizarFechaISO(voucher.fecha_embarque);
			this.semanaCorte = voucher.semana_corte;
			this.observaciones = voucher.observaciones || '';
			this.fincaIds = normalizarFincaIds(voucher.detalles.map((d) => d.finca_id));
			this.lineas = voucher.detalles.map((d) =>
				calcularRatiosLinea({
					finca_id: d.finca_id,
					finca_nombre: d.finca_nombre || `Finca ${d.finca_id}`,
					calendario_id: d.calendario_id,
					cinta_color: d.cinta_color,
					semana_enfunde: d.semana_enfunde,
					anio_enfunde: d.anio_enfunde,
					racimos_buenos: d.racimos_buenos,
					racimos_rechazo: d.racimos_rechazo,
					total_racimos: d.total_racimos,
					cajas_embarcadas: d.cajas_embarcadas,
					ratio_comercial_linea: d.ratio_comercial_linea,
					ratio_operativo_linea: d.ratio_operativo_linea,
				}),
			);
			this.recalcularTotales();
		},

		resetFormulario() {
			this.error = null;
			this.voucherActual = null;
			this.observaciones = '';
			this.lineas = [];
			this.totales = {
				racimos_buenos: 0,
				racimos_rechazo: 0,
				total_racimos: 0,
				total_cajas: 0,
				ratio_comercial_global: 0,
				ratio_operativo_global: 0,
			};
		},

		async cargarPreliquidacion() {
			this.loading = true;
			this.error = null;
			try {
				const fincaIds = normalizarFincaIds(this.fincaIds);
				const fechaFiltro = normalizarFechaISO(this.fechaEmbarque);
				this.fechaEmbarque = fechaFiltro;
				const data = await embarqueService.getPreliquidacion({
					fecha: fechaFiltro,
					finca_id: fincaIds.length === 1 ? fincaIds[0] : undefined,
					finca_ids: fincaIds.length ? fincaIds.join(',') : undefined,
				});
				this.voucherActual = null;
				this.lineas = (data.lineas || []).map((l) =>
					calcularRatiosLinea({
						...l,
						cajas_embarcadas: 0,
						ratio_comercial_linea: 0,
						ratio_operativo_linea: 0,
					}),
				);
				this.recalcularTotales();
			} catch (error) {
				this.error = extraerMensaje(error);
				this.lineas = [];
				this.recalcularTotales();
			} finally {
				this.loading = false;
			}
		},

		async guardarVoucher() {
			if (this.submitting) return;
			if (!this.lineas.length) {
				this.error = 'No hay lineas para guardar.';
				return;
			}

			this.submitting = true;
			this.error = null;
			try {
				const fechaEmbarque = normalizarFechaISO(this.fechaEmbarque);
				this.fechaEmbarque = fechaEmbarque;
				const payload = {
					fecha_embarque: fechaEmbarque,
					semana_corte: this.semanaCorte,
					observaciones: this.observaciones,
					detalles: this.construirPayloadDetalles(),
				};

				const result = this.voucherActual?.id
					? await embarqueService.actualizarVoucher(this.voucherActual.id, payload)
					: await embarqueService.crearVoucher(payload);

				this.cargarVoucherEnFormulario(result);
			} catch (error) {
				this.error = extraerMensaje(error);
			} finally {
				this.submitting = false;
			}
		},

		async confirmarVoucher() {
			if (!this.voucherActual?.id) {
				this.error = 'Primero debes guardar el voucher.';
				return;
			}
			if (!this.puedeConfirmar) {
				this.error = 'No se puede confirmar: valida lineas y cajas embarcadas.';
				return;
			}
			if (this.submitting) return;

			this.submitting = true;
			this.error = null;
			try {
				const payload: EmbarqueConfirmRequest = {
					id_local: crypto.randomUUID(),
				};
				const result = await embarqueService.confirmarVoucher(
					this.voucherActual.id,
					payload,
				);
				this.cargarVoucherEnFormulario(result.voucher);
			} catch (error) {
				this.error = extraerMensaje(error);
			} finally {
				this.submitting = false;
			}
		},

		async anularVoucher(motivo: string) {
			if (!this.voucherActual?.id) {
				this.error = 'No hay voucher para anular.';
				return;
			}
			if (this.submitting) return;

			const motivoLimpio = String(motivo || '').trim();
			if (!motivoLimpio) {
				this.error = 'Debes ingresar motivo de anulacion.';
				return;
			}

			this.submitting = true;
			this.error = null;
			try {
				const payload: EmbarqueAnularRequest = {
					motivo_anulacion: motivoLimpio,
				};
				const result = await embarqueService.anularVoucher(
					this.voucherActual.id,
					payload,
				);
				this.cargarVoucherEnFormulario(result);
			} catch (error) {
				this.error = extraerMensaje(error);
			} finally {
				this.submitting = false;
			}
		},

		async cargarVoucher(voucherId: number) {
			this.loading = true;
			this.error = null;
			try {
				const voucher = await embarqueService.getVoucher(voucherId);
				this.cargarVoucherEnFormulario(voucher);
			} catch (error) {
				this.error = extraerMensaje(error);
			} finally {
				this.loading = false;
			}
		},

		async cargarListado(fechaBusqueda?: string) {
			this.loading = true;
			this.error = null;
			try {
				const fincaIds = normalizarFincaIds(this.fincaIds);
				const fechaFiltro = normalizarFechaISO(
					typeof fechaBusqueda === 'string' ? fechaBusqueda : this.fechaEmbarque,
				);
				if (typeof fechaBusqueda !== 'string') {
					this.fechaEmbarque = fechaFiltro;
				}
				const data = await embarqueService.listVouchers({
					fecha_desde: fechaFiltro,
					fecha_hasta: fechaFiltro,
					finca_id: fincaIds.length === 1 ? fincaIds[0] : undefined,
					finca_ids: fincaIds.length ? fincaIds.join(',') : undefined,
				});
				this.listado = data.items || [];
			} catch (error) {
				this.error = extraerMensaje(error);
				this.listado = [];
			} finally {
				this.loading = false;
			}
		},

		async buscarVouchersAvanzado(args?: {
			fecha?: string;
			numeroVoucher?: string;
			numeroVoucherExacto?: boolean;
			fechaDesde?: string;
			fechaHasta?: string;
		}) {
			this.loading = true;
			this.error = null;
			try {
				const fincaIds = normalizarFincaIds(this.fincaIds);
				const numeroVoucher = String(args?.numeroVoucher || '').trim().toUpperCase();
				const numeroVoucherExacto = Boolean(args?.numeroVoucherExacto);
				const fecha = args?.fecha ? normalizarFechaISO(args.fecha) : undefined;
				const fechaDesde = normalizarFechaISO(args?.fechaDesde || fecha || fechaHaceUnAnioISO());
				const fechaHasta = normalizarFechaISO(args?.fechaHasta || fecha || hoyISO());

				const data = await embarqueService.listVouchers({
					fecha_desde: fechaDesde,
					fecha_hasta: fechaHasta,
					finca_id: fincaIds.length === 1 ? fincaIds[0] : undefined,
					finca_ids: fincaIds.length ? fincaIds.join(',') : undefined,
					numero_voucher: numeroVoucher || undefined,
					numero_voucher_exacto: numeroVoucher ? numeroVoucherExacto : undefined,
				});
				this.listado = data.items || [];
			} catch (error) {
				this.error = extraerMensaje(error);
				this.listado = [];
			} finally {
				this.loading = false;
			}
		},
	},
});
