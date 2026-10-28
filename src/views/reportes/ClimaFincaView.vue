<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth/authStore';
import { useClimaFinca } from '@/composables/useClimaFinca';
import { fechaClima, fechaClimaHoy, formatoClima } from '@/domain/clima';
import ClimaIndicadores from '@/components/clima/ClimaIndicadores.vue';
import ClimaGraficos from '@/components/clima/ClimaGraficos.vue';
import ClimaTablaDiaria from '@/components/clima/ClimaTablaDiaria.vue';

const auth = useAuthStore();
const { fincaStore, fincas, fincaSeleccionadaId, hasta, desde, data, loading, iniciando, error, errorFincas,
  errorPeriodo, dias, resumen, filas, soloFaltantes, rango, cargar, iniciar, seleccionarPeriodo, exportar } = useClimaFinca(useRoute().query.finca_id);
const seleccion = computed({ get: () => fincaSeleccionadaId.value, set: (id: number | null) => { if (id) fincaStore.seleccionarFinca(id); } });
const ultimaActualizacion = computed(() => {
  const value = data.value?.ultima_actualizacion;
  if (!value) return 'Sin información';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('es-EC', { timeZone: 'America/Guayaquil', dateStyle: 'medium', timeStyle: 'short' }) : 'Sin información';
});
</script>

<template>
  <v-container fluid class="clima-page">
    <header class="clima-header">
      <div><h1>Clima por finca</h1><p>Precipitación, temperatura y acumulación térmica registrada</p></div>
      <div class="clima-acciones">
        <v-btn icon="mdi-refresh" variant="outlined" :loading="loading || iniciando" :disabled="Boolean(errorPeriodo)" aria-label="Actualizar historial climático" title="Actualizar historial" @click="errorFincas ? iniciar() : cargar()" />
        <v-btn icon="mdi-download" variant="outlined" :disabled="!data || loading" aria-label="Descargar historial en CSV" title="Descargar CSV" @click="exportar" />
      </div>
    </header>

    <section class="clima-filtros" aria-label="Filtros de clima">
      <v-autocomplete v-model="seleccion" :items="fincas" item-title="nombre" item-value="id" label="Finca"
        :loading="iniciando" :disabled="iniciando || !fincas.length" variant="outlined" hide-details class="filtro-finca"
        no-data-text="No hay fincas disponibles" />
      <div class="filtro-periodo">
        <span class="filter-label">Período</span>
        <v-btn-toggle :model-value="rango" divided color="primary" aria-label="Período de consulta">
          <v-btn v-for="n in [7,30,90]" :key="n" :value="n" @click="seleccionarPeriodo(n)">{{ n }} días</v-btn>
        </v-btn-toggle>
      </div>
      <v-text-field v-model="desde" label="Desde" type="date" :max="hasta" variant="outlined" hide-details class="filtro-fecha" />
      <v-text-field v-model="hasta" label="Hasta" type="date" :min="desde" :max="fechaClimaHoy()" variant="outlined" hide-details class="filtro-fecha" />
    </section>

    <v-alert v-if="errorPeriodo" type="warning" variant="tonal" class="mb-4">{{ errorPeriodo }}</v-alert>
    <v-alert v-if="errorFincas || error" type="error" variant="tonal" class="mb-4" aria-live="polite">
      {{ errorFincas || error }}
      <template #append><v-btn variant="text" @click="errorFincas ? iniciar() : cargar()">Reintentar</v-btn></template>
    </v-alert>
    <v-progress-linear v-if="loading || iniciando" indeterminate color="primary" aria-label="Cargando clima" class="my-4" />
    <div v-else-if="!fincas.length && !errorFincas" class="clima-vacio"><v-icon icon="mdi-map-marker-radius" size="36" /><h2>No tienes fincas disponibles</h2><p>Solicita la asignación de una finca para consultar su clima.</p></div>

    <template v-if="data && !loading">
      <section class="clima-contexto" aria-label="Estado de la captura">
        <div><h2>{{ data.finca.nombre }}</h2><p>{{ fechaClima(data.periodo.desde) }} al {{ fechaClima(data.periodo.hasta) }}</p></div>
        <div><span>Último registro disponible</span><strong>{{ fechaClima(data.ultima_fecha) }}</strong></div>
        <div><span>Antigüedad del registro</span><strong>{{ data.dias_atraso === null ? 'Sin historial' : `${data.dias_atraso} ${data.dias_atraso === 1 ? 'día' : 'días'}` }}</strong></div>
      </section>

      <v-alert type="warning" variant="tonal" density="compact" class="clima-advertencia my-4">
        <strong>Datos puntuales, no diarios consolidados.</strong> La lluvia guardada no representa todo el día y las unidades de calor son estimaciones con una temperatura puntual. No se calcula precipitación acumulada con estas muestras.
      </v-alert>
      <v-alert v-if="data.finca.latitud === null || data.finca.longitud === null" type="info" variant="tonal" class="mb-4">
        Esta finca no tiene coordenadas completas para nuevas capturas climáticas.
        <v-btn v-if="auth.can('view.fincas')" to="/fincas" variant="text" size="small">Revisar finca</v-btn>
      </v-alert>

      <ClimaIndicadores :dias="dias" />
      <div v-if="!resumen.diasConRegistro" class="clima-vacio">
        <v-icon icon="mdi-weather-cloudy-alert" size="36" /><h2>Sin registros en este período</h2>
        <p>Prueba otro rango de fechas. La ausencia de datos no significa que no haya llovido.</p>
      </div>
      <ClimaGraficos v-else :dias="dias" />
      <ClimaTablaDiaria :key="`${data.finca.id}:${data.periodo.desde}:${data.periodo.hasta}`" :filas="filas" v-model:solo-faltantes="soloFaltantes" />

      <v-expansion-panels variant="accordion" class="mt-6">
        <v-expansion-panel title="Fuente, ubicación y calidad de los datos">
          <v-expansion-panel-text>
            <dl class="clima-metadatos">
              <div><dt>Fuente de la integración</dt><dd>{{ data.metodologia.fuente }}</dd></div>
              <div><dt>Última actualización del registro más reciente</dt><dd>{{ ultimaActualizacion }} · Ecuador</dd></div>
              <div><dt>Coordenadas configuradas</dt><dd>{{ data.finca.latitud ?? 'Sin latitud' }}, {{ data.finca.longitud ?? 'sin longitud' }}</dd></div>
              <div><dt>Base térmica usada por el sistema</dt><dd>{{ formatoClima(data.metodologia.temperatura_base) }} °C</dd></div>
            </dl>
            <p class="mt-4">{{ data.metodologia.nota }}</p>
            <p class="mt-2">No hay registros de humedad, viento ni temperatura mínima y máxima diaria en el historial actual. Esta vista no determina por sí sola condiciones seguras de fumigación o necesidades de riego.</p>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </template>
  </v-container>
</template>

<style scoped>
.clima-page { max-width:1560px; padding:24px; }
.clima-header { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.clima-header h1 { font-size:26px; font-weight:750; letter-spacing:0; }
.clima-header p { margin-top:6px; color:rgba(var(--v-theme-on-surface),.7); font-size:14px; }
.clima-acciones { display:flex; gap:8px; }
.clima-acciones :deep(.v-btn) { width:42px; height:42px; border-radius:6px; }
.clima-filtros { display:flex; flex-wrap:wrap; align-items:flex-end; gap:14px; margin-block:24px; padding-block:18px; border-block:1px solid rgba(var(--v-theme-on-surface),.12); }
.filtro-finca { flex:1 1 240px; min-width:0; }
.filtro-fecha { flex:1 1 165px; min-width:0; }
.filtro-periodo { flex:0 1 auto; }
.filter-label { display:block; font-size:12px; margin-bottom:5px; }
.filtro-periodo :deep(.v-btn-toggle) { height:56px; border:1px solid rgba(var(--v-theme-on-surface),.2); border-radius:6px; }
.filtro-periodo :deep(.v-btn) { text-transform:none; letter-spacing:0; }
.clima-contexto { display:flex; flex-wrap:wrap; gap:18px 36px; align-items:center; }
.clima-contexto h2 { font-size:20px; letter-spacing:0; }
.clima-contexto p, .clima-contexto span { color:rgba(var(--v-theme-on-surface),.7); font-size:12px; }
.clima-contexto strong { display:block; font-size:14px; margin-top:5px; }
.clima-advertencia :deep(.v-alert__content) { color:rgb(var(--v-theme-on-surface)); font-size:13px; }
.clima-vacio { text-align:center; padding:40px 16px; }
.clima-vacio h2 { font-size:18px; margin-block:10px; }
.clima-vacio p { font-size:14px; color:rgba(var(--v-theme-on-surface),.7); }
.clima-metadatos { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.clima-metadatos dt { font-weight:650; font-size:13px; }
.clima-metadatos dd { margin-top:4px; font-size:13px; overflow-wrap:anywhere; }
@media(max-width:599px) { .clima-page { padding:16px; } .clima-header h1 { font-size:22px; } .filtro-finca,.filtro-periodo { flex-basis:100%; } .filtro-fecha { flex-basis:calc(50% - 7px); } .filtro-periodo :deep(.v-btn-toggle) { width:100%; height:44px; } .filtro-periodo :deep(.v-btn) { flex:1; } .clima-metadatos { grid-template-columns:minmax(0,1fr); } }
</style>
