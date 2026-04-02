<template>
  <v-container
    fluid
    class="bg-background voucher-min-h-screen pa-4 pa-md-6 voucher-transition-colors voucher-shell voucher-print-root voucher-bg"
    :class="voucherEstadoClass"
  >
    <v-row justify="center">
      <v-col cols="12" xl="11">
        <div class="print-header">
          <div class="print-title">Voucher de Embarque</div>
          <div class="print-meta">
            <span>Fecha: {{ embarqueStore.fechaEmbarque }}</span>
            <span v-if="embarqueStore.voucherActual">
              · Nro: {{ embarqueStore.voucherActual.numero_voucher }}
            </span>
            <span v-if="embarqueStore.voucherActual">
              · Estado: {{ embarqueStore.voucherActual.estado }}
            </span>
          </div>
        </div>

        <VoucherPrintSheet
          :embarque-store="embarqueStore"
          :fincas-seleccionadas-texto="fincasSeleccionadasTexto"
          :fecha-impresion-texto="fechaImpresionTexto"
          :auth-user-name="authStore.userName"
        />

        <div class="print-hidden voucher-redesign-alt" :class="{ 'voucher-swap': animarCambioVoucher }">
          <VoucherHeroSection :embarque-store="embarqueStore" :chip-estado="chipEstado" />

          <ViewHelpHint
            class="mb-4"
            title="¿Qué haces en Voucher de Embarque?"
            summary="Esta vista es el cierre operativo del día. Consolida cosecha por finca, asigna cajas reales y calcula ratios antes de confirmar."
            :steps="[
              'Define fecha, fincas y semana de corte.',
              'Carga la base del día para traer líneas de cosecha.',
              'Asigna cajas totales o por finca y ajusta líneas.',
              'Guarda borrador y confirma cuando esté validado.',
            ]"
            :notes="[
              'Solo se permite combinar fincas de la misma empresa.',
              'Al confirmar, el documento queda cerrado operativamente.',
              'Puedes imprimir el voucher para control físico o auditoría.',
            ]"
          />

          <v-alert v-if="embarqueStore.error" type="error" variant="tonal" class="mb-4">
            {{ embarqueStore.error }}
          </v-alert>
          <v-alert v-else-if="mensajeBusqueda" type="info" variant="tonal" class="mb-4">
            {{ mensajeBusqueda }}
          </v-alert>

          <v-row class="mb-6">
            <v-col cols="12" lg="8">
              <VoucherWorkflowPanel
                v-model:menu-fecha="menuFecha"
                v-model:fecha-voucher-picker="fechaVoucherPicker"
                v-model:menu-fecha-busqueda="menuFechaBusqueda"
                v-model:fecha-busqueda="fechaBusqueda"
                v-model:fecha-busqueda-picker="fechaBusquedaPicker"
                v-model:numero-voucher-busqueda="numeroVoucherBusqueda"
                v-model:modo-busqueda-numero="modoBusquedaNumero"
                v-model:cajas-semana-input="cajasSemanaInput"
                v-model:cajas-por-finca="cajasPorFinca"
                :embarque-store="embarqueStore"
                :fincas-disponibles="fincasDisponibles"
                :fecha-minima="fechaMinima"
                :fecha-maxima="fechaMaxima"
                :fecha-voucher-permitida="fechaVoucherPermitida"
                :estado-fecha-seleccionada="estadoFechaSeleccionada"
                :aviso-empresa="avisoEmpresa"
                :resumen-fincas="resumenFincas"
                @refresh-base="refrescarBase"
                @buscar-vouchers="buscarVouchers"
                @aplicar-cajas-semana="aplicarCajasSemana"
                @aplicar-cajas-finca="aplicarCajasFinca"
              />
            </v-col>

            <v-col cols="12" lg="4">
              <VoucherSummaryCard
                :embarque-store="embarqueStore"
                :can-confirm-voucher="canConfirmVoucher"
                :can-cancel-voucher="canCancelVoucher"
                :motivo-bloqueo-confirmar="motivoBloqueoConfirmar"
                @guardar="guardar"
                @confirmar="confirmar"
                @abrir-dialogo-anular="abrirDialogoAnular"
                @imprimir="imprimirVoucher"
              />
            </v-col>
          </v-row>

          <VoucherLineasTable
            :embarque-store="embarqueStore"
            :lineas-table-height="lineasTableHeight"
          />

          <VoucherListadoTable
            :embarque-store="embarqueStore"
            :color-estado="colorEstado"
          />
        </div>
      </v-col>
    </v-row>

    <VoucherAnularDialog
      v-model="dialogAnular"
      v-model:motivo-anulacion="motivoAnulacion"
      :submitting="embarqueStore.submitting"
      @confirm="anular"
    />
  </v-container>
</template>

<script setup lang="ts">
import ViewHelpHint from '@/components/ui/ViewHelpHint.vue';
import VoucherAnularDialog from '@/components/embarque/VoucherAnularDialog.vue';
import VoucherHeroSection from '@/components/embarque/VoucherHeroSection.vue';
import VoucherLineasTable from '@/components/embarque/VoucherLineasTable.vue';
import VoucherListadoTable from '@/components/embarque/VoucherListadoTable.vue';
import VoucherPrintSheet from '@/components/embarque/VoucherPrintSheet.vue';
import VoucherSummaryCard from '@/components/embarque/VoucherSummaryCard.vue';
import VoucherWorkflowPanel from '@/components/embarque/VoucherWorkflowPanel.vue';
import { useVoucherEmbarque } from '@/composables/useVoucherEmbarque';

const {
  embarqueStore,
  authStore,
  dialogAnular,
  motivoAnulacion,
  cajasSemanaInput,
  avisoEmpresa,
  menuFecha,
  fechaVoucherPicker,
  menuFechaBusqueda,
  fechaBusqueda,
  fechaBusquedaPicker,
  numeroVoucherBusqueda,
  modoBusquedaNumero,
  mensajeBusqueda,
  cajasPorFinca,
  animarCambioVoucher,
  chipEstado,
  voucherEstadoClass,
  canConfirmVoucher,
  canCancelVoucher,
  motivoBloqueoConfirmar,
  fincasDisponibles,
  resumenFincas,
  fincasSeleccionadasTexto,
  fechaMaxima,
  fechaMinima,
  estadoFechaSeleccionada,
  lineasTableHeight,
  fechaImpresionTexto,
  colorEstado,
  fechaVoucherPermitida,
  refrescarBase,
  aplicarCajasSemana,
  aplicarCajasFinca,
  guardar,
  confirmar,
  abrirDialogoAnular,
  anular,
  buscarVouchers,
  imprimirVoucher,
} = useVoucherEmbarque();
</script>

<style>
.voucher-transition-colors { transition: background-color 0.25s ease, color 0.25s ease; }
.voucher-shell { position: relative; z-index: 1; }
.voucher-min-h-screen { min-height: 100vh; }

.voucher-shell {
  --voucher-accent-rgb: var(--v-theme-primary);
  --voucher-accent-2-rgb: var(--v-theme-secondary);
}

.voucher-theme-borrador {
  --voucher-accent-rgb: var(--v-theme-warning);
  --voucher-accent-2-rgb: var(--v-theme-primary);
}

.voucher-theme-confirmado {
  --voucher-accent-rgb: var(--v-theme-success);
  --voucher-accent-2-rgb: var(--v-theme-primary);
}

.voucher-theme-anulado {
  --voucher-accent-rgb: var(--v-theme-error);
  --voucher-accent-2-rgb: var(--v-theme-secondary);
}

.voucher-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(circle at 5% 6%, rgba(var(--voucher-accent-rgb), 0.14), transparent 35%),
    radial-gradient(circle at 96% 90%, rgba(var(--voucher-accent-2-rgb), 0.1), transparent 30%);
}

.voucher-card-border { border: 1px solid rgba(var(--v-border-color), 0.14) !important; }
.voucher-shadow-sm { box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08) !important; }
.voucher-sticky-actions { position: sticky; top: 88px; }
.print-header,
.print-only { display: none; }

.voucher-hero-alt {
  background: linear-gradient(
      120deg,
      rgba(var(--voucher-accent-rgb), 0.2) 0%,
      rgba(var(--voucher-accent-2-rgb), 0.14) 42%,
      rgba(var(--v-theme-surface), 0.96) 100%
    ) !important;
  border-color: rgba(var(--voucher-accent-rgb), 0.3) !important;
}

.hero-alt-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.hero-alt-kicker {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.hero-alt-title {
  margin: 6px 0;
  font-size: clamp(1.55rem, 3vw, 2.1rem);
  font-weight: 900;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-on-surface));
}

.hero-alt-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.hero-alt-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-pill {
  border: 1px solid rgba(var(--v-border-color), 0.24);
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(var(--v-theme-surface), 0.7);
  display: grid;
  gap: 2px;
}

.metric-pill span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(var(--v-theme-on-surface), 0.64);
}

.metric-pill strong {
  font-size: 1.15rem;
  color: rgb(var(--v-theme-on-surface));
  font-weight: 900;
}

.workflow-card,
.summary-side-card,
.detail-table-card,
.vouchers-list-card {
  background: linear-gradient(
      175deg,
      rgba(var(--v-theme-surface), 1),
      rgba(var(--v-theme-surface), 0.965)
    ) !important;
}

.workflow-step {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.workflow-step__index {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: rgb(var(--voucher-accent-rgb));
  border: 1px solid rgba(var(--voucher-accent-rgb), 0.3);
  background: rgba(var(--voucher-accent-rgb), 0.1);
}

.workflow-step__title {
  font-size: 1rem;
  font-weight: 900;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.workflow-step__subtitle {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
  margin-top: 2px;
}

.summary-side-title {
  font-size: 1rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.summary-side-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.summary-stat {
  border: 1px solid rgba(var(--v-border-color), 0.24);
  border-radius: 10px;
  padding: 9px 10px;
  background: rgba(var(--v-theme-on-surface), 0.025);
  display: grid;
  gap: 3px;
}

.summary-stat--full {
  grid-column: 1 / -1;
}

.summary-stat span {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.summary-stat strong {
  font-size: 1.06rem;
  font-weight: 900;
  color: rgb(var(--v-theme-on-surface));
}

.table-heading {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.22);
  background: linear-gradient(
    180deg,
    rgba(var(--voucher-accent-rgb), 0.1),
    rgba(var(--v-theme-surface), 0.9)
  );
}

.table-heading__title {
  font-size: 0.98rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.table-heading__subtitle {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.64);
}

.voucher-custom-label {
  display: block;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.66);
}

.workflow-card .v-field,
.detail-table-card .v-field,
.summary-side-card .v-btn {
  border-radius: 12px;
}

.workflow-card .v-field__outline,
.detail-table-card .v-field__outline {
  --v-field-border-opacity: 0.26;
}

.workflow-card .v-field--focused .v-field__outline,
.detail-table-card .v-field--focused .v-field__outline {
  --v-field-border-opacity: 1;
  color: rgb(var(--voucher-accent-rgb));
}

.detail-table-card .v-table,
.vouchers-list-card .v-table {
  background: transparent;
}

.detail-table-card .v-table thead th,
.vouchers-list-card .v-table thead th {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.7);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.26);
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.detail-table-card .v-table tbody td,
.vouchers-list-card .v-table tbody td {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
}

.detail-table-card .v-table tbody tr:hover td,
.vouchers-list-card .v-table tbody tr:hover td {
  background: rgba(var(--voucher-accent-rgb), 0.06);
}

.detail-table-card .v-table__wrapper,
.workflow-card .v-table__wrapper,
.vouchers-list-card .v-table__wrapper {
  overflow-x: auto;
}

.detail-table-card table,
.workflow-card table,
.vouchers-list-card table {
  min-width: 760px;
}

.voucher-premium-btn {
  min-height: 46px;
  border-radius: 12px !important;
  text-transform: none;
  letter-spacing: 0.02em;
  font-weight: 800 !important;
}

.btn-save {
  background: linear-gradient(110deg, rgba(var(--voucher-accent-rgb), 1), rgba(var(--voucher-accent-rgb), 0.84)) !important;
}

.btn-confirm {
  background: linear-gradient(110deg, rgba(var(--voucher-accent-2-rgb), 1), rgba(var(--voucher-accent-2-rgb), 0.84)) !important;
}

.btn-cancel {
  border: 1px solid rgba(var(--voucher-accent-rgb), 0.32);
}

.reveal-block {
  opacity: 0;
  transform: translateY(10px);
  animation: voucher-reveal 0.45s ease forwards;
}

.reveal-1 { animation-delay: 0.02s; }
.reveal-2 { animation-delay: 0.08s; }
.reveal-3 { animation-delay: 0.12s; }
.reveal-4 { animation-delay: 0.16s; }
.reveal-5 { animation-delay: 0.2s; }

.voucher-swap .voucher-hero-alt,
.voucher-swap .workflow-card,
.voucher-swap .summary-side-card,
.voucher-swap .detail-table-card {
  animation: voucher-swap-pulse 0.4s ease;
}

@keyframes voucher-reveal {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes voucher-swap-pulse {
  0% { filter: saturate(0.9); }
  100% { filter: saturate(1); }
}

@media (max-width: 1260px) {
  .voucher-sticky-actions {
    position: static;
    top: auto;
  }
}

@media (max-width: 960px) {
  .hero-alt-grid {
    grid-template-columns: 1fr;
  }

  .hero-alt-metrics {
    grid-template-columns: 1fr 1fr;
  }

  .workflow-step {
    grid-template-columns: 1fr;
  }

  .summary-side-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .voucher-bg::before {
    background:
      radial-gradient(circle at 10% 8%, rgba(var(--voucher-accent-rgb), 0.1), transparent 33%),
      radial-gradient(circle at 95% 90%, rgba(var(--voucher-accent-2-rgb), 0.08), transparent 28%);
  }

  .hero-alt-title {
    font-size: 1.5rem;
  }

  .hero-alt-metrics {
    grid-template-columns: 1fr;
  }

  .summary-side-grid {
    grid-template-columns: 1fr;
  }

  .workflow-step__index {
    display: none;
  }

  .workflow-card .v-card-text,
  .summary-side-card .v-card-text {
    padding: 14px !important;
  }

  .detail-table-card table,
  .workflow-card table,
  .vouchers-list-card table {
    min-width: 680px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-block,
  .voucher-swap .voucher-hero-alt,
  .voucher-swap .workflow-card,
  .voucher-swap .summary-side-card,
  .voucher-swap .detail-table-card {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 9mm;
  }

  html,
  body {
    background: #fff !important;
    color: #111827 !important;
  }

  .v-app-bar,
  .v-navigation-drawer,
  .theme-switcher,
  .header-shell,
  .sidebar-shell {
    display: none !important;
  }

  .voucher-print-root {
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
    color: #111827 !important;
    font-family: var(--font-sans);
    font-size: 11px;
    line-height: 1.3;
    min-height: auto !important;
  }

  .print-header {
    display: none !important;
    margin: 0 0 10px 0;
    border-bottom: 1px solid #d4d4d8;
    padding-bottom: 8px;
  }

  .print-hidden {
    display: none !important;
  }

  .print-only {
    display: block !important;
    margin: 0 !important;
  }

  .print-sheet {
    position: relative;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 11px;
    overflow: hidden;
  }

  .print-sheet__watermark {
    position: absolute;
    right: 10px;
    bottom: 2px;
    font-size: 40px;
    line-height: 1;
    font-weight: 800;
    color: rgba(17, 24, 39, 0.04);
    letter-spacing: 1px;
    user-select: none;
  }

  .print-sheet__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 8px;
  }

  .print-sheet__eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #4b5563;
  }

  .print-sheet__title {
    margin: 2px 0 0 0;
    font-size: 18px;
    line-height: 1.1;
    color: #111827;
  }

  .print-sheet__badge {
    border: 1px solid #9ca3af;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 10px;
    font-weight: 700;
    color: #1f2937;
  }

  .print-sheet__meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px 10px;
    font-size: 10px;
    margin-bottom: 8px;
    padding: 6px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: #fafafa;
  }

  .print-sheet__totals table,
  .print-sheet__lines table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .print-sheet__totals {
    margin-bottom: 8px;
  }

  .print-sheet__totals th,
  .print-sheet__totals td {
    font-size: 10px;
    border: 1px solid #e5e7eb;
    padding: 4px 6px;
    text-align: left;
  }

  .print-sheet__totals th {
    width: 23%;
    background: #f8fafc;
    color: #374151;
  }

  .print-sheet__lines thead th {
    font-size: 9px;
    text-transform: uppercase;
    border: 1px solid #d1d5db;
    background: #f8fafc;
    color: #374151;
    padding: 4px 5px;
  }

  .print-sheet__lines tbody td {
    font-size: 9.5px;
    border: 1px solid #e5e7eb;
    color: #111827;
    padding: 4px 5px;
    word-break: break-word;
    white-space: normal;
  }

  .print-sheet__obs {
    margin-top: 8px;
    font-size: 10px;
    display: grid;
    gap: 2px;
    border-top: 1px dashed #d1d5db;
    padding-top: 6px;
  }

  .print-sheet__signatures {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .print-sheet__signatures .line {
    border-bottom: 1px solid #6b7280;
    margin-bottom: 4px;
    min-height: 24px;
  }

  .print-sheet__signatures span {
    font-size: 9px;
    color: #374151;
  }

  .print-sheet__footer {
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1px dashed #d1d5db;
    font-size: 9px;
    color: #6b7280;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .print-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .print-brand__logo {
    width: 24px;
    height: 24px;
    border: 1px solid #9ca3af;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    color: #1f2937;
    background: #f8fafc;
  }

  .print-title {
    font-size: 20px;
    font-weight: 800;
    color: #111827;
  }

  .print-meta {
    font-size: 10px;
    color: #374151;
    margin-top: 2px;
  }

  .actions-card {
    display: none !important;
  }

  .v-btn,
  .v-field,
  .v-alert {
    display: none !important;
  }

  .v-table,
  .v-snackbar,
  .v-overlay,
  .v-menu,
  .v-tooltip {
    display: none !important;
  }

  .v-table {
    border: 1px solid #d4d4d8;
  }

  .v-table thead th {
    font-size: 9px !important;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #374151 !important;
    background: #f8fafc !important;
    border-bottom: 1px solid #d1d5db !important;
  }

  .v-table tbody td {
    font-size: 10px !important;
    color: #111827 !important;
    border-bottom: 1px solid #e5e7eb !important;
    padding-top: 6px !important;
    padding-bottom: 6px !important;
  }

  .v-card {
    box-shadow: none !important;
    border: 1px solid #e5e7eb !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .v-container,
  .v-row,
  .v-col {
    max-width: 100% !important;
  }
}
</style>
