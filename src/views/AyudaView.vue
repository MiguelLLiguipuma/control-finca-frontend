<template>
  <v-container fluid class="pa-4 pa-md-6 bg-background min-h-screen">
    <v-row justify="center">
      <v-col cols="12" xl="10">
        <v-card variant="flat" class="rounded-xl border mb-6">
          <v-card-text class="pa-6 pa-md-8">
            <div class="text-overline font-weight-bold text-medium-emphasis mb-1">Guia rapida</div>
            <h1 class="text-h4 font-weight-black mb-2">Como usar ControlFinca</h1>
            <p class="text-body-1 text-medium-emphasis mb-0">
              Esta pantalla explica cada modulo con lenguaje simple para usuarios sin experiencia tecnica.
            </p>
          </v-card-text>
        </v-card>

        <v-row class="mb-4">
          <v-col cols="12" md="6" lg="3" v-for="item in modulos" :key="item.titulo">
            <v-card variant="flat" class="rounded-xl border h-100">
              <v-card-text class="pa-4">
                <div class="d-flex align-center gap-2 mb-2">
                  <v-avatar size="30" color="primary" variant="tonal">
                    <v-icon size="18">{{ item.icono }}</v-icon>
                  </v-avatar>
                  <div class="text-subtitle-1 font-weight-black">{{ item.titulo }}</div>
                </div>
                <div class="text-body-2 text-medium-emphasis">{{ item.descripcion }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card variant="flat" class="rounded-xl border mb-6">
          <v-card-text class="pa-5 pa-md-6">
            <div class="text-h6 font-weight-black mb-4">Flujo recomendado del dia</div>
            <v-timeline density="compact" side="end" truncate-line="both">
              <v-timeline-item v-for="paso in flujoDiario" :key="paso.titulo" dot-color="primary" fill-dot size="small">
                <template #opposite>
                  <span class="text-caption text-medium-emphasis">{{ paso.area }}</span>
                </template>
                <div class="text-subtitle-2 font-weight-black">{{ paso.titulo }}</div>
                <div class="text-body-2 text-medium-emphasis">{{ paso.texto }}</div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>

        <v-row>
          <v-col cols="12" md="6">
            <v-card variant="flat" class="rounded-xl border h-100">
              <v-card-text class="pa-5">
                <div class="text-h6 font-weight-black mb-3">Terminos clave</div>
                <v-list lines="two" density="compact" class="py-0">
                  <v-list-item v-for="item in glosario" :key="item.termino" class="px-0">
                    <v-list-item-title class="font-weight-bold">{{ item.termino }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.significado }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card variant="flat" class="rounded-xl border h-100">
              <v-card-text class="pa-5">
                <div class="text-h6 font-weight-black mb-3">Si aparece un error</div>
                <v-list lines="two" density="compact" class="py-0">
                  <v-list-item v-for="item in soporte" :key="item.codigo" class="px-0">
                    <v-list-item-title class="font-weight-bold">{{ item.codigo }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.accion }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
const modulos = [
  {
    titulo: 'Dashboard',
    icono: 'mdi-view-dashboard-outline',
    descripcion: 'Resumen general de la finca: produccion, tendencias y alertas.',
  },
  {
    titulo: 'Registro Enfunde',
    icono: 'mdi-leaf',
    descripcion: 'Ingreso de fundas colocadas por semana y cinta.',
  },
  {
    titulo: 'Liquidacion Cosecha',
    icono: 'mdi-basket-check-outline',
    descripcion: 'Registro de racimos buenos y rechazo por lote.',
  },
  {
    titulo: 'Voucher Embarque',
    icono: 'mdi-file-document-check-outline',
    descripcion: 'Cierre del dia: cajas finales y ratio de salida.',
  },
]

const flujoDiario = [
  {
    area: 'Manejo',
    titulo: '1. Registrar enfunde',
    texto: 'Anota las fundas por cinta para actualizar la base diaria.',
  },
  {
    area: 'Campo',
    titulo: '2. Liquidar cosecha',
    texto: 'Registra racimos buenos y rechazo sin exceder saldo disponible.',
  },
  {
    area: 'Planificacion',
    titulo: '3. Revisar prediccion',
    texto: 'Consulta proyeccion de proximo embarque y riesgo operativo.',
  },
  {
    area: 'Cierre',
    titulo: '4. Confirmar voucher',
    texto: 'Asigna cajas por finca, valida ratio y confirma el documento.',
  },
]

const glosario = [
  { termino: 'Cinta', significado: 'Identificador de semana/lote para seguimiento en campo.' },
  { termino: 'Edad de cinta', significado: 'Semanas transcurridas desde enfunde hasta hoy.' },
  { termino: 'Rechazo', significado: 'Racimos no aptos para proceso comercial.' },
  { termino: 'Ratio comercial', significado: 'Cajas embarcadas divididas para racimos buenos.' },
  { termino: 'Voucher', significado: 'Documento operativo final del embarque diario.' },
]

const soporte = [
  {
    codigo: '403 - Sin permiso',
    accion: 'Tu rol no puede ejecutar esa accion. Solicita apoyo a administrador.',
  },
  {
    codigo: '409 - Conflicto',
    accion: 'El registro ya existe o cambio de estado. Recarga y vuelve a validar.',
  },
  {
    codigo: '500 - Error interno',
    accion: 'Guarda hora, finca y pantalla. Reporta al equipo tecnico.',
  },
  {
    codigo: '503 - Servicio saturado',
    accion: 'Espera 1-2 minutos y reintenta sin multiples recargas.',
  },
]
</script>

<style scoped>
.min-h-screen { min-height: 100vh; }
.border { border: 1px solid rgba(var(--v-border-color), 0.14) !important; }
.gap-2 { gap: 8px; }
</style>
