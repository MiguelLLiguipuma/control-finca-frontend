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

        <ViewHelpHint
          class="mb-6"
          title="¿Qué registras en Enfunde?"
          summary="En esta pantalla registras cuántas fundas se colocaron, quién lo hizo y en qué semana/cinta. Es la base para proyección y control de cosecha."
          :steps="[
            'Selecciona finca y operario responsable.',
            'Elige semana de calendario (cinta).',
            'Ingresa cantidad de fundas y observaciones.',
            'Guarda el registro y verifica en la tabla de recientes.',
          ]"
          :notes="[
            'El usuario que registra se toma de la sesión activa.',
            'El año del formulario debe coincidir con el año del panel.',
            'Un registro bien hecho mejora la calidad de predicción.',
          ]"
        />

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

        <v-card border variant="flat" class="rounded-xl bg-surface shadow-sm mb-12" aria-labelledby="registro-enfunde-form-heading">
          <v-form ref="formRef" v-model="registroStore.isValid" @submit.prevent="onSubmit">
            <v-row no-gutters>
              <v-col cols="12" class="pa-8 pa-md-12">
                
                <div class="d-flex align-center mb-8">
                  <div class="section-badge mr-4">1</div>
                  <h3 id="registro-enfunde-form-heading" class="text-h5 font-weight-black text-high-emphasis">Asignación de Personal</h3>
                </div>

                <v-row class="mb-10">
                  <v-col cols="12" md="4">
                    <label class="custom-label" for="enfunde-finca">Finca Destino</label>
                    <v-select
                      id="enfunde-finca"
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
                      @update:model-value="onFincaChange"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <label class="custom-label" for="enfunde-operario">Operario Responsable</label>
                    <v-select
                      id="enfunde-operario"
                      v-model="registroStore.formData.operario_id"
                      :items="usuariosActivos"
                      item-title="nombre"
                      item-value="id"
                      placeholder="Seleccionar operario"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-account-circle-outline"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <label class="custom-label" for="enfunde-usuario">Usuario que Registra</label>
                    <v-select
                      id="enfunde-usuario"
                      v-model="registroStore.formData.usuario_id"
                      :items="usuarioActualItem"
                      item-title="nombre"
                      item-value="id"
                      placeholder="Usuario autenticado"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.usuarioAutenticado]"
                      prepend-inner-icon="mdi-shield-account-outline"
                      :disabled="true"
                    />
                  </v-col>
                </v-row>

                <div class="d-flex align-center mb-8">
                  <div class="section-badge mr-4">2</div>
                  <h3 class="text-h5 font-weight-black text-high-emphasis">Detalles de Producción</h3>
                </div>

                <v-row>
                  <v-col cols="12" md="4">
                    <label class="custom-label" for="enfunde-fecha">Fecha de Registro</label>
                    <v-text-field
                      id="enfunde-fecha"
                      v-model="registroStore.formData.fecha"
                      type="date"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-calendar-today"
                      @update:model-value="onFechaChange"
                    />
                  </v-col>

                  <v-col cols="12" md="4">
                    <label class="custom-label" for="enfunde-calendario">Semana de Calendario</label>
                    <v-autocomplete
                      id="enfunde-calendario"
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
                      :no-data-text="`No hay calendarios para el año ${anioActivo}`"
                    />
                  </v-col>

                  <v-col cols="12" md="4">
                    <label class="custom-label" for="enfunde-cantidad">Cantidad de Fundas</label>
                    <v-text-field
                      id="enfunde-cantidad"
                      v-model.number="registroStore.formData.cantidad_fundas"
                      type="number"
                      placeholder="Ingresar total"
                      variant="solo-filled"
                      flat
                      density="comfortable"
                      rounded="lg"
                      class="custom-input"
                      :rules="[rules.required, rules.minCantidad, rules.integerCantidad, rules.maxCantidad]"
                      prepend-inner-icon="mdi-numeric-box-outline"
                      inputmode="numeric"
                      min="1"
                      :max="MAX_FUNDAS_POR_REGISTRO"
                      step="1"
                    />
                  </v-col>

                  <v-col cols="12">
                    <v-sheet class="pa-3 rounded-lg week-preview" color="surface">
                      <div class="d-flex align-center justify-space-between flex-wrap gap-3">
                        <div class="d-flex align-center">
                          <v-avatar :style="{ backgroundColor: colorAsignadoHex + '22' }" size="36" rounded="lg" class="mr-3">
                            <v-icon :style="{ color: colorAsignadoHex }">mdi-calendar-check</v-icon>
                          </v-avatar>
                          <div>
                            <div class="text-caption text-medium-emphasis">Semana calculada desde la fecha</div>
                            <div class="text-body-2 font-weight-black text-high-emphasis">
                              Semana {{ semanaFormulario.semana }} · Año {{ semanaFormulario.anio }}
                            </div>
                          </div>
                        </div>
                        <v-chip
                          :style="{ backgroundColor: colorAsignadoHex + '22', color: colorAsignadoHex }"
                          class="font-weight-black"
                          variant="flat"
                        >
                          Cinta {{ registroStore.formData.color || 'sin calendario' }}
                        </v-chip>
                      </div>
                    </v-sheet>
                  </v-col>

                  <v-col cols="12">
                    <label class="custom-label" for="enfunde-observaciones">Observaciones de Campo</label>
                    <v-textarea
                      id="enfunde-observaciones"
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
                    v-if="posibleDuplicado"
                    type="warning"
                    variant="tonal"
                    rounded="xl"
                    class="mb-6"
                    density="comfortable"
                    role="status"
                    aria-live="polite"
                  >
                    <div class="font-weight-bold">
                      Ya existe un registro parecido para esta finca, fecha, cinta y operario.
                    </div>
                    <div class="text-caption">
                      Revise el historial antes de guardar si no desea duplicar la captura.
                    </div>
                  </v-alert>
                </v-expand-transition>

                <v-expand-transition>
                  <v-alert
                    v-if="!esAnioValido"
                    type="warning"
                    variant="tonal"
                    rounded="xl"
                    class="mb-6"
                    density="comfortable"
                    role="status"
                    aria-live="polite"
                  >
                    <div class="d-flex flex-column flex-sm-row align-center justify-space-between gap-3">
                      <div class="text-caption font-weight-bold">
                        <v-icon start size="small">mdi-calendar-alert</v-icon>
                        Registro del <b>{{ anioFormulario }}</b>, pero el Panel visualiza el <b>{{ anioActivo }}</b>.
                      </div>
                      <v-btn
                        size="x-small"
                      color="warning"
                      variant="flat"
                      class="font-weight-black rounded-lg"
                      aria-label="Sincronizar panel al año del formulario"
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
                    :aria-busy="registroStore.loadingGuardar"
                    aria-label="Guardar registro de enfunde"
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
            <h2 class="text-h5 font-weight-black text-high-emphasis">Registros Recientes ({{ anioActivo }})</h2>
            <v-spacer />
            <v-btn
              variant="tonal"
              color="medium-emphasis"
              icon="mdi-refresh"
              size="small"
              :loading="enfundeStore.loading"
              aria-label="Actualizar tabla de registros recientes"
              @click="refrescarRegistros"
            ></v-btn>
          </div>
          <TablaEnfunde
            :items="enfundeStore.registrosFiltrados"
            :loading="enfundeStore.loading"
            :anio="anioActivo"
            :error="enfundeStore.error"
          />
        </div>

      </v-col>
    </v-row>

    <v-snackbar v-model="registroStore.snackbar.show" :color="registroStore.snackbar.color" rounded="lg" elevation="12">
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ registroStore.snackbar.icon }}</v-icon>
        <span class="font-weight-bold" role="status" aria-live="polite">{{ registroStore.snackbar.message }}</span>
      </div>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useRegistroEnfundeStore } from '@/stores/registroEnfundeStore'
import { useFincaStore, type Finca } from '@/stores/fincaStore'
import { useUsuarioStore, type Usuario } from '@/stores/usuarioStore'
import { useCalendarioStore } from '@/stores/calendarioStore'
import { useReportesStore } from '@/stores/reportesStore'
import { useEnfundeStore } from '@/stores/enfundeStore'
import { useAuthStore } from '@/stores/auth/authStore'
import TablaEnfunde from '@/components/registros/tablaEnfunde.vue'
import ViewHelpHint from '@/components/ui/ViewHelpHint.vue'
import { getCurrentIsoWeekInfo } from '@/utils/dateIso'

const theme = useTheme()
const isDark = computed(() => theme.global.current.value.dark)

const registroStore = useRegistroEnfundeStore()
const reportesStore = useReportesStore()
const enfundeStore = useEnfundeStore()
const fincaStore = useFincaStore()
const usuarioStore = useUsuarioStore()
const calendarioStore = useCalendarioStore()
const authStore = useAuthStore()

interface FormValidationResult {
  valid: boolean
}

interface ValidatableForm {
  validate: () => Promise<FormValidationResult>
}

interface CalendarioItem {
  id: number
  semana: number
  anio: number
  color?: string | null
}

interface FincaSelectItem extends Finca {
  nombre_completo: string
}

interface UsuarioSelectItem {
  id: number
  nombre: string
  activo?: boolean
}

interface CalendarioSelectItem extends CalendarioItem {
  descripcion_semana: string
}

const formRef = ref<ValidatableForm | null>(null)
const rawData = ref<{
  fincas: Finca[]
  usuarios: Usuario[]
  calendarios: CalendarioItem[]
}>({
  fincas: [],
  usuarios: [],
  calendarios: [],
})

const MAX_FUNDAS_POR_REGISTRO = 50000

const rules = {
  required: (v: unknown) => !!v || 'Requerido',
  minCantidad: (v: unknown) => (Number(v) > 0) || 'Mínimo 1',
  integerCantidad: (v: unknown) => Number.isInteger(Number(v)) || 'Debe ser entero',
  maxCantidad: (v: unknown) => Number(v) <= MAX_FUNDAS_POR_REGISTRO || `Maximo ${MAX_FUNDAS_POR_REGISTRO.toLocaleString()} fundas`,
  usuarioAutenticado: (v: unknown) => Number(v) > 0 || 'Sesion invalida: vuelva a iniciar sesion'
}

const anioActivo = computed(() =>
  Number(reportesStore.anioSeleccionado || new Date().getFullYear())
)

const semanaFormulario = computed(() =>
  getCurrentIsoWeekInfo(registroStore.formData.fecha || new Date())
)

// LÓGICA DE AÑO Y VALIDACIÓN
const anioFormulario = computed(() => semanaFormulario.value.anio);

const esAnioValido = computed(() => {
  if (!anioFormulario.value) return true;
  return Number(anioFormulario.value) === Number(anioActivo.value);
});

const sincronizarYRefrescar = async () => {
  if (!anioFormulario.value) return;
  const fincaId = Number(registroStore.formData.finca_id || fincaStore.fincaSeleccionadaId || 0);
  await reportesStore.actualizarPeriodo(anioFormulario.value, fincaId || null);
  await refrescarRegistros();
  registroStore.mostrarMensaje(`Panel sincronizado al año ${anioFormulario.value}`, 'success');
};

// FILTRADO DE DATOS (CORREGIDO PARA VARIABLE 'anio')
const fincasFiltradas = computed<FincaSelectItem[]>(() =>
  rawData.value.fincas.map(f => ({
    ...f,
    nombre_completo: `${f.nombre} - ${f.empresa_nombre || 'Sin empresa'}`
  }))
)
const usuarioActualItem = computed<UsuarioSelectItem[]>(() => {
  const id = Number(authStore.user?.id_usuario ?? authStore.user?.id ?? 0);
  return [{ id, nombre: authStore.user?.nombre || 'Usuario actual' }];
});
const canConsultarUsuarios = computed(() => authStore.can('view.usuarios'));
const usuariosActivos = computed<UsuarioSelectItem[]>(() => {
  if (Array.isArray(rawData.value.usuarios) && rawData.value.usuarios.length) {
    return rawData.value.usuarios.filter((u) => u.activo !== false);
  }
  return usuarioActualItem.value;
});

const calendariosAnioActual = computed<CalendarioSelectItem[]>(() => {
  return rawData.value.calendarios
    .filter(c => Number(c.anio) === Number(anioActivo.value))
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

const posibleDuplicado = computed(() => {
  const fincaId = Number(registroStore.formData.finca_id || 0)
  const operarioId = Number(registroStore.formData.operario_id || 0)
  const calendarioId = Number(registroStore.formData.calendario_id || 0)
  const fecha = String(registroStore.formData.fecha || '').slice(0, 10)
  const color = String(registroStore.formData.color || '')

  if (!fincaId || !operarioId || !calendarioId || !fecha) return false

  return enfundeStore.registrosFiltrados.some((registro) => {
    const registroFecha = String(registro.fecha || '').slice(0, 10)
    if (registroFecha !== fecha) return false

    const registroFincaId = toOptionalNumber(registro.finca_id)
    if (registroFincaId !== null && registroFincaId !== fincaId) return false

    const registroOperarioId = toOptionalNumber(registro.operario_id)
    if (registroOperarioId !== null && registroOperarioId !== operarioId) return false

    const registroCalendarioId = toOptionalNumber(registro.calendario_id)
    if (registroCalendarioId !== null) return registroCalendarioId === calendarioId

    return !!color && String(registro.color || registro.cinta || '') === color
  })
})

// FUNCIONES DE SOPORTE
function toOptionalNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function onSemanaChange(id: number | null) {
  const sel = rawData.value.calendarios.find(c => c.id === id)
  if (sel) registroStore.formData.color = sel.color || null
  else registroStore.formData.color = null
}

function seleccionarSemanaPorFechaRegistro(force = false) {
  if (!force && registroStore.formData.calendario_id) return

  const semanaFecha = semanaFormulario.value
  if (Number(semanaFecha.anio) !== Number(anioActivo.value)) {
    registroStore.formData.calendario_id = null
    registroStore.formData.color = null
    return
  }

  const calendarioActual = rawData.value.calendarios.find(
    (calendario) =>
      Number(calendario.anio) === Number(semanaFecha.anio) &&
      Number(calendario.semana) === Number(semanaFecha.semana),
  )

  if (!calendarioActual) return

  registroStore.formData.calendario_id = calendarioActual.id
  registroStore.formData.color = calendarioActual.color || null
}

function onFechaChange() {
  seleccionarSemanaPorFechaRegistro(true)
}

async function refrescarRegistros() {
  const fincaId = Number(registroStore.formData.finca_id || fincaStore.fincaSeleccionadaId || 0)
  await enfundeStore.cargarRegistros(fincaId || null, anioActivo.value)
}

async function onFincaChange(value: number | string | null) {
  const fincaId = Number(value || 0)
  if (Number.isFinite(fincaId) && fincaId > 0) {
    fincaStore.seleccionarFinca(fincaId)
  }
  await refrescarRegistros()
}

function limpiarCalendarioSiNoPerteneceAlAnio() {
  const calendarioId = registroStore.formData.calendario_id
  if (!calendarioId) return
  const calendarioActual = rawData.value.calendarios.find(c => c.id === calendarioId)
  if (calendarioActual && Number(calendarioActual.anio) === Number(anioActivo.value)) return
  registroStore.formData.calendario_id = null
  registroStore.formData.color = null
}

function getColorHex(c: string | null) {
  const map: Record<string, string> = {
    Blanca: '#94a3b8',
    Negra: isDark.value ? '#64748b' : '#1e293b',
    Lila: '#a855f7',
    Roja: '#ef4444',
    Cafe: '#78350f',
    Amarilla: '#eab308',
    Verde: '#22c55e',
    Azul: '#3b82f6',
  }
  return c ? map[c] || '#94a3b8' : '#94a3b8'
}

// WATCH PARA SINCRONIZACIÓN REACTIVA
watch(() => anioActivo.value, async (nuevoAnio) => {
  if (nuevoAnio) {
    // Al cambiar el año en el panel, refrescamos calendarios para asegurar consistencia
    const c = await calendarioStore.obtenerCalendarios()
    rawData.value.calendarios = c || []
    limpiarCalendarioSiNoPerteneceAlAnio()
    seleccionarSemanaPorFechaRegistro()
    await refrescarRegistros()
  }
})

onMounted(async () => {
  registroStore.globalLoading = true
  registroStore.initForm()
  try {
    const tasks: [
      Promise<Finca[]>,
      Promise<CalendarioItem[]>,
      Promise<Usuario[]>,
    ] = [
      fincaStore.obtenerFincas(),
      calendarioStore.obtenerCalendarios(),
      canConsultarUsuarios.value ? usuarioStore.obtenerUsuarios() : Promise.resolve([] as Usuario[]),
    ];
    const [fRes, cRes, uRes] = await Promise.allSettled(tasks);
    const f: Finca[] = fRes.status === 'fulfilled' ? fRes.value : [];
    const c: CalendarioItem[] = cRes.status === 'fulfilled' ? cRes.value : [];
    const u: Usuario[] = uRes.status === 'fulfilled' ? uRes.value : [];

    rawData.value = { fincas: f || [], usuarios: u || [], calendarios: c || [] }
    seleccionarSemanaPorFechaRegistro()

    if (!registroStore.formData.finca_id && fincaStore.fincaSeleccionadaId) {
      registroStore.formData.finca_id = fincaStore.fincaSeleccionadaId
    }

    if (!registroStore.formData.usuario_id) {
      registroStore.formData.usuario_id = Number(
        authStore.user?.id_usuario ?? authStore.user?.id ?? null
      )
    }
    if (!registroStore.formData.operario_id && usuariosActivos.value.length) {
      registroStore.formData.operario_id = Number(usuariosActivos.value[0].id || 0);
    }

    await refrescarRegistros()
  } catch (error) {
    console.error("Error cargando datos de inicio:", error)
  } finally { 
    registroStore.globalLoading = false 
  }
  
})

const onSubmit = async () => {
  if (!esAnioValido.value) return; 
  registroStore.formData.usuario_id = Number(
    authStore.user?.id_usuario ?? authStore.user?.id ?? 0
  );
  if (!registroStore.formData.usuario_id) {
    registroStore.mostrarMensaje('Sesion invalida: vuelva a iniciar sesion', 'error');
    return;
  }
  const val = await formRef.value?.validate()
  if (val?.valid) await registroStore.guardarRegistro()
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

.week-preview {
  border: 1px solid rgba(var(--v-border-color), 0.14);
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.gap-4 { gap: 16px; }
</style>
