// src/plugins/vuetify.js
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// Importar iconos (asegúrate de tener instalado @mdi/font)
import '@mdi/font/css/materialdesignicons.css';

export default createVuetify({
	components,
	directives,
	theme: {
		// Cambiamos el defaultTheme a 'light' pero definimos bien ambos
		defaultTheme: 'light',
		themes: {
			light: {
				dark: false,
				colors: {
					primary: '#3b82f6', // Azul vibrante (sustituye al verde pálido)
					secondary: '#64748b', // Slate 500
					background: '#f8fafc', // Slate 50
					surface: '#ffffff',
					error: '#ef4444',
					info: '#3b82f6',
					success: '#22c55e',
					warning: '#f59e0b',
				},
			},
			dark: {
				dark: true,
				colors: {
					primary: '#3b82f6', // Mantenemos el mismo azul para identidad
					secondary: '#94a3b8', // Slate 400
					background: '#0f172a', // Slate 950 (Fondo profundo)
					surface: '#1e293b', // Slate 800 (Tarjetas y menús)
					error: '#f87171',
					info: '#60a5fa',
					success: '#4ade80',
					warning: '#fbbf24',
					'on-background': '#f1f5f9', // Texto claro sobre fondo oscuro
					'on-surface': '#f1f5f9', // Texto claro sobre tarjetas
				},
			},
		},
	},
	// Opcional: Mantener la consistencia de la fuente
	display: {
		mobileBreakpoint: 'sm',
	},
});
