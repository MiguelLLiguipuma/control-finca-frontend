// src/stores/empresaStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { empresaService } from '@/services/empresaService';

export const useEmpresaStore = defineStore('empresaStore', () => {
	// STATE
	const empresas = ref([]);
	const empresaSeleccionada = ref(null);

	const loading = ref(false);
	const error = ref(null);
	const successMessage = ref(null);

	// === Mutadores locales ===
	const setEmpresas = (data) => {
		empresas.value = data;
	};

	const agregarEmpresaLocal = (empresa) => {
		empresas.value.push(empresa);
	};

	const eliminarEmpresaLocal = (id) => {
		empresas.value = empresas.value.filter((empresa) => empresa.id !== id);
	};

	const setEmpresaSeleccionada = (empresa) => {
		empresaSeleccionada.value = empresa;
	};

	// === Helpers de mensajes ===
	const setError = (message) => {
		error.value = message;
	};

	const setSuccess = (message) => {
		successMessage.value = message;
	};

	const clearMessages = () => {
		error.value = null;
		successMessage.value = null;
	};

	// === ACCIONES ASYNC QUE HABLAN CON EL BACKEND ===

	// Cargar todas las empresas
	const fetchEmpresas = async () => {
		loading.value = true;
		clearMessages();
		try {
			const data = await empresaService.cargarEmpresas();
			setEmpresas(data);
			return data;
		} catch (err) {
			setError(err.message);
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Obtener una empresa por ID (si la necesitas)
	const fetchEmpresaById = async (id) => {
		loading.value = true;
		clearMessages();
		try {
			const data = await empresaService.obtenerEmpresaPorId(id);
			setEmpresaSeleccionada(data);
			return data;
		} catch (err) {
			setError(err.message);
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Crear empresa
	const crearEmpresa = async (payload) => {
		loading.value = true;
		clearMessages();
		try {
			const creada = await empresaService.agregarEmpresa(payload);
			agregarEmpresaLocal(creada);
			setSuccess('Empresa creada correctamente');
			return creada;
		} catch (err) {
			// Aquí puede venir "nombre es requerido" o "Empresa ya existe"
			setError(err.message);
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Actualizar empresa
	const actualizarEmpresa = async (id, payload) => {
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
		} catch (err) {
			// Aquí puede venir "Nombre en uso" o "Empresa no encontrada"
			setError(err.message);
			throw err;
		} finally {
			loading.value = false;
		}
	};

	// Eliminar empresa
	const eliminarEmpresaAction = async (id) => {
		loading.value = true;
		clearMessages();
		try {
			await empresaService.eliminarEmpresa(id);
			eliminarEmpresaLocal(id);
			setSuccess('Empresa eliminada correctamente');
		} catch (err) {
			setError(err.message);
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

		// mutadores sincrónicos (si los quieres seguir usando en otros lados)
		setEmpresas,
		setEmpresaSeleccionada,

		// acciones async usadas por la vista
		fetchEmpresas,
		fetchEmpresaById,
		crearEmpresa,
		actualizarEmpresa,
		eliminarEmpresaAction,

		// helpers
		clearMessages,
	};
});
