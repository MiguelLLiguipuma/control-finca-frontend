import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSidebarStore = defineStore('sidebar', () => {
	// 🎯 ESTADO PRINCIPAL
	const isSidebarOpen = ref(true);
	const isMiniSidebar = ref(false); // ✅ Inicia expandido en desktop
	const isMobileView = ref(false);

	// 🔍 COMPUTED PROPERTIES - ESTADOS DERIVADOS
	const sidebarState = computed(() => {
		if (isMobileView.value) {
			return {
				isOpen: isSidebarOpen.value,
				isMini: false, // ✅ En mobile nunca es mini
				width: isSidebarOpen.value ? 260 : 0,
			};
		}

		return {
			isOpen: true, // ✅ En desktop siempre está "abierto" conceptualmente
			isMini: isMiniSidebar.value,
			width: isMiniSidebar.value ? 80 : 260,
		};
	});

	const currentSidebarWidth = computed(() => sidebarState.value.width);

	// 🛠️ ACTIONS - LÓGICA DE NEGOCIO
	function toggleSidebar() {
		if (isMobileView.value) {
			// ✅ En mobile: toggle completo
			isSidebarOpen.value = !isSidebarOpen.value;
		} else {
			// ✅ En desktop: toggle entre mini/expandido
			isMiniSidebar.value = !isMiniSidebar.value;
		}
	}

	function setMiniSidebar(value) {
		if (!isMobileView.value) {
			isMiniSidebar.value = value;
		}
		// ✅ En mobile ignora este comando
	}

	function setMobileView(isMobile) {
		isMobileView.value = isMobile;

		if (isMobile) {
			// ✅ En mobile: cierra sidebar y desactiva mini mode
			isSidebarOpen.value = false;
			isMiniSidebar.value = false;
		} else {
			// ✅ En desktop: abre sidebar y activa mini mode por defecto
			isSidebarOpen.value = true;
			isMiniSidebar.value = true; // ✅ Desktop inicia colapsado
		}
	}

	function openSidebar() {
		isSidebarOpen.value = true;
		if (isMobileView.value) {
			isMiniSidebar.value = false;
		}
	}

	function closeSidebar() {
		if (isMobileView.value) {
			isSidebarOpen.value = false;
		}
		// ✅ En desktop no se cierra, solo se minimiza
	}

	function toggleMobileSidebar() {
		if (isMobileView.value) {
			isSidebarOpen.value = !isSidebarOpen.value;
		}
	}

	// 🔄 RESET TO DEFAULT
	function resetToDefault() {
		isSidebarOpen.value = true;
		isMiniSidebar.value = true; // ✅ Default: mini en desktop
		isMobileView.value = false;
	}

	return {
		// 🎯 STATE
		isSidebarOpen,
		isMiniSidebar,
		isMobileView,

		// 🔍 COMPUTED
		sidebarState,
		currentSidebarWidth,

		// 🛠️ ACTIONS
		toggleSidebar,
		setMiniSidebar,
		setMobileView,
		openSidebar,
		closeSidebar,
		toggleMobileSidebar,
		resetToDefault,
	};
});
