<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAlertaStore } from '@/stores/alertaStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { useUIStore, type AppNotification, type SnackbarColor } from '@/stores/uiStore';
import type { AlertaOperativa, AlertaSeveridad } from '@/services/alertaService';

const uiStore = useUIStore();
const alertaStore = useAlertaStore();
const authStore = useAuthStore();

const recentNotifications = computed(() => uiStore.notifications.slice(0, 12));
const operationalAlerts = computed(() => alertaStore.recentItems);
const totalUnread = computed(
	() => alertaStore.unreadCount + uiStore.unreadNotificationCount,
);
const unreadCountLabel = computed(() =>
	totalUnread.value > 9 ? '9+' : String(totalUnread.value),
);
const canGenerateAlerts = computed(() =>
	['ADMIN', 'SUPERVISOR'].includes(authStore.normalizedRole),
);

function notificationIcon(color: SnackbarColor): string {
	if (color === 'success') return 'mdi-check-circle-outline';
	if (color === 'warning') return 'mdi-alert-circle-outline';
	if (color === 'error') return 'mdi-alert-octagon-outline';
	return 'mdi-information-outline';
}

function alertIcon(severity: AlertaSeveridad): string {
	if (severity === 'critica') return 'mdi-alert-octagon';
	if (severity === 'alta') return 'mdi-alert-circle';
	if (severity === 'media') return 'mdi-alert';
	return 'mdi-information-outline';
}

function alertColor(severity: AlertaSeveridad): SnackbarColor {
	if (severity === 'critica' || severity === 'alta') return 'error';
	if (severity === 'media') return 'warning';
	return 'info';
}

function notificationTime(item: AppNotification): string {
	const date = new Date(item.createdAt);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString('es-EC', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function alertTime(item: AlertaOperativa): string {
	const date = new Date(item.detectada_en);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleString('es-EC', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function markRead(item: AppNotification) {
	if (!item.read) uiStore.markNotificationRead(item.id);
}

function markAlertRead(item: AlertaOperativa) {
	if (item.estado !== 'leida' && item.estado !== 'resuelta') {
		alertaStore.marcarLeida(item.id);
	}
}

function refreshAlerts() {
	if (authStore.isAuthenticated) alertaStore.cargar();
}

async function generateAlerts() {
	await alertaStore.generar();
}

onMounted(() => {
	if (authStore.isAuthenticated) {
		alertaStore.cargar({ silent: true });
	}
});
</script>

<template>
	<v-menu location="bottom end" :close-on-content-click="false">
		<template #activator="{ props }">
			<v-btn
				v-bind="props"
				icon
				variant="text"
				aria-label="Abrir notificaciones"
				title="Abrir notificaciones"
			>
				<v-badge
					v-if="totalUnread"
					:content="unreadCountLabel"
					color="error"
					floating
				>
					<v-icon>mdi-bell-outline</v-icon>
				</v-badge>
				<v-icon v-else>mdi-bell-outline</v-icon>
			</v-btn>
		</template>

		<v-card class="notification-panel" elevation="10">
			<v-card-title class="d-flex align-center justify-space-between pa-4">
					<div>
						<div class="text-subtitle-1 font-weight-black">Notificaciones</div>
						<div class="text-caption text-medium-emphasis">
							{{ totalUnread }} pendiente(s)
						</div>
					</div>
					<div class="d-flex align-center gap-1">
					<v-btn
						icon="mdi-refresh"
						size="small"
						variant="text"
						:loading="alertaStore.loading"
						aria-label="Actualizar alertas"
						title="Actualizar alertas"
						@click="refreshAlerts"
					/>
					<v-btn
						v-if="canGenerateAlerts"
						icon="mdi-radar"
						size="small"
						variant="text"
						color="primary"
						:loading="alertaStore.loading"
						aria-label="Generar diagnóstico de alertas"
						title="Generar diagnóstico de alertas"
						@click="generateAlerts"
					/>
					<v-btn
						icon="mdi-check-all"
						size="small"
						variant="text"
						:disabled="!uiStore.notifications.length"
						aria-label="Marcar avisos locales como leídos"
						title="Marcar avisos locales como leídos"
						@click="uiStore.markAllNotificationsRead()"
					/>
					<v-btn
						icon="mdi-trash-can-outline"
						size="small"
						variant="text"
						color="error"
						:disabled="!uiStore.notifications.length"
						aria-label="Limpiar notificaciones"
						title="Limpiar notificaciones"
						@click="uiStore.clearNotifications()"
					/>
				</div>
			</v-card-title>

			<v-divider />

			<v-card-text class="notification-list pa-0">
				<div
					v-if="alertaStore.error"
					class="pa-4"
				>
					<v-alert type="warning" variant="tonal" density="compact">
						{{ alertaStore.error }}
					</v-alert>
				</div>

				<div
					v-if="!operationalAlerts.length && !recentNotifications.length && !alertaStore.loading"
					class="pa-6 text-center text-medium-emphasis"
				>
					<v-icon size="34" class="mb-2">mdi-bell-check-outline</v-icon>
					<div class="font-weight-bold">Sin notificaciones recientes</div>
					<div class="text-caption">Las alertas de las vistas aparecerán aquí.</div>
				</div>

				<div v-if="operationalAlerts.length">
					<div class="notification-section-title">Alertas operativas</div>
					<v-list density="compact" class="py-0">
						<v-list-item
							v-for="item in operationalAlerts"
							:key="`alert-${item.id}`"
							class="notification-item"
							:class="{ 'notification-item-unread': item.estado !== 'leida' }"
							@click="markAlertRead(item)"
						>
							<template #prepend>
								<v-avatar :color="alertColor(item.severidad)" variant="tonal" size="34">
									<v-icon size="19">{{ alertIcon(item.severidad) }}</v-icon>
								</v-avatar>
							</template>

							<v-list-item-title class="font-weight-black text-body-2">
								{{ item.titulo }}
							</v-list-item-title>
							<v-list-item-subtitle class="notification-message">
								{{ item.mensaje }}
							</v-list-item-subtitle>
							<v-list-item-subtitle class="text-caption text-disabled">
								<span v-if="item.finca_nombre">{{ item.finca_nombre }} · </span>{{ alertTime(item) }}
							</v-list-item-subtitle>

							<template #append>
								<v-btn
									v-if="canGenerateAlerts"
									icon="mdi-check-circle-outline"
									size="x-small"
									variant="text"
									color="success"
									aria-label="Resolver alerta"
									title="Resolver alerta"
									@click.stop="alertaStore.resolver(item.id)"
								/>
							</template>
						</v-list-item>
					</v-list>
				</div>

				<div v-if="recentNotifications.length">
					<div class="notification-section-title">Avisos de la sesión</div>
					<v-list density="compact" class="py-0">
					<v-list-item
						v-for="item in recentNotifications"
						:key="item.id"
						class="notification-item"
						:class="{ 'notification-item-unread': !item.read }"
						@click="markRead(item)"
					>
						<template #prepend>
							<v-avatar :color="item.color" variant="tonal" size="34">
								<v-icon size="19">{{ notificationIcon(item.color) }}</v-icon>
							</v-avatar>
						</template>

						<v-list-item-title class="font-weight-black text-body-2">
							{{ item.title }}
						</v-list-item-title>
						<v-list-item-subtitle class="notification-message">
							{{ item.message }}
						</v-list-item-subtitle>
						<v-list-item-subtitle class="text-caption text-disabled">
							<span v-if="item.source">{{ item.source }} · </span>{{ notificationTime(item) }}
						</v-list-item-subtitle>

						<template #append>
							<v-btn
								icon="mdi-close"
								size="x-small"
								variant="text"
								aria-label="Eliminar notificación"
								@click.stop="uiStore.removeNotification(item.id)"
							/>
						</template>
					</v-list-item>
				</v-list>
				</div>
			</v-card-text>
		</v-card>
	</v-menu>
</template>

<style scoped>
.notification-panel {
	width: min(380px, calc(100vw - 24px));
	border-radius: 8px;
}

.notification-list {
	max-height: 460px;
	overflow-y: auto;
}

.notification-item {
	border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
	cursor: pointer;
}

.notification-section-title {
	padding: 10px 16px 6px;
	color: rgba(var(--v-theme-on-surface), 0.62);
	font-size: 0.72rem;
	font-weight: 900;
	letter-spacing: 0.04em;
	text-transform: uppercase;
}

.notification-item-unread {
	background: rgba(var(--v-theme-primary), 0.06);
}

.notification-message {
	display: -webkit-box;
	overflow: hidden;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	white-space: normal;
}

.gap-1 {
	gap: 4px;
}
</style>
