export type CintaColorNombre =
	| 'Blanca'
	| 'Negra'
	| 'Lila'
	| 'Roja'
	| 'Cafe'
	| 'Amarilla'
	| 'Verde'
	| 'Azul';

export interface CintaColorDetection {
	color: CintaColorNombre | null;
	confidence: number;
	hex: string;
	label: string;
}

interface Rgb {
	r: number;
	g: number;
	b: number;
}

interface Hsv {
	h: number;
	s: number;
	v: number;
}

const COLOR_HEX: Record<CintaColorNombre, string> = {
	Blanca: '#ffffff',
	Negra: '#1e293b',
	Lila: '#a855f7',
	Roja: '#ef4444',
	Cafe: '#78350f',
	Amarilla: '#eab308',
	Verde: '#22c55e',
	Azul: '#3b82f6',
};

function clampPercent(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
	const rn = r / 255;
	const gn = g / 255;
	const bn = b / 255;
	const max = Math.max(rn, gn, bn);
	const min = Math.min(rn, gn, bn);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
		else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
		else h = 60 * ((rn - gn) / delta + 4);
	}

	return {
		h: h < 0 ? h + 360 : h,
		s: max === 0 ? 0 : delta / max,
		v: max,
	};
}

function hueDistance(a: number, b: number): number {
	const diff = Math.abs(a - b);
	return Math.min(diff, 360 - diff);
}

function confidenceFromHue(h: number, target: number, tolerance: number): number {
	const distance = hueDistance(h, target);
	return clampPercent(100 - (distance / tolerance) * 100);
}

export function getCintaColorHex(color: CintaColorNombre | null): string {
	return color ? COLOR_HEX[color] : '#94a3b8';
}

export function normalizeCintaColorName(value: string | null | undefined): CintaColorNombre | null {
	const text = String(value || '').trim().toLowerCase();
	const found = (Object.keys(COLOR_HEX) as CintaColorNombre[]).find(
		(color) => color.toLowerCase() === text,
	);
	return found || null;
}

export function detectCintaColorFromRgb(rgb: Rgb): CintaColorDetection {
	const hsv = rgbToHsv(rgb);
	const { h, s, v } = hsv;

	if (v >= 0.72 && s <= 0.22) {
		return {
			color: 'Blanca',
			confidence: clampPercent(90 - s * 120 + (v - 0.72) * 40),
			hex: COLOR_HEX.Blanca,
			label: 'Cinta blanca',
		};
	}

	if (v <= 0.23) {
		return {
			color: 'Negra',
			confidence: clampPercent(95 - v * 180),
			hex: COLOR_HEX.Negra,
			label: 'Cinta negra',
		};
	}

	if (s < 0.18 || v < 0.18) {
		return {
			color: null,
			confidence: 0,
			hex: '#94a3b8',
			label: 'Color no reconocido',
		};
	}

	if (h >= 345 || h <= 13) {
		return {
			color: 'Roja',
			confidence: confidenceFromHue(h, h <= 13 ? 0 : 360, 22),
			hex: COLOR_HEX.Roja,
			label: 'Cinta roja',
		};
	}

	if (h > 13 && h <= 38) {
		return {
			color: 'Cafe',
			confidence: Math.min(confidenceFromHue(h, 25, 22), clampPercent((1 - v) * 140 + s * 45)),
			hex: COLOR_HEX.Cafe,
			label: 'Cinta cafe',
		};
	}

	if (h > 38 && h <= 68) {
		return {
			color: 'Amarilla',
			confidence: confidenceFromHue(h, 52, 28),
			hex: COLOR_HEX.Amarilla,
			label: 'Cinta amarilla',
		};
	}

	if (h > 68 && h <= 165) {
		return {
			color: 'Verde',
			confidence: confidenceFromHue(h, 125, 70),
			hex: COLOR_HEX.Verde,
			label: 'Cinta verde',
		};
	}

	if (h > 165 && h <= 250) {
		return {
			color: 'Azul',
			confidence: confidenceFromHue(h, 215, 65),
			hex: COLOR_HEX.Azul,
			label: 'Cinta azul',
		};
	}

	if (h > 250 && h < 345) {
		return {
			color: 'Lila',
			confidence: confidenceFromHue(h, 282, 65),
			hex: COLOR_HEX.Lila,
			label: 'Cinta lila',
		};
	}

	return {
		color: null,
		confidence: 0,
		hex: '#94a3b8',
		label: 'Color no reconocido',
	};
}

export function getAverageRgbFromImageData(
	imageData: ImageData,
	minSaturation = 0.08,
): Rgb | null {
	let r = 0;
	let g = 0;
	let b = 0;
	let count = 0;

	for (let i = 0; i < imageData.data.length; i += 4) {
		const pixel = {
			r: imageData.data[i],
			g: imageData.data[i + 1],
			b: imageData.data[i + 2],
		};
		const hsv = rgbToHsv(pixel);
		if (hsv.v < 0.08) continue;
		if (hsv.s < minSaturation && hsv.v < 0.65) continue;

		r += pixel.r;
		g += pixel.g;
		b += pixel.b;
		count += 1;
	}

	if (!count) return null;

	return {
		r: Math.round(r / count),
		g: Math.round(g / count),
		b: Math.round(b / count),
	};
}
