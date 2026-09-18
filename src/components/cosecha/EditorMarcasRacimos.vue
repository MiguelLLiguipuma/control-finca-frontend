<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import type { MarcaRacimo } from '@/utils/conteoFoto';

defineProps<{ src: string; disabled?: boolean }>();
const marcas = defineModel<MarcaRacimo[]>({ required: true });
const escena = ref<HTMLElement | null>(null);
const visor = ref<HTMLElement | null>(null);
const anchoVisor = shallowRef(300);
const altoPantalla = shallowRef(window.innerHeight);
const proporcion = shallowRef(1);
const anchoImagen = computed(() => Math.max(1, Math.min(anchoVisor.value - 44, (altoPantalla.value * 0.65 - 44) * proporcion.value)) * zoom.value);
const zoom = shallowRef(1);
const seleccion = shallowRef<number | null>(null);
const historial = ref<MarcaRacimo[][]>([]);
let siguienteId = 1;
let arrastre: { pointer: number; id: number; x: number; y: number; previo: MarcaRacimo[] } | null = null;
let observador: ResizeObserver | undefined;

function medir() {
  anchoVisor.value = visor.value?.clientWidth || 300;
  altoPantalla.value = window.innerHeight;
}
function imagenLista(event: Event) {
  const imagen = event.target as HTMLImageElement;
  proporcion.value = imagen.naturalWidth / imagen.naturalHeight;
  medir();
}
onMounted(() => {
  observador = new ResizeObserver(medir);
  if (visor.value) observador.observe(visor.value);
  window.addEventListener('resize', medir);
  medir();
});
onBeforeUnmount(() => {
  observador?.disconnect();
  window.removeEventListener('resize', medir);
});

function copia() { return marcas.value.map((marca) => ({ ...marca })); }
function recordar(previo = copia()) { historial.value.push(previo); }
function limitar(valor: number) { return Math.max(0, Math.min(1, valor)); }
function posicion(event: PointerEvent | MouseEvent) {
  const rect = escena.value!.getBoundingClientRect();
  return { x: limitar((event.clientX - rect.left) / rect.width), y: limitar((event.clientY - rect.top) / rect.height) };
}
function agregar(event?: MouseEvent) {
  recordar();
  const punto = event ? posicion(event) : { x: 0.5, y: 0.5 };
  const id = Math.max(siguienteId, ...marcas.value.map((marca) => marca.id + 1));
  siguienteId = id + 1;
  marcas.value = [...marcas.value, { id, ...punto }];
  seleccion.value = id;
}
function eliminar() {
  if (seleccion.value === null) return;
  recordar();
  marcas.value = marcas.value.filter((marca) => marca.id !== seleccion.value);
  seleccion.value = null;
}
function deshacer() {
  const previo = historial.value.pop();
  if (previo) marcas.value = previo;
  seleccion.value = null;
}
function iniciar(event: PointerEvent, marca: MarcaRacimo) {
  if (!event.isPrimary || event.button !== 0) return;
  seleccion.value = marca.id;
  arrastre = { pointer: event.pointerId, id: marca.id, x: event.clientX, y: event.clientY, previo: copia() };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}
function mover(event: PointerEvent) {
  if (!arrastre || event.pointerId !== arrastre.pointer) return;
  if (Math.hypot(event.clientX - arrastre.x, event.clientY - arrastre.y) < 5) return;
  const punto = posicion(event);
  marcas.value = marcas.value.map((marca) => marca.id === arrastre!.id ? { ...marca, ...punto } : marca);
}
function terminar(event: PointerEvent, cancelar = false) {
  if (!arrastre || event.pointerId !== arrastre.pointer) return;
  if (cancelar) marcas.value = arrastre.previo;
  else if (JSON.stringify(arrastre.previo) !== JSON.stringify(marcas.value)) recordar(arrastre.previo);
  arrastre = null;
}
function teclado(event: KeyboardEvent, marca: MarcaRacimo) {
  seleccion.value = marca.id;
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); eliminar(); return; }
  const pasos: Record<string, [number, number]> = { ArrowLeft: [-0.01, 0], ArrowRight: [0.01, 0], ArrowUp: [0, -0.01], ArrowDown: [0, 0.01] };
  const paso = pasos[event.key];
  if (!paso) return;
  event.preventDefault();
  recordar();
  marcas.value = marcas.value.map((item) => item.id === marca.id
    ? { ...item, x: limitar(item.x + paso[0]), y: limitar(item.y + paso[1]) } : item);
}
</script>

<template>
  <div class="editor">
    <div class="herramientas">
      <strong aria-live="polite">{{ marcas.length }} racimos marcados</strong>
      <div class="controles">
        <v-btn icon="mdi-minus" size="small" variant="text" title="Alejar" aria-label="Alejar" :disabled="zoom <= 1" @click="zoom = Math.max(1, zoom - 0.5)" />
        <span>{{ Math.round(zoom * 100) }}%</span>
        <v-btn icon="mdi-plus" size="small" variant="text" title="Acercar" aria-label="Acercar" :disabled="zoom >= 4" @click="zoom = Math.min(4, zoom + 0.5)" />
        <v-btn icon="mdi-undo" size="small" variant="text" title="Deshacer" aria-label="Deshacer" :disabled="disabled || !historial.length" @click="deshacer" />
        <v-btn icon="mdi-delete-outline" size="small" variant="text" title="Eliminar marca seleccionada" aria-label="Eliminar marca seleccionada" :disabled="disabled || seleccion === null" @click="eliminar" />
      </div>
    </div>
    <div ref="visor" class="visor" tabindex="0" aria-label="Fotografía ampliable de racimos">
      <div ref="escena" class="escena" :style="{ width: `${anchoImagen}px` }">
        <img :src="src" alt="Racimos para marcar" draggable="false" @load="imagenLista" @click="!disabled && agregar($event)">
        <button
          v-for="(marca, index) in marcas" :key="marca.id" type="button"
          class="marca" :class="{ seleccionada: seleccion === marca.id }"
          :style="{ left: `${marca.x * 100}%`, top: `${marca.y * 100}%` }"
          :disabled="disabled" :aria-label="`Racimo ${index + 1}`" :aria-pressed="seleccion === marca.id"
          @click.stop="seleccion = marca.id" @pointerdown.stop="iniciar($event, marca)"
          @pointermove="mover" @pointerup="terminar($event)" @pointercancel="terminar($event, true)"
          @keydown="teclado($event, marca)"
        >{{ index + 1 }}</button>
      </div>
    </div>
    <v-btn variant="text" prepend-icon="mdi-plus" :disabled="disabled" @click="agregar()">Añadir marca al centro</v-btn>
  </div>
</template>

<style scoped>
.editor { min-width: 0; }
.herramientas, .controles { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.herramientas { justify-content: space-between; margin-bottom: 8px; gap: 8px; }
.visor { overflow: auto; max-height: 65vh; border-radius: 8px; background: rgba(var(--v-theme-on-surface), 0.08); padding: 22px; }
.escena { position: relative; margin: 0 auto; }
.escena img { display: block; width: 100%; height: auto; user-select: none; cursor: crosshair; }
.marca { position: absolute; transform: translate(-50%, -50%); width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; background: #0754b8; color: white; font-size: 16px; font-weight: 800; box-shadow: 0 1px 5px #0009; touch-action: none; cursor: grab; }
.marca.seleccionada { background: #b3261e; outline: 2px solid white; z-index: 1; }
.marca:focus-visible { outline: 4px solid #fdd835; }
</style>
