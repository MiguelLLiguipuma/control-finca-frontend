import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth/authStore';
import { isAppPermission } from '@/utils/rbac';

const routes: RouteRecordRaw[] = [
	{
		path: '/login',
		name: 'Login',
		component: () => import('@/views/Login.vue'),
		meta: { public: true, breadcrumb: 'Login' },
	},
	{
		path: '/reportes',
		name: 'Reportes',
		component: () => import('@/views/reportes/dashboardReportes.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.dashboard',
			breadcrumb: 'Dashboard',
		},
	},
	{
		path: '/balanza',
		name: 'Balanza',
		component: () => import('@/views/reportes/BalanzaView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.balanza',
			breadcrumb: 'Balanza',
		},
	},
	{
		path: '/',
		redirect: '/login',
	},
	{
		path: '/empresas',
		name: 'Empresas',
		component: () => import('@/views/administracion/EmpresasView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.empresas',
			breadcrumb: 'Empresas',
		},
	},
	{
		path: '/fincas',
		name: 'Fincas',
		component: () => import('@/views/administracion/FincaView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.fincas',
			breadcrumb: 'Fincas',
		},
	},
	{
		path: '/usuarios',
		name: 'Usuarios',
		component: () => import('@/views/administracion/UsuariosView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.usuarios',
			breadcrumb: 'Usuarios',
		},
	},
	{
		path: '/registro-enfunde',
		name: 'Enfunde',
		component: () => import('@/views/administracion/RegistroEnfunde.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.enfunde',
			breadcrumb: 'Registro Enfunde',
		},
	},
	{
		path: '/registro-cosecha',
		name: 'Cosecha',
		component: () => import('@/views/cosecha/RegistroCosechaView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.cosecha',
			breadcrumb: 'Liquidación Cosecha',
		},
	},
	{
		path: '/prediccion-cosecha',
		name: 'PrediccionCosecha',
		component: () => import('@/views/cosecha/PrediccionCosechaView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.cosecha',
			breadcrumb: 'Predicción Cosecha',
		},
	},
	{
		path: '/voucher-embarque',
		name: 'VoucherEmbarque',
		component: () => import('@/views/embarque/VoucherEmbarqueView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.voucher',
			breadcrumb: 'Voucher Embarque',
		},
	},
	{
		path: '/planificacion/calendario',
		name: 'GestionCalendario',
		component: () => import('@/views/administracion/GestionCalendarios.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.calendario',
			breadcrumb: 'Gestión Calendario',
		},
	},
	{
		path: '/alertas',
		name: 'CentroAlertas',
		component: () => import('@/views/reportes/CentroAlertasView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.alertas',
			breadcrumb: 'Centro de Alertas',
		},
	},
	{
		path: '/auditoria',
		name: 'Auditoria',
		component: () => import('@/views/reportes/AuditoriaView.vue'),
		meta: {
			requiresAuth: true,
			permission: 'view.auditoria',
			breadcrumb: 'Auditoría',
		},
	},
	{
		path: '/ayuda',
		name: 'Ayuda',
		component: () => import('@/views/AyudaView.vue'),
		meta: {
			requiresAuth: true,
			breadcrumb: 'Guía de Uso',
		},
	},
	{
		path: '/:pathMatch(.*)*',
		redirect: '/reportes',
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

router.beforeEach((to) => {
	const authStore = useAuthStore();

	if (!to.matched.length) {
		return '/reportes';
	}

	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
	const requiredPermission = to.matched
		.map((record) => record.meta.permission)
		.find(Boolean);

	if (requiresAuth && !authStore.isAuthenticated) {
		return '/login';
	}

	if (
		isAppPermission(requiredPermission) &&
		!authStore.can(requiredPermission)
	) {
		return '/reportes';
	}
});

export default router;
