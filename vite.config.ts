import path from 'node:path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

function manualChunks(id: string): string | undefined {
	if (!id.includes('node_modules')) return undefined;

	if (id.includes('vuetify')) return 'vuetify-vendor';
	if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) return 'charts-vendor';
	if (id.includes('chart.js') || id.includes('vue-chartjs')) return 'charts-vendor';
	if (id.includes('@mdi/font') || id.includes('@fortawesome') || id.includes('@ant-design') || id.includes('@heroicons') || id.includes('boxicons')) {
		return 'icons-vendor';
	}
	if (id.includes('dayjs') || id.includes('date-fns')) return 'date-vendor';
	if (id.includes('axios')) return 'network-vendor';
	if (id.includes('pinia') || id.includes('vue-router')) return 'vue-state-vendor';
	if (id.includes('core-js')) return 'polyfills-vendor';

	return 'vendor';
}

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks,
			},
		},
	},
});
