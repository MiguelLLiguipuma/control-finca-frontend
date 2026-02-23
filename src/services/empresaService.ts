import api from '@/services/api';

export interface EmpresaDto {
	id: number;
	nombre: string;
	ruc?: string | null;
	direccion?: string | null;
	telefono?: string | null;
	[key: string]: unknown;
}

export interface EmpresaPayloadDto {
	nombre: string;
	ruc?: string;
	direccion?: string;
	telefono?: string;
	[key: string]: unknown;
}

function normalizeError(error: unknown): Error {
	const fallback = 'Error inesperado';

	if (typeof error === 'object' && error !== null) {
		const err = error as {
			message?: string;
			request?: unknown;
			response?: {
				statusText?: string;
				data?: {
					message?: string;
					error?: string;
				};
			};
		};

		if (err.response) {
			const data = err.response.data;
			return new Error(
				data?.message || data?.error || err.response.statusText || fallback,
			);
		}

		if (err.request) {
			return new Error('No se pudo conectar con el servidor');
		}

		if (err.message) {
			return new Error(err.message);
		}
	}

	return new Error(fallback);
}

export const empresaService = {
	async cargarEmpresas(): Promise<EmpresaDto[]> {
		const response = await api.get<EmpresaDto[]>('/empresas');
		return response.data;
	},

	async obtenerEmpresaPorId(id: number): Promise<EmpresaDto> {
		try {
			const response = await api.get<EmpresaDto>(`/empresas/${id}`);
			return response.data;
		} catch (error) {
			throw normalizeError(error);
		}
	},

	async agregarEmpresa(empresa: EmpresaPayloadDto): Promise<EmpresaDto> {
		try {
			const response = await api.post<EmpresaDto>('/empresas', empresa);
			return response.data;
		} catch (error) {
			throw normalizeError(error);
		}
	},

	async actualizarEmpresa(
		id: number,
		empresa: EmpresaPayloadDto,
	): Promise<EmpresaDto> {
		try {
			const response = await api.put<EmpresaDto>(`/empresas/${id}`, empresa);
			return response.data;
		} catch (error) {
			throw normalizeError(error);
		}
	},

	async eliminarEmpresa(id: number): Promise<{ ok: true }> {
		try {
			await api.delete(`/empresas/${id}`);
			return { ok: true };
		} catch (error) {
			throw normalizeError(error);
		}
	},
};
