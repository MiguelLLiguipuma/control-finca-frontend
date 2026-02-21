# Fase 1 - Diseno Tecnico (Voucher Embarque)

## Objetivo de fase
Definir estructura de datos, contratos de API y artefactos TypeScript sin modificar el flujo actual de cosecha en produccion.

## Entidades
1. embarques (header)
2. embarque_detalles (lineas)
3. embarque_auditoria (eventos)

## Integracion con modulo actual
- Fuente de racimos del dia: registro_cosecha.
- En v1.0 no se altera ningun trigger existente de cosecha.
- El modulo embarque solo consume y consolida.

## Endpoints propuestos
- GET /api/embarque/preliquidacion?fecha=YYYY-MM-DD&finca_id=<opcional>
- POST /api/embarque/vouchers
- PUT /api/embarque/vouchers/:id
- POST /api/embarque/vouchers/:id/confirmar
- POST /api/embarque/vouchers/:id/anular
- GET /api/embarque/vouchers/:id
- GET /api/embarque/vouchers?fecha_desde=...&fecha_hasta=...&estado=...

## Criterios de aceptacion fase 1
- SQL base definido y revisable.
- Tipos TypeScript definidos para request/response.
- Enumeraciones de estado y modelo de ratio cerrados.
