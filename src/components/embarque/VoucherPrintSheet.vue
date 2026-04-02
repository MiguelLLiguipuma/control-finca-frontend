<template>
  <div class="print-only">
    <div class="print-sheet">
      <div class="print-sheet__watermark">ControlFinca</div>
      <header class="print-sheet__header">
        <div class="print-brand">
          <div class="print-brand__logo">CF</div>
          <div>
            <div class="print-sheet__eyebrow">ControlFinca · Operacion de Embarque</div>
            <h1 class="print-sheet__title">Voucher de Embarque</h1>
          </div>
        </div>
        <div class="print-sheet__badge">
          {{ embarqueStore.voucherActual?.numero_voucher || 'BORRADOR' }}
        </div>
      </header>

      <section class="print-sheet__meta">
        <div><strong>Fecha:</strong> {{ embarqueStore.fechaEmbarque }}</div>
        <div><strong>Estado:</strong> {{ embarqueStore.voucherActual?.estado || 'BORRADOR' }}</div>
        <div><strong>Semana Corte:</strong> {{ embarqueStore.semanaCorte || '--' }}</div>
        <div><strong>Fincas:</strong> {{ fincasSeleccionadasTexto }}</div>
        <div><strong>Emitido por:</strong> {{ authUserName }}</div>
        <div><strong>Impreso:</strong> {{ fechaImpresionTexto }}</div>
      </section>

      <section class="print-sheet__totals">
        <table>
          <tbody>
            <tr>
              <th>Racimos Buenos</th>
              <td>{{ embarqueStore.totales.racimos_buenos }}</td>
              <th>Total Cajas</th>
              <td>{{ embarqueStore.totales.total_cajas.toFixed(2) }}</td>
            </tr>
            <tr>
              <th>Racimos Rechazo</th>
              <td>{{ embarqueStore.totales.racimos_rechazo }}</td>
              <th>Ratio Comercial</th>
              <td>{{ embarqueStore.totales.ratio_comercial_global.toFixed(4) }}</td>
            </tr>
            <tr>
              <th>Total Racimos</th>
              <td>{{ embarqueStore.totales.total_racimos }}</td>
              <th>Ratio Operativo</th>
              <td>{{ embarqueStore.totales.ratio_operativo_global.toFixed(4) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="print-sheet__lines">
        <table>
          <thead>
            <tr>
              <th>Finca</th>
              <th>Cinta</th>
              <th>Sem</th>
              <th>Buenos</th>
              <th>Rechazo</th>
              <th>Total</th>
              <th>Cajas</th>
              <th>Ratio Com</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(linea, idx) in embarqueStore.lineas"
              :key="`print-${linea.finca_id}-${linea.calendario_id}-${idx}`"
            >
              <td>{{ linea.finca_nombre }}</td>
              <td>{{ linea.cinta_color }}</td>
              <td>{{ linea.semana_enfunde ?? '--' }}</td>
              <td class="text-right">{{ linea.racimos_buenos }}</td>
              <td class="text-right">{{ linea.racimos_rechazo }}</td>
              <td class="text-right">{{ linea.total_racimos }}</td>
              <td class="text-right">{{ linea.cajas_embarcadas.toFixed(2) }}</td>
              <td class="text-right">{{ linea.ratio_comercial_linea.toFixed(4) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="print-sheet__obs">
        <strong>Observaciones:</strong>
        <span>{{ embarqueStore.observaciones || 'Sin observaciones.' }}</span>
      </section>

      <section class="print-sheet__signatures">
        <div>
          <div class="line"></div>
          <span>Responsable de Embarque</span>
        </div>
        <div>
          <div class="line"></div>
          <span>Supervisor de Campo</span>
        </div>
      </section>

      <footer class="print-sheet__footer">
        Documento generado por ControlFinca. Uso interno operativo.
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { useEmbarqueStore } from '@/stores/embarque/embarqueStore';

defineProps<{
  embarqueStore: ReturnType<typeof useEmbarqueStore>;
  fincasSeleccionadasTexto: string;
  fechaImpresionTexto: string;
  authUserName: string;
}>();
</script>
