export type AppRole = 'ADMIN' | 'SUPERVISOR' | 'OPERADOR' | 'INVITADO';

export type AppPermission =
	| 'view.dashboard'
	| 'view.calendario'
	| 'view.enfunde'
	| 'view.cosecha'
	| 'view.voucher'
	| 'view.empresas'
	| 'view.fincas'
	| 'view.usuarios'
	| 'view.alertas'
	| 'view.auditoria'
	| 'action.voucher.confirm'
	| 'action.voucher.cancel'
	| 'action.admin.manage';

const ROLE_MAP: Record<string, AppRole> = {
	ADMIN: 'ADMIN',
	ADMINISTRADOR: 'ADMIN',
	GERENTE: 'ADMIN',
	SUPERVISOR: 'SUPERVISOR',
	TRABAJADOR: 'OPERADOR',
	OPERARIO: 'OPERADOR',
	OPERADOR: 'OPERADOR',
};

const PERMISSIONS_BY_ROLE: Record<AppRole, AppPermission[]> = {
	ADMIN: [
		'view.dashboard',
		'view.calendario',
		'view.enfunde',
		'view.cosecha',
		'view.voucher',
		'view.empresas',
		'view.fincas',
		'view.usuarios',
		'view.alertas',
		'view.auditoria',
		'action.voucher.confirm',
		'action.voucher.cancel',
		'action.admin.manage',
	],
	SUPERVISOR: [
		'view.dashboard',
		'view.calendario',
		'view.enfunde',
		'view.cosecha',
		'view.voucher',
		'view.alertas',
		'view.auditoria',
		'action.voucher.confirm',
		'action.voucher.cancel',
	],
	OPERADOR: [
		'view.dashboard',
		'view.calendario',
		'view.enfunde',
		'view.cosecha',
		'view.voucher',
		'view.alertas',
	],
	INVITADO: ['view.dashboard'],
};

export function normalizeRole(role?: string | null): AppRole {
	const key = String(role || '').trim().toUpperCase();
	return ROLE_MAP[key] || 'INVITADO';
}

export function permissionsForRole(role?: string | null): AppPermission[] {
	return PERMISSIONS_BY_ROLE[normalizeRole(role)];
}

export function canAccess(permission: AppPermission, role?: string | null): boolean {
	return permissionsForRole(role).includes(permission);
}
