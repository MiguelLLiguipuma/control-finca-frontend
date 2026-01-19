// main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
// Material Icons (o cualquier otro icon set que quieras usar)
import '@mdi/font/css/materialdesignicons.css';
// Importa los estilos y componentes de Vuetify 3
import vuetify from './plugins/vuetify';
import VueApexCharts from 'vue3-apexcharts';

const pinia = createPinia();

const app = createApp(App);
app.use(router);
app.use(pinia);
app.use(vuetify);
app.use(VueApexCharts);
app.mount('#app');
