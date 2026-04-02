# Guia Tipografica Unificada

Esta guia define que clase tipografica usar en cada contexto de UI para mantener consistencia visual en todo el sistema.

## Mapeo por Contexto

| Contexto | Uso | Clase Vuetify | Regla |
|---|---|---|---|
| Pagina / modulo | Titulo principal de vista | `text-h3` (desktop), `text-h4` (mobile) | Un solo titulo principal por pantalla |
| Seccion interna | Titulo de bloque o card | `text-h5` | Mantener jerarquia debajo del titulo de pagina |
| Sub-seccion | Encabezado menor | `text-h6` | Para agrupar filtros, tablas o paneles |
| KPI principal | Numero destacado | `text-h3` o `text-h4` + `font-weight-black` | Usar en tarjetas de metricas |
| KPI etiqueta | Label de metrica | `text-overline` | Siempre en mayusculas y corto |
| Texto normal | Descripcion general | `text-body-1` | Texto base de lectura |
| Texto secundario | Ayuda, contexto, detalle | `text-body-2` | Menor prioridad visual |
| Labels de formulario | Nombre de campo | `text-caption` + `font-weight-bold` | Consistente en formularios |
| Header de tabla | Cabecera de columnas | `text-overline` + `font-weight-black` | Corto, claro y estable |
| Celda tabla (dato) | Valor principal | `text-body-2` | Alinear densidad de tabla |
| Celda tabla (dato clave) | Identificador importante | `text-body-1` + `font-weight-bold` | Solo columnas criticas |
| Chips / badges | Estado, tags | `text-caption` + `font-weight-bold` | Evitar tamaños grandes |
| Notas legales / pie | Texto auxiliar | `text-caption` | Nunca competir con contenido principal |

## Reglas Rapidas

1. No usar `font-size` inline para texto funcional de UI.
2. Priorizar clases `text-*` sobre estilos manuales.
3. Limitar `font-weight-black` a titulos y KPIs.
4. No mezclar familias tipograficas fuera de `--font-sans` y `--font-mono`.
5. Usar `font-mono` solo para codigos, RUC, IDs o valores tecnicos.

## Patrones Recomendados

### Dashboard
- Titulo: `text-h3`
- Subtitulo: `text-body-2`
- KPI valor: `text-h3 font-weight-black`
- KPI label: `text-overline`

### Formularios
- Titulo del formulario: `text-h5`
- Label de campo: `text-caption font-weight-bold`
- Hint / ayuda: `text-body-2`
- Mensaje de error: `text-caption` con color `error`

### Tablas Operativas
- Header: `text-overline font-weight-black`
- Celdas normales: `text-body-2`
- Celdas clave (nombre, estado): `text-body-1 font-weight-bold`
- Metadatos secundarios: `text-caption`

### Reportes y Voucher
- Titulo documento: `text-h4` o `text-h5` (segun prioridad)
- Datos numericos clave: `text-h4 font-weight-black`
- Etiquetas de soporte: `text-caption` o `text-overline`
- Bloques informativos: `text-body-1` / `text-body-2`

## Tokens Globales Relacionados

- Archivo de familias: `src/styles/typography.css`
- Archivo de escala: `src/styles/type-scale.css`
- Aplicacion global: `src/main.js`

