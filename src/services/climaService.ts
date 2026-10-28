import api from '@/services/api';
import type { AxiosRequestConfig } from 'axios';
import type { ClimaHistorial } from '@/domain/clima';

export const climaService = {
  async historial(fincaId: number, desde: string, hasta: string, signal?: AbortSignal): Promise<ClimaHistorial> {
    const { data } = await api.get<{ success: boolean; data: ClimaHistorial }>('/clima/historial', {
      params: { finca_id: fincaId, desde, hasta }, signal, skipGlobalError: true,
    } as AxiosRequestConfig);
    if (!data.success || data.data?.finca?.id !== fincaId || data.data.periodo?.desde !== desde || data.data.periodo?.hasta !== hasta || !Array.isArray(data.data.registros)) {
      throw new Error('El servidor devolvió un historial incompatible con la finca o el período seleccionado.');
    }
    return data.data;
  },
};
