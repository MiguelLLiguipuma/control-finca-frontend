import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

interface SidebarState {
	isOpen: boolean;
	isMini: boolean;
	isHoverExpanded: boolean;
	width: number;
}

export const useSidebarStore = defineStore('sidebar', () => {
	const isSidebarOpen = ref(true);
	const isMiniSidebar = ref(false);
	const isMobileView = ref(false);
	const isHoverExpanded = ref(false);

	const sidebarState = computed<SidebarState>(() => {
		if (isMobileView.value) {
			return {
				isOpen: isSidebarOpen.value,
				isMini: false,
				isHoverExpanded: false,
				width: isSidebarOpen.value ? 260 : 0,
			};
		}

		const expanded = !isMiniSidebar.value || isHoverExpanded.value;

		return {
			isOpen: true,
			isMini: isMiniSidebar.value,
			isHoverExpanded: isHoverExpanded.value,
			width: expanded ? 260 : 80,
		};
	});

	const currentSidebarWidth = computed(() => sidebarState.value.width);

	// 🛠️ ACTIONS - LÓGICA DE NEGOCIO
	function toggleSidebar() {
		if (isMobileView.value) {
			isSidebarOpen.value = !isSidebarOpen.value;
		} else {
			isMiniSidebar.value = !isMiniSidebar.value;
			isHoverExpanded.value = false;
		}
	}

	function setMiniSidebar(value: boolean) {
		if (!isMobileView.value) {
			isMiniSidebar.value = value;
			if (!value) {
				isHoverExpanded.value = false;
			}
		}
	}

	function setHoverExpanded(value: boolean) {
		if (!isMobileView.value && isMiniSidebar.value) {
			isHoverExpanded.value = value;
		}
	}

	function setMobileView(isMobile: boolean) {
		isMobileView.value = isMobile;

		if (isMobile) {
			isSidebarOpen.value = false;
			isMiniSidebar.value = false;
			isHoverExpanded.value = false;
		} else {
			isSidebarOpen.value = true;
			isMiniSidebar.value = true;
			isHoverExpanded.value = false;
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
	}

	function toggleMobileSidebar() {
		if (isMobileView.value) {
			isSidebarOpen.value = !isSidebarOpen.value;
		}
	}

	function resetToDefault() {
		isSidebarOpen.value = true;
		isMiniSidebar.value = true;
		isMobileView.value = false;
		isHoverExpanded.value = false;
	}

	return {
		// 🎯 STATE
		isSidebarOpen,
		isMiniSidebar,
		isMobileView,
		isHoverExpanded,

		// 🔍 COMPUTED
		sidebarState,
		currentSidebarWidth,

		// 🛠️ ACTIONS
		toggleSidebar,
		setMiniSidebar,
		setHoverExpanded,
		setMobileView,
		openSidebar,
		closeSidebar,
		toggleMobileSidebar,
		resetToDefault,
	};
});
