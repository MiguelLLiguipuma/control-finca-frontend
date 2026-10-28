import type { AppPermission } from '@/utils/rbac';

export interface SidebarItem {
  title: string;
  icon: string;
  route: string;
  permission?: AppPermission;
}

export interface SidebarSection {
  key: string;
  label: string;
  items: SidebarItem[];
}

export const sidebarSections: SidebarSection[] = [
  { key: 'diario', label: 'Trabajo diario', items: [
    { title: 'Registro de enfunde', icon: 'mdi-leaf', route: '/registro-enfunde', permission: 'view.enfunde' },
    { title: 'Conteo móvil', icon: 'mdi-cellphone-check', route: '/conteo-cosecha-movil', permission: 'view.cosecha' },
    { title: 'Liquidación de cosecha', icon: 'mdi-basket-check-outline', route: '/registro-cosecha', permission: 'view.cosecha' },
  ] },
  { key: 'seguimiento', label: 'Seguimiento', items: [
    { title: 'Centro de alertas', icon: 'mdi-bell-alert-outline', route: '/alertas', permission: 'view.alertas' },
    { title: 'Clima por finca', icon: 'mdi-weather-partly-cloudy', route: '/clima', permission: 'view.clima' },
    { title: 'Resumen general', icon: 'mdi-view-dashboard-outline', route: '/reportes', permission: 'view.dashboard' },
    { title: 'Predicción de cosecha', icon: 'mdi-chart-bell-curve-cumulative', route: '/prediccion-cosecha', permission: 'view.cosecha' },
    { title: 'Calendario de enfunde', icon: 'mdi-calendar-range', route: '/planificacion/calendario', permission: 'view.calendario' },
  ] },
  { key: 'despacho', label: 'Despacho', items: [
    { title: 'Balanza', icon: 'mdi-scale', route: '/balanza', permission: 'view.balanza' },
    { title: 'Voucher de embarque', icon: 'mdi-file-document-check-outline', route: '/voucher-embarque', permission: 'view.voucher' },
  ] },
  { key: 'admin', label: 'Administración', items: [
    { title: 'Fincas', icon: 'mdi-map-marker-radius', route: '/fincas', permission: 'view.fincas' },
    { title: 'Empresas', icon: 'mdi-domain', route: '/empresas', permission: 'view.empresas' },
    { title: 'Usuarios', icon: 'mdi-account-cog-outline', route: '/usuarios', permission: 'view.usuarios' },
    { title: 'Auditoría', icon: 'mdi-clipboard-text-search-outline', route: '/auditoria', permission: 'view.auditoria' },
  ] },
];

export const sidebarHelp: SidebarItem = { title: 'Guía de uso', icon: 'mdi-help-circle-outline', route: '/ayuda' };

export function visibleSidebarSections(can: (permission: AppPermission) => boolean): SidebarSection[] {
  return sidebarSections.map(section => ({
    ...section,
    items: section.items.filter(item => !item.permission || can(item.permission)),
  })).filter(section => section.items.length > 0);
}
