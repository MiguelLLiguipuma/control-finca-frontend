<template>
  <v-container fluid class="fill-height login-shell pa-0">
    <div class="login-bg-layer"></div>
    <v-row no-gutters class="fill-height align-stretch position-relative">
      <v-col cols="12" md="6" lg="7" class="d-none d-md-flex">
        <section class="hero-panel d-flex flex-column justify-space-between auth-enter-right">
          <div>
            <div class="brand-badge">
              <v-icon size="22">mdi-sprout-outline</v-icon>
              <span>ControlFinca</span>
            </div>
            <h1 class="hero-title mt-8">Gestion de campo con enfoque operativo y sanitario</h1>
            <p class="hero-copy mt-5">
              Centraliza enfunde, cosecha, voucher y alertas de Sigatoka en un solo panel.
            </p>
          </div>

          <div class="hero-kpis">
            <div class="hero-kpi-card">
              <div class="kpi-label">Productividad</div>
              <div class="kpi-value">Dashboard en tiempo real</div>
            </div>
            <div class="hero-kpi-card">
              <div class="kpi-label">Sanidad</div>
              <div class="kpi-value">Semaforo por dias sin fumigar</div>
            </div>
          </div>
        </section>
      </v-col>

      <v-col cols="12" md="6" lg="5" class="d-flex align-center justify-center px-4 px-sm-8 px-md-10">
        <v-card class="auth-card pa-5 pa-sm-8 pa-md-10 auth-enter-up" elevation="0" rounded="xl" width="100%" max-width="520">
          <div class="mb-7">
            <h2 class="auth-title">{{ isRegisterMode ? 'Crear Cuenta' : 'Iniciar Sesion' }}</h2>
            <p class="auth-subtitle">
              {{ isRegisterMode ? 'Registra un nuevo usuario para operar en campo.' : 'Ingresa con tus credenciales para continuar.' }}
            </p>
          </div>

          <v-form class="auth-stagger" @submit.prevent="isRegisterMode ? handleRegister() : handleLogin()">
            <div v-if="isRegisterMode" class="mb-4">
              <label class="field-label">Nombre</label>
              <v-text-field
                id="register-name"
                v-model="nombre"
                placeholder="Tu nombre completo"
                prepend-inner-icon="mdi-account-outline"
                variant="outlined"
                color="primary"
                rounded="lg"
                density="comfortable"
                autocomplete="name"
                :rules="[v => !!v || 'El nombre es obligatorio']"
                hide-details="auto"
              />
            </div>

            <div class="mb-4">
              <label class="field-label">Correo Electronico</label>
              <v-text-field
                id="auth-email"
                v-model="email"
                placeholder="ejemplo@correo.com"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                color="primary"
                rounded="lg"
                density="comfortable"
                type="email"
                autocomplete="email"
                :rules="[v => !!v || 'El correo es obligatorio']"
                hide-details="auto"
              />
            </div>

            <div class="mb-4">
              <label class="field-label">Contrasena</label>
              <v-text-field
                id="auth-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                variant="outlined"
                color="primary"
                rounded="lg"
                density="comfortable"
                :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                autocomplete="current-password"
                @click:append-inner="showPassword = !showPassword"
                :rules="[v => !!v || 'La contrasena es obligatoria']"
                hide-details="auto"
              />
            </div>

            <div v-if="isRegisterMode" class="mb-6">
              <label class="field-label">Confirmar Contrasena</label>
              <v-text-field
                id="register-confirm-password"
                v-model="confirmPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                prepend-inner-icon="mdi-lock-check-outline"
                variant="outlined"
                color="primary"
                rounded="lg"
                density="comfortable"
                autocomplete="new-password"
                :rules="[v => !!v || 'Confirma la contrasena']"
                hide-details="auto"
              />
            </div>

            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-4"
              rounded="lg"
              closable
              role="alert"
              aria-live="assertive"
            >
              {{ errorMessage }}
            </v-alert>
            <v-alert
              v-if="successMessage"
              type="success"
              variant="tonal"
              density="compact"
              class="mb-4"
              rounded="lg"
              closable
              role="status"
              aria-live="polite"
            >
              {{ successMessage }}
            </v-alert>

            <v-btn
              type="submit"
              color="primary"
              block
              rounded="lg"
              class="auth-submit text-none font-weight-bold"
              size="x-large"
              :loading="loading"
              :aria-busy="loading"
            >
              {{ isRegisterMode ? 'Crear Usuario' : 'Entrar al Sistema' }}
            </v-btn>

            <template v-if="!isRegisterMode">
              <div class="d-flex align-center my-5">
                <v-divider />
                <span class="mx-3 text-caption text-medium-emphasis">o</span>
                <v-divider />
              </div>
              <div v-if="googleClientIdValido" ref="googleButtonRef" class="google-btn-wrap"></div>
              <div v-else class="text-caption text-center text-medium-emphasis" role="status" aria-live="polite">
                Login con Google no configurado.
              </div>
            </template>
          </v-form>

          <div class="mt-7 text-center text-body-2 auth-switch auth-enter-fade">
            <span v-if="!isRegisterMode">
              No tienes cuenta?
              <button class="switch-btn" type="button" @click="toggleMode(true)">Registrate</button>
            </span>
            <span v-else>
              Ya tienes cuenta?
              <button class="switch-btn" type="button" @click="toggleMode(false)">Inicia sesion</button>
            </span>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth/authStore';
import api from '@/services/api';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void | Promise<void>;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      text?: string;
      shape?: string;
      width?: number;
    },
  ): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleIdentityApi;
      };
    };
  }
}

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const nombre = ref('');
const confirmPassword = ref('');
const isRegisterMode = ref(false);
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const successMessage = ref('');
const googleButtonRef = ref<HTMLElement | null>(null);
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const googleClientIdValido = computed(() => {
  const raw = String(googleClientId || '').trim();
  if (!raw) return false;
  if (/tu_client_id_google/i.test(raw)) return false;
  return raw.endsWith('.apps.googleusercontent.com');
});

const loadGoogleScript = () =>
  new Promise<boolean>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(true);
    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => reject(new Error('google_script_error')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('google_script_error'));
    document.head.appendChild(script);
  });

const toggleMode = (registerMode: boolean) => {
  isRegisterMode.value = registerMode;
  errorMessage.value = '';
  successMessage.value = '';
};

const handleGoogleCredential = async (response: GoogleCredentialResponse) => {
  const idToken = String(response?.credential || '').trim();
  if (!idToken) {
    errorMessage.value = 'No se recibió credencial de Google';
    return;
  }
  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  const result = await authStore.loginWithGoogle(idToken);
  if (result.success) {
    router.push('/reportes');
  } else {
    errorMessage.value = result.message || 'No se pudo autenticar con Google';
  }
  loading.value = false;
};

const initGoogleButton = async () => {
  if (!googleClientIdValido.value || isRegisterMode.value) return;
  await nextTick();
  if (!googleButtonRef.value) return;

  try {
    await loadGoogleScript();
    const googleApi = window.google?.accounts?.id;
    if (!googleApi) return;
    googleButtonRef.value.innerHTML = '';
    googleApi.initialize({
      client_id: String(googleClientId),
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    googleApi.renderButton(googleButtonRef.value, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: Math.min(window.innerWidth - 96, 360),
    });
  } catch {
    errorMessage.value = 'No se pudo cargar autenticación con Google';
  }
};

const handleLogin = async () => {
  if (!email.value || !password.value) return;

  loading.value = true;
  errorMessage.value = '';

  const result = await authStore.login({
    email: email.value,
    password: password.value
  });

  if (result.success) {
    router.push('/reportes');
  } else {
    errorMessage.value = result.message || 'Error al iniciar sesión';
  }
  loading.value = false;
};

const handleRegister = async () => {
  if (!nombre.value || !email.value || !password.value || !confirmPassword.value) {
    errorMessage.value = 'Completa todos los campos para registrarte';
    return;
  }
  if (password.value.length < 8) {
    errorMessage.value = 'La contraseña debe tener al menos 8 caracteres';
    return;
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Las contraseñas no coinciden';
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    const { data } = await api.post('/auth/register', {
      nombre: nombre.value,
      email: email.value,
      password: password.value,
    });
    successMessage.value = data?.message || 'Cuenta creada correctamente';
    isRegisterMode.value = false;
    password.value = '';
    confirmPassword.value = '';
  } catch (error: unknown) {
    const e = error as { response?: { data?: { message?: string; error?: string } } };
    errorMessage.value =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      'No se pudo registrar la cuenta';
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await initGoogleButton();
});

watch(isRegisterMode, async (mode) => {
  if (!mode) {
    await initGoogleButton();
  }
});
</script>

<style scoped>
.login-shell {
  position: relative;
  background: rgb(var(--v-theme-surface));
  overflow: hidden;
}

.login-bg-layer {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 18%, rgba(34, 197, 94, 0.16), transparent 34%),
    radial-gradient(circle at 82% 80%, rgba(59, 130, 246, 0.13), transparent 32%),
    linear-gradient(130deg, rgba(15, 23, 42, 0.03) 0%, rgba(2, 132, 199, 0.04) 100%);
  pointer-events: none;
}

.hero-panel {
  width: 100%;
  margin: 28px;
  padding: 48px;
  border-radius: var(--auth-radius-xl);
  color: #f8fafc;
  background: linear-gradient(160deg, rgba(6, 78, 59, 0.96), rgba(3, 105, 161, 0.92));
  box-shadow: var(--auth-shadow-strong);
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  font-weight: 700;
  letter-spacing: 0.4px;
  background: rgba(241, 245, 249, 0.14);
  border: 1px solid rgba(241, 245, 249, 0.34);
}

.hero-title {
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1.08;
  font-weight: 900;
  max-width: 560px;
}

.hero-copy {
  font-size: 1.08rem;
  line-height: 1.6;
  max-width: 560px;
  color: rgba(241, 245, 249, 0.92);
}

.hero-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.hero-kpi-card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(241, 245, 249, 0.1);
  border: 1px solid rgba(241, 245, 249, 0.2);
}

.kpi-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.9px;
  color: rgba(241, 245, 249, 0.8);
}

.kpi-value {
  margin-top: 4px;
  font-size: 1rem;
  font-weight: 700;
}

.auth-card {
  border: 1px solid rgba(var(--v-border-color), 0.22);
  background: rgba(var(--v-theme-surface), 0.94);
  backdrop-filter: blur(var(--auth-card-blur));
  box-shadow: var(--auth-shadow-soft);
}

.auth-title {
  font-size: clamp(1.75rem, 3.5vw, 2.2rem);
  line-height: 1.1;
  font-weight: 900;
  color: rgb(var(--v-theme-on-surface));
}

.auth-subtitle {
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
  color: rgba(var(--v-theme-on-surface), 0.88);
}

.auth-submit {
  min-height: 52px;
  letter-spacing: 0.2px;
  box-shadow: 0 12px 25px rgba(var(--v-theme-primary), 0.25) !important;
}

.google-btn-wrap {
  display: flex;
  justify-content: center;
}

.auth-switch {
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.switch-btn {
  margin-left: 6px;
  border: 0;
  background: transparent;
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 960px) {
  .auth-card {
    margin: 24px 0;
  }
}

@media (max-width: 600px) {
  .auth-card {
    padding: 24px !important;
    border-radius: var(--auth-radius-lg) !important;
  }

  .auth-submit {
    min-height: 48px;
  }
}

:global(.v-theme--dark) .auth-card {
  background: rgba(20, 27, 39, 0.88);
  border-color: rgba(148, 163, 184, 0.2);
  box-shadow: var(--auth-shadow-soft);
}

:global(.v-theme--dark) .login-bg-layer {
  background:
    radial-gradient(circle at 12% 18%, rgba(34, 197, 94, 0.18), transparent 34%),
    radial-gradient(circle at 82% 80%, rgba(59, 130, 246, 0.2), transparent 32%),
    linear-gradient(130deg, rgba(15, 23, 42, 0.55) 0%, rgba(2, 132, 199, 0.12) 100%);
}
</style>
