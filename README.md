# ControlFinca Frontend

Aplicacion web para operacion agricola de banano:
- enfunde
- cosecha
- prediccion
- voucher de embarque
- alertas y auditoria

El objetivo es que cada empresa/finca tenga control diario de su produccion con trazabilidad.

## Para quien es este sistema
- Operador: registra datos diarios (enfunde, cosecha, embarque).
- Supervisor: valida, confirma y revisa alertas.
- Administrador: configura empresas, fincas, usuarios y permisos.

## Documentacion para usuario sin experiencia
- Guia principal: `docs/GUIA_USUARIO.md`
- Glosario simple: `docs/GLOSARIO_SIMPLE.md`

## Modulos principales (vista de negocio)
- `Dashboard`: resumen operativo (produccion, tendencias, alertas).
- `Registro Enfunde`: ingreso de fundas por semana/cinta.
- `Liquidacion Cosecha`: registro de racimos buenos y rechazo.
- `Prediccion Cosecha`: estimacion de proximos embarques.
- `Voucher Embarque`: consolidacion final de cajas y ratios.
- `Centro de Alertas`: riesgos operativos y sanitarios.
- `Auditoria`: trazabilidad de cambios y acciones.
- `Gestion Calendario`: definicion anual de semanas/cintas.
- `Gestion Empresas/Fincas/Usuarios`: administracion del SaaS.

## Mapa tecnico rapido
- Frontend: Vue 3 + Pinia + Vuetify
- Stores: `src/stores`
- Servicios HTTP: `src/services`
- Dominio de calculo: `src/domain`
- Vistas: `src/views`
- Componentes UI: `src/components`

## Comandos
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Nota importante
La logica critica de negocio y seguridad debe vivir en backend.
El frontend guia al usuario, pero no debe ser la unica barrera de validacion.
