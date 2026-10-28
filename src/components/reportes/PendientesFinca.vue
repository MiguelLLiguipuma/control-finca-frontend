<script setup lang="ts">
import { computed } from 'vue'
import { etiquetasSeveridad, type PendienteFinca } from '@/domain/pendientesFinca'

const props = defineProps<{
  pendientes: PendienteFinca[]
  fincaId: number | null
  fincaNombre: string
  loading: boolean
  error: string
  consultadoEn: number | null
  limitado?: boolean
}>()
const emit = defineEmits<{ reintentar: [] }>()
const visibles = computed(() => props.pendientes.slice(0, 3))
function fecha(value: string | number) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
const enlaceAlertas = computed(() => ({ path: '/alertas', query: { finca_id: String(props.fincaId), tab: 'alertas', abiertas: '1' } }))
</script>

<template>
  <section class="farm-tasks" aria-label="Pendientes prioritarios de la finca" :aria-busy="loading">
    <header class="tasks-header">
      <div>
        <h2>Qué necesita atención hoy</h2>
        <p>{{ fincaNombre }} · Pendientes actuales</p>
      </div>
      <v-btn v-if="fincaId" :to="enlaceAlertas" variant="text" color="primary" size="small" append-icon="mdi-arrow-right">Ver todas las alertas</v-btn>
    </header>
    <div v-if="loading" role="status" class="tasks-feedback">Consultando pendientes…</div>
    <div v-else-if="error" role="alert" class="tasks-feedback">
      <p>{{ error }}</p>
      <v-btn variant="text" color="primary" size="small" @click="emit('reintentar')">Reintentar pendientes</v-btn>
    </div>
    <template v-else-if="consultadoEn">
      <ol v-if="visibles.length" class="task-list">
        <li v-for="{ alerta, accion } in visibles" :key="alerta.id" class="task-row">
          <span class="task-severity" :data-level="alerta.severidad">{{ etiquetasSeveridad[alerta.severidad] }}</span>
          <div class="task-body">
            <h3>{{ alerta.titulo || 'Pendiente operativo' }}</h3>
            <p>{{ alerta.mensaje }}</p>
            <span class="task-date">Detectado {{ fecha(alerta.detectada_en) }}</span>
          </div>
          <v-btn v-if="accion" :to="accion.to" variant="tonal" color="primary" size="small" class="task-action"
            :aria-label="accion.texto + ': ' + alerta.titulo">{{ accion.texto }}</v-btn>
        </li>
      </ol>
      <div v-else class="tasks-feedback">
        <p>No hay pendientes abiertos en las alertas consultadas.</p>
        <p class="tasks-note">Esto no sustituye la revisión en campo ni confirma que todos los registros estén completos.</p>
      </div>
      <footer class="tasks-footer">
        <span>Consultado {{ fecha(consultadoEn) }}</span>
        <span v-if="limitado">Consulta limitada a las 200 alertas más prioritarias.</span>
        <span v-else-if="pendientes.length > 3">Mostrando las 3 de mayor prioridad.</span>
      </footer>
    </template>
    <p v-else class="tasks-feedback">Selecciona una finca para consultar sus pendientes.</p>
  </section>
</template>

<style scoped>
.farm-tasks { margin-bottom: 28px; letter-spacing: 0; }
.tasks-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.tasks-header h2 { font-size: 18px; font-weight: 700; }
.tasks-header p { font-size: 12px; color: rgba(var(--v-theme-on-surface), .7); margin-top: 4px; }
.task-list { list-style: none; padding: 0; border-top: 1px solid rgba(var(--v-theme-on-surface), .12); }
.task-row { display: grid; grid-template-columns: 65px minmax(0, 1fr) auto; align-items: start; gap: 14px; padding: 16px 0; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .12); }
.task-severity { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 4px; text-align: center; background: rgba(var(--v-theme-primary), .08); }
.task-severity[data-level="critica"], .task-severity[data-level="alta"] { color: #a82332; background: rgba(var(--v-theme-error), .09); }
.task-severity[data-level="media"] { color: #805300; background: rgba(var(--v-theme-warning), .1); }
:global(.v-theme--dark) .task-severity[data-level="critica"], :global(.v-theme--dark) .task-severity[data-level="alta"] { color: #ffafb7; }
:global(.v-theme--dark) .task-severity[data-level="media"] { color: #f4ce81; }
.task-body { min-width: 0; overflow-wrap: anywhere; }
.task-body h3 { font-size: 14px; font-weight: 650; line-height: 1.4; }
.task-body p { font-size: 13px; margin-top: 3px; line-height: 1.5; }
.task-date, .tasks-footer, .tasks-note { font-size: 11px; color: rgba(var(--v-theme-on-surface), .7); }
.task-date { display: block; margin-top: 5px; }
.tasks-footer { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; margin-top: 10px; }
.tasks-feedback { padding: 18px 0; font-size: 13px; }
.tasks-note { margin-top: 4px; }
.farm-tasks :deep(.v-btn) { text-transform: none; letter-spacing: 0; }
@media (max-width: 599px) {
  .task-row { grid-template-columns: 58px minmax(0, 1fr); gap: 10px; }
  .task-action { grid-column: 2; justify-self: start; max-width: 100%; }
}
</style>
