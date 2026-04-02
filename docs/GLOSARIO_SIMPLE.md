# Glosario Simple - ControlFinca

## Terminos de negocio
- **Enfunde**: proceso de colocar funda al racimo para su desarrollo.
- **Cinta**: identificador de lote/semana de manejo en campo.
- **Semana de enfunde**: semana en la que se registro el enfunde.
- **Semana de corte**: semana estimada/real de cosecha.
- **Edad de cinta**: semanas transcurridas entre enfunde y semana actual.
- **Corte ideal**: rango recomendado de corte (ejemplo 12-13 semanas).
- **Fruta lista**: fruta que ya entro en rango operativo de corte.
- **Saldo en campo**: cantidad disponible aun no cosechada.
- **Racimos buenos**: racimos aptos para proceso comercial.
- **Rechazo**: racimos no aptos o descartados.
- **Total racimos**: buenos + rechazo.
- **Cajas embarcadas**: cajas finales despachadas.
- **Ratio comercial**: cajas / racimos buenos.
- **Ratio operativo**: cajas / total racimos.

## Terminos del sistema
- **Dashboard**: pantalla de resumen general.
- **KPI**: indicador clave (numero rapido para decidir).
- **Voucher**: documento operativo de cierre de embarque.
- **Borrador**: voucher editable aun no confirmado.
- **Confirmado**: voucher cerrado oficialmente.
- **Anulado**: voucher invalidado por motivo registrado.
- **Alerta**: aviso automatico de riesgo o comportamiento fuera de rango.
- **Auditoria**: historial de acciones realizadas por usuarios.

## Terminos de acceso y seguridad
- **Rol**: tipo de usuario (admin, supervisor, operador).
- **Permiso**: accion permitida para un rol.
- **Sesion**: acceso activo del usuario.
- **Token**: credencial de seguridad temporal.
- **Multiempresa**: cada empresa ve solo sus datos.
- **Fuga de datos**: acceso accidental a datos de otra empresa (debe evitarse).

## Para interpretar mensajes comunes
- **403**: no autorizado por permisos.
- **409**: conflicto de estado (ejemplo, registro duplicado o idempotencia).
- **500**: error interno del servidor.
- **503**: servicio temporalmente saturado/no disponible.
