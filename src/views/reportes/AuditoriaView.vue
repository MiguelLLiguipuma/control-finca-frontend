<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-card class="rounded-xl mb-4" elevation="2">
      <v-card-text class="d-flex align-center justify-space-between flex-wrap gap-3">
        <div>
          <div class="text-overline text-medium-emphasis">Trazabilidad</div>
          <h1 class="text-h4 font-weight-black">Auditoría de Operaciones</h1>
        </div>
        <v-btn color="primary" :loading="loading" @click="cargarAuditoria">Actualizar</v-btn>
      </v-card-text>
    </v-card>

    <v-row class="mb-3">
      <v-col cols="12" md="3">
        <label class="text-caption font-weight-bold">Desde</label>
        <v-text-field v-model="fechaDesde" type="date" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="12" md="3">
        <label class="text-caption font-weight-bold">Hasta</label>
        <v-text-field v-model="fechaHasta" type="date" variant="outlined" density="comfortable" hide-details />
      </v-col>
      <v-col cols="12" md="3">
        <label class="text-caption font-weight-bold">Acción</label>
        <v-select
          v-model="accion"
          :items="acciones"
          clearable
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="3" class="d-flex align-end">
        <v-btn block color="secondary" variant="tonal" :loading="loading" @click="cargarAuditoria">Filtrar</v-btn>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <v-card class="rounded-xl" elevation="1">
      <v-table density="comfortable">
        <thead>
          <tr>
            <th>Fecha/Hora</th>
            <th>Acción</th>
            <th>Usuario</th>
            <th>Voucher</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.id">
            <td>{{ formatDate(item.created_at) }}</td>
            <td><v-chip size="small" color="primary" variant="tonal">{{ item.accion }}</v-chip></td>
            <td>{{ item.usuario_nombre || 'Sistema' }}</td>
            <td>{{ item.numero_voucher || '-' }}</td>
            <td class="text-truncate" style="max-width: 320px;">{{ stringifyDetalle(item.detalle) }}</td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="5" class="text-center text-medium-emphasis py-8">Sin registros de auditoría con estos filtros.</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { reportesSeguridadService, type AuditoriaItem } from '@/services/reportes/reportesSeguridadService';

const loading = ref(false);
const error = ref('');
const rows = ref<AuditoriaItem[]>([]);

const today = new Date().toISOString().slice(0, 10);
const last7 = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const fechaDesde = ref(last7);
const fechaHasta = ref(today);
const accion = ref<string | null>(null);
const acciones = ['CREAR', 'ACTUALIZAR', 'CONFIRMAR', 'ANULAR'];

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('es-EC');
}

function stringifyDetalle(value: Record<string, unknown> | null): string {
  if (!value) return '-';
  return JSON.stringify(value);
}

async function cargarAuditoria() {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await reportesSeguridadService.getAuditoria({
      fecha_desde: fechaDesde.value || undefined,
      fecha_hasta: fechaHasta.value || undefined,
      accion: accion.value || undefined,
      limit: 300,
    });
  } catch (e) {
    const err = e as { response?: { data?: { error?: string; message?: string } } };
    error.value = err.response?.data?.error || err.response?.data?.message || 'No se pudo cargar auditoría';
    rows.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(cargarAuditoria);
</script>
