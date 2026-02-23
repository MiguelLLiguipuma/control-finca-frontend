<template>
  <v-container class="pa-4 pa-md-6 bg-background min-h-screen">
    <v-row justify="center">
      <v-col cols="12" xl="11">
        <v-card class="rounded-xl mb-5" border>
          <v-card-text class="d-flex flex-wrap align-center ga-4 py-5">
            <v-avatar size="56" color="primary" variant="tonal">
              <v-icon size="30">mdi-account-group-outline</v-icon>
            </v-avatar>

            <div class="flex-grow-1">
              <h1 class="text-h4 font-weight-black text-high-emphasis">Gestion de Usuarios</h1>
              <div class="text-body-1 text-medium-emphasis">
                Alta de usuarios, asignacion de rol y control de acceso al sistema.
              </div>
            </div>

            <div class="d-flex align-center ga-2">
              <v-btn
                variant="tonal"
                color="secondary"
                prepend-icon="mdi-refresh"
                :loading="usuarioStore.loading"
                @click="cargarDatos"
              >
                Actualizar
              </v-btn>
              <v-btn
                color="primary"
                prepend-icon="mdi-account-plus"
                :disabled="!canManage"
                @click="abrirCrear"
              >
                Nuevo Usuario
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <v-row dense class="mb-4">
          <v-col cols="12" sm="4">
            <v-card class="rounded-xl" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Total Usuarios</div>
                <div class="text-h4 font-weight-black">{{ totalUsuarios }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="rounded-xl" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Activos</div>
                <div class="text-h4 font-weight-black text-success">{{ activos }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="4">
            <v-card class="rounded-xl" border>
              <v-card-text>
                <div class="text-caption text-medium-emphasis">Inactivos</div>
                <div class="text-h4 font-weight-black text-warning">{{ inactivos }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-card class="rounded-xl" border>
          <v-card-text class="pb-2">
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.trim="search"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  clearable
                  placeholder="Buscar por nombre o email"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filtroRol"
                  :items="rolItems"
                  item-title="label"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  label="Rol"
                />
              </v-col>
              <v-col cols="12" md="3">
                <v-select
                  v-model="filtroEstado"
                  :items="estadoItems"
                  item-title="label"
                  item-value="value"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  label="Estado"
                />
              </v-col>
            </v-row>
          </v-card-text>

          <v-data-table
            :headers="headers"
            :items="usuariosFiltrados"
            :loading="usuarioStore.loading"
            loading-text="Cargando usuarios..."
            hover
          >
            <template #item.nombre="{ item }">
              <div class="font-weight-bold">{{ item.nombre }}</div>
              <div class="text-caption text-medium-emphasis">ID #{{ item.id }}</div>
            </template>

            <template #item.email="{ value }">
              <span class="text-medium-emphasis">{{ value }}</span>
            </template>

            <template #item.rol="{ value }">
              <v-chip size="small" color="secondary" variant="tonal" class="font-weight-bold">
                {{ value || 'Sin rol' }}
              </v-chip>
            </template>

            <template #item.activo="{ value }">
              <v-chip
                size="small"
                :color="value ? 'success' : 'warning'"
                variant="tonal"
              >
                {{ value ? 'Activo' : 'Inactivo' }}
              </v-chip>
            </template>

            <template #item.acciones="{ item }">
              <div class="d-flex justify-end ga-2">
                <v-btn size="small" variant="text" color="secondary" :disabled="!canManage" @click="abrirEditar(item)">
                  Editar
                </v-btn>
                <v-btn
                  size="small"
                  variant="text"
                  :color="item.activo ? 'warning' : 'success'"
                  :disabled="!canManage"
                  @click="toggleActivo(item)"
                >
                  {{ item.activo ? 'Desactivar' : 'Activar' }}
                </v-btn>
                <v-btn size="small" variant="text" color="error" :disabled="!canManage" @click="eliminar(item)">
                  Eliminar
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="620" persistent>
      <v-card class="rounded-xl">
        <v-card-title class="text-h5 font-weight-black py-4">
          {{ editandoId ? 'Editar Usuario' : 'Nuevo Usuario' }}
        </v-card-title>
        <v-divider />
        <v-card-text class="pt-5">
          <v-form ref="formRef" v-model="isValid">
            <v-row dense>
              <v-col cols="12">
                <label class="custom-label">Nombre</label>
                <v-text-field
                  v-model.trim="form.nombre"
                  variant="outlined"
                  density="comfortable"
                  :rules="nombreRules"
                  prepend-inner-icon="mdi-account-outline"
                />
              </v-col>
              <v-col cols="12">
                <label class="custom-label">Email</label>
                <v-text-field
                  v-model.trim="form.email"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  :rules="emailRules"
                  prepend-inner-icon="mdi-email-outline"
                />
              </v-col>
              <v-col cols="12" md="6">
                <label class="custom-label">Rol</label>
                <v-select
                  v-model="form.rol_id"
                  :items="usuarioStore.roles"
                  item-title="nombre"
                  item-value="id"
                  variant="outlined"
                  density="comfortable"
                  :rules="rolRules"
                  prepend-inner-icon="mdi-shield-account-outline"
                />
              </v-col>
              <v-col cols="12" md="6" class="d-flex align-end">
                <v-switch
                  v-model="form.activo"
                  color="success"
                  inset
                  hide-details
                  label="Usuario activo"
                />
              </v-col>
              <v-col cols="12">
                <label class="custom-label">
                  {{ editandoId ? 'Nueva Contraseña (opcional)' : 'Contraseña' }}
                </label>
                <v-text-field
                  v-model="form.password"
                  type="password"
                  variant="outlined"
                  density="comfortable"
                  :rules="passwordRules"
                  prepend-inner-icon="mdi-lock-outline"
                  autocomplete="new-password"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="cerrarDialogo">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="usuarioStore.loading"
            :disabled="!isValid || usuarioStore.loading"
            @click="guardar"
          >
            {{ editandoId ? 'Guardar Cambios' : 'Crear Usuario' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useUsuarioStore, type Usuario, type UsuarioPayload } from '@/stores/usuarioStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { useUIStore } from '@/stores/uiStore';

type EstadoFiltro = 'all' | 'active' | 'inactive';

const usuarioStore = useUsuarioStore();
const authStore = useAuthStore();
const uiStore = useUIStore();

const dialog = ref(false);
const editandoId = ref<number | null>(null);
const formRef = ref<{ validate: () => Promise<{ valid: boolean }>; resetValidation: () => void } | null>(null);
const isValid = ref(false);
const search = ref('');
const filtroRol = ref<string>('all');
const filtroEstado = ref<EstadoFiltro>('all');

const form = ref({
  nombre: '',
  email: '',
  rol_id: 0,
  activo: true,
  password: '',
});

const headers = [
  { title: 'USUARIO', key: 'nombre', align: 'start' as const },
  { title: 'EMAIL', key: 'email', align: 'start' as const },
  { title: 'ROL', key: 'rol', align: 'start' as const },
  { title: 'ESTADO', key: 'activo', align: 'center' as const },
  { title: 'ACCIONES', key: 'acciones', align: 'end' as const, sortable: false },
];

const estadoItems = [
  { label: 'Todos', value: 'all' as const },
  { label: 'Activos', value: 'active' as const },
  { label: 'Inactivos', value: 'inactive' as const },
];

const canManage = computed(() => authStore.can('action.admin.manage'));
const totalUsuarios = computed(() => usuarioStore.usuarios.length);
const activos = computed(() => usuarioStore.usuarios.filter((u) => u.activo).length);
const inactivos = computed(() => totalUsuarios.value - activos.value);

const rolItems = computed(() => [
  { label: 'Todos', value: 'all' },
  ...usuarioStore.roles.map((r) => ({ label: r.nombre, value: r.nombre })),
]);

const usuariosFiltrados = computed(() => {
  const q = search.value.trim().toLowerCase();
  return usuarioStore.usuarios.filter((u) => {
    if (filtroEstado.value === 'active' && !u.activo) return false;
    if (filtroEstado.value === 'inactive' && u.activo) return false;
    if (filtroRol.value !== 'all' && String(u.rol || '').toUpperCase() !== filtroRol.value.toUpperCase()) return false;
    if (!q) return true;
    return [u.nombre, u.email].join(' ').toLowerCase().includes(q);
  });
});

const nombreRules = [
  (v: string) => !!v?.trim() || 'Nombre requerido',
  (v: string) => v.trim().length >= 3 || 'Minimo 3 caracteres',
];

const emailRules = [
  (v: string) => !!v?.trim() || 'Email requerido',
  (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email invalido',
];

const rolRules = [(v: number) => Number(v) > 0 || 'Seleccione un rol'];

const passwordRules = computed(() => [
  (v: string) =>
    editandoId.value
      ? !v || v.length >= 8 || 'Minimo 8 caracteres'
      : !!v || 'Contraseña requerida',
  (v: string) =>
    editandoId.value
      ? !v || v.length >= 8 || 'Minimo 8 caracteres'
      : v.length >= 8 || 'Minimo 8 caracteres',
]);

function resetForm() {
  form.value = {
    nombre: '',
    email: '',
    rol_id: 0,
    activo: true,
    password: '',
  };
}

function abrirCrear() {
  if (!canManage.value) return uiStore.showWarning('No tiene permisos para crear usuarios.');
  editandoId.value = null;
  resetForm();
  dialog.value = true;
}

function abrirEditar(item: Usuario) {
  if (!canManage.value) return uiStore.showWarning('No tiene permisos para editar usuarios.');
  editandoId.value = item.id;
  form.value = {
    nombre: item.nombre,
    email: item.email,
    rol_id: Number(item.rol_id || 0),
    activo: Boolean(item.activo),
    password: '',
  };
  dialog.value = true;
}

function cerrarDialogo() {
  dialog.value = false;
  editandoId.value = null;
  resetForm();
  formRef.value?.resetValidation();
}

function toPayload(): UsuarioPayload {
  const payload: UsuarioPayload = {
    nombre: form.value.nombre.trim(),
    email: form.value.email.trim().toLowerCase(),
    rol_id: Number(form.value.rol_id),
    activo: Boolean(form.value.activo),
  };
  const pass = form.value.password.trim();
  if (pass) payload.password = pass;
  return payload;
}

async function guardar() {
  const validation = await formRef.value?.validate();
  if (!validation?.valid) return;

  try {
    const payload = toPayload();
    if (editandoId.value) {
      await usuarioStore.actualizarUsuario(editandoId.value, payload);
      uiStore.showSuccess('Usuario actualizado correctamente.');
    } else {
      await usuarioStore.crearUsuario(payload);
      uiStore.showSuccess('Usuario creado correctamente.');
    }
    cerrarDialogo();
  } catch {
    uiStore.showError(usuarioStore.error || 'No se pudo guardar el usuario.');
  }
}

async function toggleActivo(item: Usuario) {
  if (!canManage.value) return uiStore.showWarning('No tiene permisos para actualizar usuarios.');
  try {
    await usuarioStore.actualizarUsuario(item.id, {
      nombre: item.nombre,
      email: item.email,
      rol_id: Number(item.rol_id || 0),
      activo: !item.activo,
    });
    uiStore.showSuccess(`Usuario ${item.activo ? 'desactivado' : 'activado'} correctamente.`);
  } catch {
    uiStore.showError(usuarioStore.error || 'No se pudo cambiar estado del usuario.');
  }
}

async function eliminar(item: Usuario) {
  if (!canManage.value) return uiStore.showWarning('No tiene permisos para eliminar usuarios.');
  if (!confirm(`Eliminar usuario ${item.nombre}?`)) return;
  try {
    await usuarioStore.eliminarUsuario(item.id);
    uiStore.showSuccess('Usuario eliminado correctamente.');
  } catch {
    uiStore.showError(usuarioStore.error || 'No se pudo eliminar el usuario.');
  }
}

async function cargarDatos() {
  try {
    await Promise.all([usuarioStore.obtenerRoles(), usuarioStore.obtenerUsuarios()]);
  } catch {
    uiStore.showError(usuarioStore.error || 'No se pudieron cargar los datos de usuarios.');
  }
}

onMounted(async () => {
  await cargarDatos();
});
</script>

<style scoped>
.custom-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  margin-bottom: 6px;
  color: rgba(var(--v-theme-on-surface), 0.65);
  text-transform: uppercase;
}
</style>
