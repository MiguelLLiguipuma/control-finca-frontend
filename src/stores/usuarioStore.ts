import { defineStore } from 'pinia';
import api from '@/services/api';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  creado_en?: string;
  rol_id?: number | null;
  rol?: string | null;
}

export interface RolItem {
  id: number;
  nombre: string;
}

export interface UsuarioPayload {
  nombre: string;
  email: string;
  password?: string;
  activo?: boolean;
  rol_id?: number;
}

interface UsuarioState {
  usuarios: Usuario[];
  roles: RolItem[];
  loading: boolean;
  error: string | null;
}

export const useUsuarioStore = defineStore('usuario', {
  state: (): UsuarioState => ({
    usuarios: [],
    roles: [],
    loading: false,
    error: null,
  }),

  actions: {
    async obtenerUsuarios() {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.get<Usuario[]>('/usuarios');
        this.usuarios = data;
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.error || 'No se pudieron cargar usuarios';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async obtenerRoles() {
      this.error = null;
      try {
        const { data } = await api.get<RolItem[]>('/roles');
        this.roles = data;
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.error || 'No se pudieron cargar roles';
        throw e;
      }
    },

    async crearUsuario(payload: UsuarioPayload) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post<Usuario>('/usuarios', payload);
        await this.obtenerUsuarios();
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.error || 'No se pudo crear el usuario';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async actualizarUsuario(id: number, payload: UsuarioPayload) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.put<Usuario>(`/usuarios/${id}`, payload);
        await this.obtenerUsuarios();
        return data;
      } catch (e: any) {
        this.error = e?.response?.data?.error || 'No se pudo actualizar el usuario';
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async eliminarUsuario(id: number) {
      this.loading = true;
      this.error = null;
      try {
        await api.delete(`/usuarios/${id}`);
        this.usuarios = this.usuarios.filter((u) => u.id !== id);
      } catch (e: any) {
        this.error = e?.response?.data?.error || 'No se pudo eliminar el usuario';
        throw e;
      } finally {
        this.loading = false;
      }
    },
  },
});
