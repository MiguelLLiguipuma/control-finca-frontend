<template>
  <v-container class="pa-4 pt-6 pb-16 bg-background min-h-screen transition-colors">
    <v-row justify="center">
      <v-col cols="12" lg="10">
        <div class="mb-8 d-flex align-center justify-space-between">
          <div>
            <h1 class="text-h4 font-weight-black text-high-emphasis tracking-tight">Registro de Enfunde</h1>
            <p class="text-medium-emphasis font-weight-medium">Gestión de producción y control de cintas</p>
          </div>
          <v-chip color="success" variant="tonal" class="font-weight-bold" prepend-icon="mdi-shield-check">
            Modo Seguro
          </v-chip>
        </div>

        <v-row class="mb-8">
          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-4 rounded-xl bg-surface">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" rounded="lg" size="48">
                  <v-icon>mdi-calendar-range</v-icon>
                </v-avatar>
                <div class="ml-4">
                  <span class="text-caption font-weight-bold text-disabled uppercase tracking-widest">Semana Actual</span>
                  <div class="text-h6 font-weight-black text-high-emphasis">Semana {{ semanaActual || '--' }}</div>
                </div>
              </div>
            </v-card>
          </v-col>
          
          <v-col cols="12" sm="6" md="4">
            <v-card border variant="flat" class="pa-4 rounded-xl bg-surface">
              <div class="d-flex align-center">
                <v-avatar :style="{ backgroundColor: colorAsignadoHex + '25' }" rounded="lg" size="48">
                  <v-icon :style="{ color: colorAsignadoHex }">mdi-tag-flash</v-icon>
                </v-avatar>
                <div class="ml-4">
                  <span class="text-caption font-weight-bold text-disabled uppercase tracking-widest">Color de Cinta</span>
                  <div class="text-h6 font-weight-black" :style="{ color: colorAsignadoHex }">
                    {{ registroStore.formData.color || 'Sin Asignar' }}
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <v-card border variant="flat" class="rounded-xl bg-surface shadow-sm mb-12">
          <v-form ref="formRef" v-model="registroStore.isValid" @submit.prevent="onSubmit">
            <v-row no-gutters>
              <v-col cols="12" class="pa-8 pa-md-12">
                
                <div class="d-flex align-center mb-8">
                  <div class="section-badge mr-4">1</div>
                  <h3 class="text-h5 font-weight-black text-high-emphasis">Asignación de Personal</h3>
                </div>

                <v-row class="mb-10">
                  <v-col cols="12" md="6">
                    <label class="custom-label">Finca Destino</label>
                    <v-select
                      v-model="registroStore.formData.finca_id"
                      :items="fincasFiltradas"
                      item-title="nombre_completo"
                      item-value="id"
                      placeholder="Seleccionar finca"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-domain"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <label class="custom-label">Operario Responsable</label>
                    <v-select
                      v-model="registroStore.formData.usuario_id"
                      :items="usuariosActivos"
                      item-title="nombre"
                      item-value="id"
                      placeholder="Buscar operario"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-account-circle-outline"
                    />
                  </v-col>
                </v-row>

                <div class="d-flex align-center mb-8">
                  <div class="section-badge mr-4">2</div>
                  <h3 class="text-h5 font-weight-black text-high-emphasis">Detalles de Producción</h3>
                </div>

                <v-row>
                  <v-col cols="12" md="6">
                    <label class="custom-label">Semana de Calendario</label>
                    <v-autocomplete
                      v-model="registroStore.formData.calendario_id"
                      :items="calendariosAnioActual"
                      item-title="descripcion_semana"
                      item-value="id"
                      placeholder="Seleccionar semana y cinta"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-calendar-search"
                      @update:model-value="onSemanaChange"
                      :no-data-text="`No hay calendarios para el año ${reportesStore.anioSeleccionado}`"
                    />
                  </v-col>

                  <v-col cols="12" md="6">
                    <label class="custom-label">Cantidad de Fundas</label>
                    <v-text-field
                      v-model.number="registroStore.formData.cantidad_fundas"
                      type="number"
                      placeholder="Ingresar total"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required, rules.minCantidad]"
                      prepend-inner-icon="mdi-numeric-box-outline"
                    />
                  </v-col>

                  <v-col cols="12">
                    <label class="custom-label">Observaciones de Campo</label>
                    <v-textarea
                      v-model="registroStore.formData.observaciones"
                      placeholder="Notas opcionales..."
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      rows="3"
                      prepend-inner-icon="mdi-comment-text-outline"
                    />
                  </v-col>
                </v-row>

                <v-divider class="my-10 border-dashed" />

                <v-expand-transition>
                  <v-alert
                    v-if="!esAnioValido"
                    type="warning"
                    variant="tonal"
                    rounded="xl"
                    class="mb-6"
                    density="comfortable"
                  >
                    <div class="d-flex flex-column flex-sm-row align-center justify-space-between gap-3">
                      <div class="text-caption font-weight-bold">
                        <v-icon start size="small">mdi-calendar-alert</v-icon>
                        Registro del <b>{{ anioFormulario }}</b>, pero el Panel visualiza el <b>{{ reportesStore.anioSeleccionado }}</b>.
                      </div>
                      <v-btn
                        size="x-small"
                        color="warning"
                        variant="flat"
                        class="font-weight-black rounded-lg"
                        @click="sincronizarYRefrescar"
                      >
                        Sincronizar Panel
                      </v-btn>
                    </div>
                  </v-alert>
                </v-expand-transition>

                <div class="d-flex flex-column flex-sm-row align-center justify-space-between gap-4">
                  <div class="d-flex align-center text-disabled">
                    <v-icon size="small" class="mr-2">mdi-clock-check-outline</v-icon>
                    <span class="text-caption font-weight-bold">Registro: {{ registroStore.formData.hora_registro }}</span>
                  </div>
                  <v-btn
                    size="x-large"
                    color="primary"
                    class="rounded-xl px-12 font-weight-black shadow-primary"
                    :loading="registroStore.loadingGuardar"
                    :disabled="!esAnioValido"
                    @click="onSubmit"
                    elevation="0"
                  >
                    GUARDAR REGISTRO
                    <v-icon end>mdi-arrow-right</v-icon>
                  </v-btn>
                </div>
              </v-col>
            </v-row>
          </v-form>
        </v-card>

        <div class="mt-12">
          <div class="d-flex align-center mb-6">
            <v-avatar color="primary" size="32" variant="tonal" class="mr-3">
              <v-icon size="18">mdi-history</v-icon>
            </v-avatar>
            <h2 class="text-h5 font-weight-black text-high-emphasis">Registros Recientes ({{ reportesStore.anioSeleccionado }})</h2>
            <v-spacer />
            <v-btn variant="tonal" color="medium-emphasis" icon="mdi-refresh" size="small" @click="registroStore.tablaKey++"></v-btn>
          </div>
          <TablaEnfunde :key="registroStore.tablaKey" />
        </div>

      </v-col>
    </v-row>

    <v-snackbar v-model="registroStore.snackbar.show" :color="registroStore.snackbar.color" rounded="lg" elevation="12">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ registroStore.snackbar.icon }}</v-icon>
        <span class="font-weight-bold">{{ registroStore.snackbar.message }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useRegistroEnfundeStore } from '@/stores/registroEnfundeStore'
import { useFincaStore } from '@/stores/fincaStore'
import { useUsuarioStore } from '@/stores/usuarioStore'
import { useCalendarioStore } from '@/stores/calendarioStore'
import { useReportesStore } from '@/stores/reportesStore'
import TablaEnfunde from '@/components/registros/tablaEnfunde.vue'

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const registroStore = useRegistroEnfundeStore()
const reportesStore = useReportesStore()
const fincaStore = useFincaStore()
const usuarioStore = useUsuarioStore()
const calendarioStore = useCalendarioStore()

const formRef = ref(null)
const rawData = ref({ fincas: [], usuarios: [], calendarios: [] })

const rules = {
  required: v => !!v || 'Requerido',
  minCantidad: v => (v && v > 0) || 'Mínimo 1'
}

// LÓGICA DE AÑO Y VALIDACIÓN
const anioFormulario = computed(() => {
  if (!registroStore.formData.fecha) return null;
  return new Date(registroStore.formData.fecha + 'T00:00:00').getFullYear();
});

const esAnioValido = computed(() => {
  if (!anioFormulario.value) return true;
  return Number(anioFormulario.value) === Number(reportesStore.anioSeleccionado);
});

const sincronizarYRefrescar = async () => {
  await reportesStore.actualizarPeriodo(anioFormulario.value);
  registroStore.tablaKey++;
  registroStore.mostrarMensaje(`Panel sincronizado al año ${anioFormulario.value}`, 'success');
};

// FILTRADO DE DATOS (CORREGIDO PARA VARIABLE 'anio')
const fincasFiltradas = computed(() => rawData.value.fincas.map(f => ({ ...f, nombre_completo: `${f.nombre} - ${f.empresa}` })))
const usuariosActivos = computed(() => rawData.value.usuarios.filter(u => u.activo !== false))

const calendariosAnioActual = computed(() => {
  const anioAFiltrar = reportesStore.anioSeleccionado || new Date().getFullYear();
  
  return rawData.value.calendarios
    .filter(c => Number(c.anio) === Number(anioAFiltrar)) // Filtrado corregido por anio
    .sort((a, b) => a.semana - b.semana)
    .map(c => ({ 
      ...c, 
      descripcion_semana: `Semana ${c.semana} — Cinta ${c.color}` 
    }))
})

const colorAsignadoHex = computed(() => getColorHex(registroStore.formData.color))
const semanaActual = computed(() => {
  const sel = rawData.value.calendarios.find(c => c.id === registroStore.formData.calendario_id)
  return sel ? sel.semana : null
})

// FUNCIONES DE SOPORTE
function onSemanaChange(id) {
  const sel = rawData.value.calendarios.find(c => c.id === id)
  if (sel) registroStore.formData.color = sel.color
}

function getColorHex(c) {
  const map = { Blanca: '#94a3b8', Negra: isDark.value ? '#64748b' : '#1e293b', Lila: '#a855f7', Roja: '#ef4444', Cafe: '#78350f', Amarilla: '#eab308', Verde: '#22c55e', Azul: '#3b82f6' }
  return map[c] || '#94a3b8'
}

// WATCH PARA SINCRONIZACIÓN REACTIVA
watch(() => reportesStore.anioSeleccionado, async (nuevoAnio) => {
  if (nuevoAnio) {
    // Al cambiar el año en el panel, refrescamos calendarios para asegurar consistencia
    const c = await calendarioStore.obtenerCalendarios()
    rawData.value.calendarios = c
  }
})

onMounted(async () => {
  registroStore.globalLoading = true
  registroStore.initForm()
  try {
    const [f, u, c] = await Promise.all([
      fincaStore.obtenerFincas(), 
      usuarioStore.obtenerUsuarios(), 
      calendarioStore.obtenerCalendarios()
    ])
    rawData.value = { fincas: f, usuarios: u, calendarios: c }
  } catch (error) {
    console.error("Error cargando datos de inicio:", error)
  } finally { 
    registroStore.globalLoading = false 
  }
  
})

const onSubmit = async () => {
  if (!esAnioValido.value) return; 
  const val = await formRef.value.validate()
  if (val.valid) await registroStore.guardarRegistro()
}
</script>

<style scoped>
.transition-colors {
  transition: background-color 0.3s ease, color 0.3s ease;
}

.section-badge { 
  background: rgb(var(--v-theme-primary)); 
  color: white; 
  width: 28px; height: 28px; 
  display: flex; align-items: center; justify-content: center; 
  border-radius: 8px; font-weight: 800; font-size: 0.85rem; 
  box-shadow: 0 4px 10px rgba(var(--v-theme-primary), 0.3); 
}

.custom-label { 
  display: block; font-size: 0.75rem; font-weight: 800; 
  margin-bottom: 6px; 
  color: rgba(var(--v-theme-on-surface), 0.6); 
  text-transform: uppercase; letter-spacing: 0.5px; 
}

/* INPUTS ADAPTABLES */
.custom-input :deep(.v-field) { 
  border-radius: 12px !important; 
  background-color: rgba(var(--v-theme-on-surface), 0.05) !important; 
  border: 1px solid rgba(var(--v-border-color), 0.15) !important; 
  transition: all 0.25s ease; 
}

.custom-input :deep(.v-field--focused) { 
  border-color: rgb(var(--v-theme-primary)) !important; 
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.1) !important; 
}

.custom-input :deep(.v-field__input) {
  color: rgb(var(--v-theme-on-surface)) !important;
}

.shadow-primary { 
  box-shadow: 0 10px 20px -5px rgba(var(--v-theme-primary), 0.4) !important; 
  transition: transform 0.2s ease; 
}
.shadow-primary:hover { transform: translateY(-2px); }

.border {
  border: 1px solid rgba(var(--v-border-color), 0.1) !important;
}

.border-dashed { border-style: dashed !important; opacity: 0.3; }

.gap-3 { gap: 12px; }
.gap-4 { gap: 16px; }
</style>