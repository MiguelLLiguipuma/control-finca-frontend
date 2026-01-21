import { defineStore } from 'pinia';
import { ref } from 'vue';
// @ts-ignore (Ignoramos el servicio hasta que lo pasemos a TS en el futuro, pero el store ya queda blindado)
import { empresaService } from '@/services/empresaService';

// --- 1. INTERFACES ---
export interface Empresa {
	id: number;
	nombre: string;
	// Puedes agregar más campos si tu DB los tiene (ruc, dirección, etc.)
	[key: string]: any;
}

export interface EmpresaPayload {
	nombre: string;
	[key: string]: any;
}

// --- 2. STORE ---
export const useEmpresaStore = defineStore('empresaStore', () => {
	// STATE (Tipado explícitamente)
	const empresas = ref<Empresa[]>([]);
	const empresaSeleccionada = ref<Empresa | null>(null);

	const loading = ref<boolean>(false);
	const error = ref<string | null>(null);
	const successMessage = ref<string | null>(null);

	// === Mutadores locales ===
	const setEmpresas = (data: Empresa[]) => {
		empresas.value = data;
	};

	const agregarEmpresaLocal = (empresa: Empresa) => {
		empresas.value.push(empresa);
	};

	const eliminarEmpresaLocal = (id: number) => {
		empresas.value = empresas.value.filter((empresa) => empresa.id !== id);
	};

	const setEmpresaSeleccionada = (empresa: Empresa | null) => {
		empresaSeleccionada.value = empresa;
	};

	// === Helpers de mensajes ===
	const setError = (message: string) => {
		error.value = message;
	};

	const setSuccess = (message: string) => {
		successMessage.value = message;
	};

	const clearMessages = () => {
		error.value = null;
		successMessage.value = null;
	};

	// === ACCIONES ASYNC ===

	// Cargar todas las empresas
	const fetchEmpresas = async () => {
		loading.value = true;
		clearMessages();
		try {
			// TypeScript infiere que data es any por el servicio, pero lo casteamos al guardarlo
			const data = await empresaService.cargarEmpresas();
			setEmpresas(data);
			return data;
		} catch (err: any) {
			setError(err.message || 'Error al cargar empresas');
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Obtener una empresa por ID
	const fetchEmpresaById = async (id: number) => {
		loading.value = true;
		clearMessages();
		try {
			const data = await empresaService.obtenerEmpresaPorId(id);
			setEmpresaSeleccionada(data);
			return data;
		} catch (err: any) {
			setError(err.message || 'Error al obtener empresa');
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Crear empresa
	const crearEmpresa = async (payload: EmpresaPayload) => {
		loading.value = true;
		clearMessages();
		try {
			const creada = await empresaService.agregarEmpresa(payload);
			agregarEmpresaLocal(creada);
			setSuccess('Empresa creada correctamente');
			return creada;
		} catch (err: any) {
			setError(err.message || 'Error al crear empresa');
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Actualizar empresa
	const actualizarEmpresa = async (id: number, payload: EmpresaPayload) => {
		loading.value = true;
		clearMessages();
		try {
			const actualizada = await empresaService.actualizarEmpresa(id, payload);
			const index = empresas.value.findIndex((e) => e.id === actualizada.id);
			if (index !== -1) {
				empresas.value[index] = actualizada;
			}
			setSuccess('Empresa actualizada correctamente');
			return actualizada;
		} catch (err: any) {
			setError(err.message || 'Error al actualizar');
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Eliminar empresa
	const eliminarEmpresaAction = async (id: number) => {
		loading.value = true;
		clearMessages();
		try {
			await empresaService.eliminarEmpresa(id);
			eliminarEmpresaLocal(id);
			setSuccess('Empresa eliminada correctamente');
		} catch (err: any) {
			setError(err.message || 'Error al eliminar');
			throw err;
		} finally {
			loading.value = false;
		}
	};

	return {
		// state
		empresas,
		empresaSeleccionada,
		loading,
		error,
		successMessage,

		// mutadores
		setEmpresas,
		setEmpresaSeleccionada,

		// acciones
		fetchEmpresas,
		fetchEmpresaById,
		crearEmpresa,
		actualizarEmpresa,
		eliminarEmpresaAction,

		// helpers
		clearMessages,
	};
});
