import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path'; // 👈 Importar 'path' para definir alias

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'), // 👈 Definir '@' como alias de 'src'
		},
	},
});
