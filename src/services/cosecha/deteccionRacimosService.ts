import api from '../api';
import { leerMarcasDetectadas } from '@/utils/conteoFoto';

export const deteccionRacimosService = {
  async detectar(fincaId: number, base64: string, signal: AbortSignal) {
    const response = await api.post('/cosecha/detectar-racimos', {
      finca_id: fincaId, imagen: { mime_type: 'image/jpeg', base64 },
    }, { signal, timeout: 55000, skipGlobalError: true } as import('axios').AxiosRequestConfig);
    return leerMarcasDetectadas(response.data?.data);
  },
};

export async function prepararImagenDeteccion(src: string): Promise<string> {
  const imagen = new Image();
  await new Promise<void>((resolve, reject) => {
    imagen.onload = () => resolve();
    imagen.onerror = () => reject(new Error('No se pudo preparar la foto. Prueba con un JPG o PNG.'));
    imagen.src = src;
  });
  const canvas = document.createElement('canvas');
  const escala = Math.min(1, 1600 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
  canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
  canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('Este navegador no pudo preparar la imagen. Puedes marcar manualmente.');
  // Re-encoding keeps the displayed orientation and removes EXIF location metadata.
  contexto.fillStyle = '#ffffff';
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  try {
    for (const calidad of [0.85, 0.7, 0.55, 0.4]) {
      const data = canvas.toDataURL('image/jpeg', calidad);
      if (!data.startsWith('data:image/jpeg;base64,')) break;
      const base64 = data.split(',')[1]!;
      if (base64.length <= Math.floor(650 * 1024 / 3) * 4) return base64;
    }
    throw new Error('La foto es demasiado grande para analizarla. Usa una toma más cercana o marca manualmente.');
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}
