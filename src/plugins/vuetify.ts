import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import '@/styles/mdi-subset.css';

export default createVuetify({
	components,
	directives,
	defaults: {
		global: {
			style: {
				fontFamily: 'var(--font-sans)',
			},
		},
	},
	theme: {
		defaultTheme: 'light',
		themes: {
			light: {
				dark: false,
				colors: {
					primary: '#3b82f6',
					secondary: '#64748b',
					background: '#f8fafc',
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
					primary: '#3b82f6',
					secondary: '#94a3b8',
					background: '#0f172a',
					surface: '#1e293b',
					error: '#f87171',
					info: '#60a5fa',
					success: '#4ade80',
					warning: '#fbbf24',
					'on-background': '#f1f5f9',
					'on-surface': '#f1f5f9',
				},
			},
		},
	},
	display: {
		mobileBreakpoint: 'sm',
	},
});
