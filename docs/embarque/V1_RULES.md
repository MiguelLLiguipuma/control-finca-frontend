# Voucher de Embarque v1.0 - Reglas Congeladas

Fecha de congelamiento: 2026-02-20

## 1. Objetivo del modulo
- Cerrar el flujo operativo cosecha -> embarque -> ratio del dia.
- Registrar un comprobante (voucher) auditable por fecha y detalle de corte.
- Capturar cajas embarcadas y calcular ratios automaticamente.

## 2. Alcance funcional (v1.0)
- Crear voucher con estado inicial BORRADOR.
- Confirmar voucher para cierre operativo del dia.
- Anular voucher sin borrado fisico.
- Consultar vouchers por rango de fechas y estado.
- Imprimir/exportar queda para fase posterior (fuera de backend core).

## 3. Estados permitidos
- BORRADOR: editable.
- CONFIRMADO: no editable.
- ANULADO: no editable, solo historico.

Transiciones permitidas:
- BORRADOR -> CONFIRMADO
- BORRADOR -> ANULADO

No permitidas:
- CONFIRMADO -> BORRADOR
- ANULADO -> BORRADOR
- CONFIRMADO -> ANULADO (v1.0)

## 4. Reglas de calculo
Por linea:
- total_racimos = racimos_buenos + racimos_rechazo
- ratio_comercial_linea = cajas_embarcadas / racimos_buenos (si racimos_buenos > 0, si no 0)
- ratio_operativo_linea = cajas_embarcadas / total_racimos (si total_racimos > 0, si no 0)

Global voucher:
- ratio_comercial_global = SUM(cajas_embarcadas) / SUM(racimos_buenos)
- ratio_operativo_global = SUM(cajas_embarcadas) / SUM(total_racimos)

## 5. Reglas de validacion
- cajas_embarcadas >= 0 (obligatorio en todas las lineas).
- No confirmar voucher sin lineas.
- No confirmar voucher si todas las lineas tienen cajas_embarcadas = 0.
- No permitir cantidades negativas de racimos ni rechazo.
- No permitir editar detalles en estado CONFIRMADO o ANULADO.

## 6. Seguridad
- Usuario operativo se toma del JWT (servidor), no del body.
- Confirmacion con idempotencia por id_local para evitar doble envio.
- Cada cambio de estado genera evento de auditoria.

## 7. Trazabilidad y auditoria
Registrar:
- usuario_creacion_id, usuario_confirmacion_id, usuario_anulacion_id
- created_at, confirmed_at, cancelled_at
- motivo_anulacion (si estado ANULADO)

## 8. Fuera de alcance v1.0
- Reapertura de voucher confirmado.
- Flujo multinivel de aprobacion.
- Integracion contable externa.
- Recalculo historico masivo de ratios.
