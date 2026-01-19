<template>
  <v-container fluid class="fill-height login-bg pa-0">
    <v-row no-gutters class="fill-height">
      <v-col
        cols="12"
        md="7"
        lg="8"
        class="d-none d-md-flex align-center justify-center bg-primary-lighten-5 relative"
      >
        <div class="text-center pa-12">
          <v-icon size="120" color="primary" class="mb-6">mdi-sprout-outline</v-icon>
          <h1 class="text-h3 font-weight-black text-slate-800 mb-4">
            ControlFinca
          </h1>
          <p class="text-h6 text-slate-600 font-weight-regular">
            Gestión inteligente de enfunde y reportes agrícolas.
          </p>
        </div>
      </v-col>

      <v-col
        cols="12"
        md="5"
        lg="4"
        class="d-flex align-center justify-center bg-white"
      >
        <v-card flat width="100%" max-width="450" class="pa-8 pa-md-12">
          <div class="mb-10 text-center text-md-left">
            <h2 class="text-h4 font-weight-black text-slate-900 mb-2">Bienvenido</h2>
            <p class="text-body-1 text-slate-500">Ingresa tus credenciales para continuar</p>
          </div>

          <v-form @submit.prevent="handleLogin" ref="loginForm">
            <div class="mb-4">
              <label class="text-subtitle-2 font-weight-bold text-slate-700 d-block mb-2">Correo Electrónico</label>
              <v-text-field
                v-model="email"
                placeholder="ejemplo@correo.com"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                color="primary"
                rounded="lg"
                :rules="[v => !!v || 'El correo es obligatorio']"
                hide-details="auto"
              ></v-text-field>
            </div>

            <div class="mb-6">
              <div class="d-flex justify-space-between align-center mb-2">
                <label class="text-subtitle-2 font-weight-bold text-slate-700">Contraseña</label>
                <a href="#" class="text-caption text-primary font-weight-bold text-decoration-none">¿Olvidaste tu contraseña?</a>
              </div>
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                variant="outlined"
                color="primary"
                rounded="lg"
                @click:append-inner="showPassword = !showPassword"
                :rules="[v => !!v || 'La contraseña es obligatoria']"
                hide-details="auto"
              ></v-text-field>
            </div>

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-6 rounded-lg"
              closable
            >
              {{ errorMessage }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              size="large"
              block
              rounded="lg"
              class="text-none font-weight-bold"
              :loading="loading"
              elevation="0"
            >
              Iniciar Sesión
            </v-btn>
          </v-form>

          <div class="mt-8 text-center text-slate-500 text-body-2">
            ¿No tienes una cuenta? <span class="text-primary font-weight-bold cursor-pointer">Contacta al administrador</span>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth/authStore';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
  if (!email.value || !password.value) return;

  loading.value = true;
  errorMessage.value = '';

  const result = await authStore.login({
    email: email.value,
    password: password.value
  });

  if (result.success) {
    // Redirigir al dashboard tras login exitoso
    router.push('/reportes');
  } else {
    errorMessage.value = result.message || 'Error al iniciar sesión';
  }
  loading.value = false;
};
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%);
  position: relative;
  overflow: hidden;
}

.login-bg::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%230ea5e9' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
  opacity: 0.4;
}
</style>