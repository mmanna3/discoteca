/** Fracción del ancho de la tapa que se estira para formar el lomo (ver .spine--arte). */
export const EDGE_FRACTION = 0.025;

type Rgb = [number, number, number];

const toCss = ([r, g, b]: Rgb) => `rgb(${r}, ${g}, ${b})`;

export function parseRgb(css: string): Rgb | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Texto claro u oscuro, el que contraste mejor contra el fondo. */
export function readableTextOn(rgb: Rgb): string {
  const l = luminance(rgb);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastBlack = (l + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? '#fbf7ef' : '#141210';
}

function average(data: Uint8ClampedArray): Rgb {
  let r = 0, g = 0, b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export interface CoverColors {
  edge: string;
  edgeText: string;
  average: string;
  averageText: string;
}

/** Lee la tapa en un canvas para sacar el color del borde izquierdo y el promedio general. */
export async function analyzeCover(url: string): Promise<CoverColors | null> {
  try {
    const img = await loadImage(url);
    const size = 100;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    const edge = average(ctx.getImageData(0, 0, Math.max(1, Math.round(size * EDGE_FRACTION)), size).data);
    const all = average(ctx.getImageData(0, 0, size, size).data);
    return { edge: toCss(edge), edgeText: readableTextOn(edge), average: toCss(all), averageText: readableTextOn(all) };
  } catch {
    return null;
  }
}

/** Para ordenar por color: los grises van al final, ordenados por claridad. */
export function hueKey(css: string): number {
  const rgb = parseRgb(css);
  if (!rgb) return 999;
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const light = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * light - 1));
  if (sat < 0.15 || light < 0.08 || light > 0.94) return 400 + (1 - light) * 100;
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue *= 60;
  return hue < 0 ? hue + 360 : hue;
}
