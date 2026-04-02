<template>
  <v-row dense>
    <template v-for="anio in sortedYears" :key="anio">
      <v-col cols="12" class="mt-6 mb-2">
        <div class="d-flex align-center">
          <v-chip
            :color="Number(anio) < cosechaStore.anioActual ? 'warning' : 'secondary'"
            size="x-large"
            variant="flat"
            class="font-weight-black mr-4 elevation-2 rounded-lg"
          >
            <v-icon start size="large">
              {{ Number(anio) < cosechaStore.anioActual ? 'mdi-history' : 'mdi-calendar-today' }}
            </v-icon>
            AÑO {{ anio }}
          </v-chip>
          <v-divider class="border-opacity-50" />
        </div>
      </v-col>

      <v-col
        v-for="item in cosechaStore.saldosPorAnio[anio]"
        :key="item.calendario_id"
        cols="12"
      >
        <CosechaSaldoCard
          :item="item"
          :loading="cosechaStore.loading"
          :edad="cosechaStore.calcularEdadExacta(item.semana_enfunde, item.anio)"
          :porcentaje="cosechaStore.calcularPorcentaje(item)"
          :exceeded="cosechaStore.esExcedido(item)"
          :is-current-cut="cosechaStore.esCintaDeCorteActual(item.semana_enfunde, item.anio)"
          :is-ready-for-cut="cosechaStore.esFrutaDeCorte(item.semana_enfunde, item.anio)"
          :card-color="obtenerColorTarjeta(item)"
          :card-variant="obtenerVarianteTarjeta(item)"
          @adjust="$emit('adjust', $event)"
          @set-field="$emit('set-field', $event)"
          @maximize="$emit('maximize', $event)"
          @normalize="$emit('normalize', $event)"
        />
      </v-col>
    </template>

    <v-col v-if="!cosechaStore.saldosPendientes.length" cols="12">
      <v-sheet rounded="xl" class="pa-12 text-center bg-transparent border-dashed">
        <v-icon size="96" color="medium-emphasis" class="mb-4">mdi-basket-off-outline</v-icon>
        <div class="text-h5 font-weight-bold text-medium-emphasis">No hay saldos disponibles</div>
        <div class="text-body-1 text-disabled mt-2">Seleccione una finca o cambie la fecha</div>
      </v-sheet>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import CosechaSaldoCard from '@/components/cosecha/CosechaSaldoCard.vue';
import { useCosechaStore, type CintaCosecha } from '@/stores/cosecha/cosechaStore';

interface AjustePayload {
  item: CintaCosecha;
  campo: 'cantidad_a_cosechar' | 'rechazo';
  delta: number;
}

interface SetCampoPayload {
  item: CintaCosecha;
  campo: 'cantidad_a_cosechar' | 'rechazo';
  valor: number;
}

interface Props {
  sortedYears: string[];
  obtenerColorTarjeta: (item: CintaCosecha) => string;
  obtenerVarianteTarjeta: (item: CintaCosecha) => 'tonal' | 'elevated';
}

const props = defineProps<Props>();
const cosechaStore = useCosechaStore();

defineEmits<{
  (e: 'adjust', payload: AjustePayload): void;
  (e: 'set-field', payload: SetCampoPayload): void;
  (e: 'maximize', item: CintaCosecha): void;
  (e: 'normalize', item: CintaCosecha): void;
}>();

void props;
</script>

<style scoped>
.border-dashed {
  border-style: dashed !important;
  opacity: 0.4;
}
</style>
