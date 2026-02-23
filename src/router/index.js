import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth/authStore';

/* 1. CARGA INMEDIATA (EAGER)
  Importamos aquí solo lo vital para que el usuario vea algo rápido.
*/
import LoginView from '@/views/Login.vue';
import DashboardReportes from '../views/reportes/dashboardReportes.vue';

/* NOTA: Ya NO importamos aquí arriba Fincas, Cosecha, etc.
  Eso ahorra memoria y datos al inicio.
*/

const routes = [
	// --- RUTAS VITALES (Se cargan al inicio) ---
	{
		path: '/login',
		name: 'Login',
		component: LoginView, // Carga inmediata
		meta: { public: true },
	},
	{
		path: '/reportes',
		name: 'Reportes',
		component: DashboardReportes, // Carga inmediata (porque es el Home)
		meta: { requiresAuth: true, permission: 'view.dashboard' },
	},
	{
		path: '/',
		redirect: '/reportes',
	},

	// --- RUTAS SECUNDARIAS (LAZY LOADING) ---
	// El navegador descargará estos archivos SOLO al hacer clic en el menú.

	{
		path: '/empresas',
		name: 'Empresas',
		component: () => import('@/views/administracion/EmpresasView.vue'),
		meta: { requiresAuth: true, permission: 'view.empresas' },
	},
	{
		path: '/fincas',
		name: 'Fincas',
		component: () => import('../views/administracion/FincaView.vue'),
		meta: { requiresAuth: true, permission: 'view.fincas' },
	},
	{
		path: '/registro-enfunde',
		name: 'Enfunde',
		component: () => import('@/views/administracion/RegistroEnfunde.vue'),
		meta: { requiresAuth: true, permission: 'view.enfunde' },
	},
	{
		path: '/registro-cosecha',
		name: 'Cosecha',
		component: () => import('@/views/cosecha/RegistroCosechaView.vue'),
		meta: { requiresAuth: true, permission: 'view.cosecha' },
	},
	{
		path: '/voucher-embarque',
		name: 'VoucherEmbarque',
		component: () => import('@/views/embarque/VoucherEmbarqueView.vue'),
		meta: { requiresAuth: true, permission: 'view.voucher' },
	},
	{
		path: '/planificacion/calendario',
		name: 'GestionCalendario',
		component: () => import('@/views/administracion/GestionCalendarios.vue'),
		meta: { requiresAuth: true, permission: 'view.calendario' },
	},
	{
		path: '/alertas',
		name: 'CentroAlertas',
		component: () => import('@/views/reportes/CentroAlertasView.vue'),
		meta: { requiresAuth: true, permission: 'view.alertas' },
	},
	{
		path: '/auditoria',
		name: 'Auditoria',
		component: () => import('@/views/reportes/AuditoriaView.vue'),
		meta: { requiresAuth: true, permission: 'view.auditoria' },
	},

	// --- 404 ---
	{
		path: '/:pathMatch(.*)*',
		redirect: '/reportes',
	},
];

const router = createRouter({
	history: createWebHistory(),
	routes,
});

router.beforeEach((to, from, next) => {
	const authStore = useAuthStore();

	if (to.matched.length === 0) return next('/reportes');

	const isPublic = to.matched.some((record) => record.meta.public);
	const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
	const requiredPermission = to.matched
		.map((record) => record.meta.permission)
		.find(Boolean);

	if (requiresAuth && !authStore.isAuthenticated) {
		return next('/login');
	} else if (requiredPermission && !authStore.can(requiredPermission)) {
		return next('/reportes');
	} else if (isPublic && authStore.isAuthenticated) {
		return next('/reportes');
	} else {
		next();
	}
});

export default router;
