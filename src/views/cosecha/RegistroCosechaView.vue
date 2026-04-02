<template>
  <v-container fluid class="pa-4 pt-6 pb-16 bg-background min-h-screen transition-colors">
    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3000" location="top">
      {{ snackbar.message }}
      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false">Cerrar</v-btn>
      </template>
    </v-snackbar>

    <v-row justify="center">
      <v-col cols="12" class="cosecha-shell">
        <CosechaHeaderCard
          :semana-actual="cosechaStore.semanaActual"
          :rango-corte-sugerido="cosechaStore.rangoCorteSugerido"
          :total-digitado="cosechaStore.totalDigitado"
          :estado-operacion="cosechaStore.estadoOperacion"
          :estado-color="cosechaStore.estadoColor"
        />

        <ViewHelpHint
          class="mb-4"
          title="¿Qué hace esta pantalla de Liquidación de Cosecha?"
          summary="Aquí registras racimos buenos y rechazo por cinta para una fecha específica. El sistema valida saldos y calcula totales automáticamente."
          :steps="[
            'Selecciona finca y fecha de corte.',
            'Ingresa racimos buenos y rechazo por cada cinta.',
            'Revisa el estado operativo y el total digitado.',
            'Envía el reporte cuando ya esté validado.',
          ]"
          :notes="[
            'No puedes exceder el saldo disponible en campo.',
            'Las fechas ya registradas se muestran bloqueadas.',
            'La predicción te ayuda a anticipar el próximo embarque.',
          ]"
        />

        <v-row>
          <v-col cols="12" lg="4" xl="3">
            <CosechaConfigPanel
              v-model:selected-finca-id="fincaSeleccionada"
              v-model:menu-fecha="menuFecha"
              v-model:fecha-picker="fechaObjetoPicker"
              :fincas="fincas"
              :fecha-formateada="fechaFormateada"
              :info-dia-semana="infoDiaSemana"
              :fecha-minima="fechaMinima"
              :fecha-maxima="fechaMaxima"
              :loading="cosechaStore.loading"
              :submitting="cosechaStore.submitting"
              :total-digitado="cosechaStore.totalDigitado"
              :total-restante="cosechaStore.totalRestante"
              :estado-fecha-seleccionada="estadoFechaSeleccionada"
              :fecha-permitida="fechaCosechaPermitida"
              @guardar="guardarCosecha"
            />
          </v-col>

          <v-col cols="12" lg="8" xl="9">
            <PanelPrediccionCosecha v-if="fincaSeleccionada" :finca-id="fincaSeleccionada" />

            <div v-if="cosechaStore.loading" class="text-center pa-12">
              <v-progress-circular indeterminate size="80" width="8" color="primary" />
              <div class="mt-4 text-h6 font-weight-bold text-medium-emphasis">
                Sincronizando datos de campo...
              </div>
            </div>

            <CosechaSaldosPorAnio
              v-else
              :sorted-years="sortedYears"
              :obtener-color-tarjeta="obtenerColorTarjeta"
              :obtener-variante-tarjeta="obtenerVarianteTarjeta"
              @adjust="handleAjuste"
              @set-field="setCampoDigitacion"
              @maximize="handleMaximizarBuenos"
              @normalize="normalizarDigitacion"
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import CosechaConfigPanel from '@/components/cosecha/CosechaConfigPanel.vue';
import CosechaHeaderCard from '@/components/cosecha/CosechaHeaderCard.vue';
import CosechaSaldosPorAnio from '@/components/cosecha/CosechaSaldosPorAnio.vue';
import PanelPrediccionCosecha from '@/components/cosecha/PanelPrediccionCosecha.vue';
import ViewHelpHint from '@/components/ui/ViewHelpHint.vue';
import { useRegistroCosecha } from '@/composables/useRegistroCosecha';
import type { CintaCosecha } from '@/stores/cosecha/cosechaStore';

interface AjustePayload {
  item: CintaCosecha;
  campo: 'cantidad_a_cosechar' | 'rechazo';
  delta: number;
}

const {
  cosechaStore,
  fincas,
  fincaSeleccionada,
  fechaObjetoPicker,
  menuFecha,
  snackbar,
  sortedYears,
  fechaFormateada,
  infoDiaSemana,
  fechaMaxima,
  fechaMinima,
  estadoFechaSeleccionada,
  obtenerColorTarjeta,
  obtenerVarianteTarjeta,
  fechaCosechaPermitida,
  setCampoDigitacion,
  normalizarDigitacion,
  guardarCosecha,
} = useRegistroCosecha();

function handleAjuste({ item, campo, delta }: AjustePayload) {
  cosechaStore.ajustarDigitacion(item, campo, delta);
}

function handleMaximizarBuenos(item: CintaCosecha) {
  cosechaStore.maximizarBuenos(item);
}
</script>

<style scoped>
.cosecha-shell {
  max-width: 1880px;
}
</style>
