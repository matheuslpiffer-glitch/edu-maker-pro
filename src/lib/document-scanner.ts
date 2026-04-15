import type { Area } from 'react-easy-crop';

// ─── Filter Modes ───────────────────────────────────────────────────────────
export type ScanFilterMode = 'magic' | 'grayscale' | 'bw' | 'original';

export const SCAN_FILTER_OPTIONS: { value: ScanFilterMode; label: string; desc: string }[] = [
  { value: 'magic', label: 'REALCE MÁGICO', desc: 'Remove sombras, realça caneta' },
  { value: 'grayscale', label: 'TONS DE CINZA', desc: 'Escala de cinza com contraste' },
  { value: 'bw', label: 'PRETO & BRANCO', desc: 'Alto contraste, estilo xerox' },
  { value: 'original', label: 'ORIGINAL', desc: 'Sem filtro, cor natural' },
];

export interface StoredScannerCapture {
  rawDataUrl: string;
  processedDataUrl: string | null;
  fileName: string;
  mimeType: string;
  rotation: number;
  filterMode?: ScanFilterMode;
  lastUpdatedAt: number;
}

export const DOCUMENT_SCANNER_STORAGE_KEY = 'elite_document_scanner_capture_v2';

function getBrowserStorages(): Storage[] {
  if (typeof window === 'undefined') return [];

  const storages: Storage[] = [];

  try {
    storages.push(window.localStorage);
  } catch {
    // ignore
  }

  try {
    storages.push(window.sessionStorage);
  } catch {
    // ignore
  }

  return storages;
}

function normalizeFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^/.]+$/, '') || 'redacao-escaneada';
  return `${baseName}.jpg`;
}

export function persistScannerCapture(capture: StoredScannerCapture) {
  const serialized = JSON.stringify(capture);

  for (const storage of getBrowserStorages()) {
    try {
      storage.setItem(DOCUMENT_SCANNER_STORAGE_KEY, serialized);
      console.log('[DocumentScanner][storage] captura salva', {
        target: storage === window.localStorage ? 'localStorage' : 'sessionStorage',
        hasProcessed: Boolean(capture.processedDataUrl),
      });
      return true;
    } catch (error) {
      console.warn('[DocumentScanner][storage] falha ao salvar captura', error);
    }
  }

  return false;
}

export function readStoredScannerCapture(): StoredScannerCapture | null {
  for (const storage of getBrowserStorages()) {
    try {
      const raw = storage.getItem(DOCUMENT_SCANNER_STORAGE_KEY);
      if (!raw) continue;

      const parsed = JSON.parse(raw) as StoredScannerCapture;
      console.log('[DocumentScanner][storage] captura encontrada', {
        target: storage === window.localStorage ? 'localStorage' : 'sessionStorage',
        hasProcessed: Boolean(parsed.processedDataUrl),
      });
      return parsed;
    } catch (error) {
      console.warn('[DocumentScanner][storage] falha ao ler captura', error);
    }
  }

  return null;
}

export function clearStoredScannerCapture() {
  for (const storage of getBrowserStorages()) {
    try {
      storage.removeItem(DOCUMENT_SCANNER_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  console.log('[DocumentScanner][storage] captura removida');
}

export function dataUrlToFile(dataUrl: string, fileName: string, mimeType = 'image/jpeg') {
  const [header, content] = dataUrl.split(',');
  const detectedMimeType = header.match(/data:(.*?);base64/)?.[1] || mimeType;
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], normalizeFileName(fileName), { type: detectedMimeType });
}

function getRotatedBounds(width: number, height: number, rotation: number) {
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(width * sin + height * cos),
  };
}

async function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Erro ao carregar imagem para o scanner'));
    image.src = source;
  });
}

// ─── Image Processing Filters ───────────────────────────────────────────────

/** Compute grayscale luminance for a pixel */
function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Clamp value to 0–255 */
function clamp(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/**
 * Estimate the background (shadow/lighting map) using a box-blur approximation.
 * This simulates the "divide by background" technique used in CamScanner.
 * We downsample, blur, then upsample for speed.
 */
function estimateBackground(
  grayPixels: Float32Array,
  width: number,
  height: number,
  radius = 30,
): Float32Array {
  // Downscale factor for speed
  const scale = 4;
  const sw = Math.ceil(width / scale);
  const sh = Math.ceil(height / scale);
  const small = new Float32Array(sw * sh);

  // Downsample
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const ox = Math.min(x * scale, width - 1);
      const oy = Math.min(y * scale, height - 1);
      small[y * sw + x] = grayPixels[oy * width + ox];
    }
  }

  // Box blur (horizontal then vertical) on small image
  const sr = Math.max(1, Math.ceil(radius / scale));
  const temp = new Float32Array(sw * sh);

  // Horizontal pass
  for (let y = 0; y < sh; y++) {
    let sum = 0;
    let count = 0;
    for (let x = 0; x < Math.min(sr, sw); x++) {
      sum += small[y * sw + x];
      count++;
    }
    for (let x = 0; x < sw; x++) {
      if (x + sr < sw) { sum += small[y * sw + x + sr]; count++; }
      if (x - sr > 0) { sum -= small[y * sw + x - sr - 1]; count--; }
      temp[y * sw + x] = sum / count;
    }
  }

  // Vertical pass
  const blurred = new Float32Array(sw * sh);
  for (let x = 0; x < sw; x++) {
    let sum = 0;
    let count = 0;
    for (let y = 0; y < Math.min(sr, sh); y++) {
      sum += temp[y * sw + x];
      count++;
    }
    for (let y = 0; y < sh; y++) {
      if (y + sr < sh) { sum += temp[(y + sr) * sw + x]; count++; }
      if (y - sr > 0) { sum -= temp[(y - sr - 1) * sw + x]; count--; }
      blurred[y * sw + x] = sum / count;
    }
  }

  // Upsample back to full size with bilinear interpolation
  const result = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const fx = (x / scale);
      const fy = (y / scale);
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const dx = fx - x0;
      const dy = fy - y0;

      result[y * width + x] =
        blurred[y0 * sw + x0] * (1 - dx) * (1 - dy) +
        blurred[y0 * sw + x1] * dx * (1 - dy) +
        blurred[y1 * sw + x0] * (1 - dx) * dy +
        blurred[y1 * sw + x1] * dx * dy;
    }
  }

  return result;
}

/**
 * Apply unsharp mask sharpening to grayscale data in-place.
 */
function sharpen(data: Uint8ClampedArray, width: number, height: number, amount = 0.6) {
  const copy = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) copy[i] = data[i];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const neighbors =
          copy[((y - 1) * width + x) * 4 + c] +
          copy[((y + 1) * width + x) * 4 + c] +
          copy[(y * width + (x - 1)) * 4 + c] +
          copy[(y * width + (x + 1)) * 4 + c];
        const blur = neighbors / 4;
        const sharp = center + (center - blur) * amount;
        data[idx + c] = clamp(Math.round(sharp));
      }
    }
  }
}

/**
 * MAGIC COLOR filter — CamScanner-style:
 * 1. Estimate background lighting via large blur
 * 2. Divide original by background → removes shadows, normalizes paper to white
 * 3. Boost ink contrast
 * 4. Sharpen
 */
function applyMagicColor(data: Uint8ClampedArray, width: number, height: number) {
  const totalPixels = width * height;
  const gray = new Float32Array(totalPixels);

  // Build grayscale map
  for (let i = 0; i < totalPixels; i++) {
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }

  // Estimate background
  const bg = estimateBackground(gray, width, height, 40);

  // Normalize: pixel / background * 255, then boost contrast
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const bgVal = Math.max(bg[i], 1); // avoid division by zero

    for (let c = 0; c < 3; c++) {
      // Divide by background → normalizes lighting
      let v = (data[idx + c] / bgVal) * 220;

      // Contrast stretch: push paper towards white, ink towards dark
      v = (v - 128) * 1.6 + 128 + 20;
      data[idx + c] = clamp(Math.round(v));
    }
    data[idx + 3] = 255;
  }

  // Sharpen the result
  sharpen(data, width, height, 0.7);
}

/**
 * GRAYSCALE filter — high contrast gray with shadow removal.
 */
function applyGrayscaleFilter(data: Uint8ClampedArray, width: number, height: number) {
  const totalPixels = width * height;
  const gray = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }

  const bg = estimateBackground(gray, width, height, 40);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const bgVal = Math.max(bg[i], 1);
    let v = (gray[i] / bgVal) * 230;
    v = (v - 128) * 1.5 + 128 + 15;
    v = clamp(Math.round(v));

    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
    data[idx + 3] = 255;
  }

  sharpen(data, width, height, 0.5);
}

/**
 * B&W filter — strong threshold for xerox-like output.
 */
function applyBWFilter(data: Uint8ClampedArray, width: number, height: number) {
  const totalPixels = width * height;
  const gray = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    gray[i] = luminance(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
  }

  const bg = estimateBackground(gray, width, height, 40);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const bgVal = Math.max(bg[i], 1);
    let v = (gray[i] / bgVal) * 240;
    v = (v - 128) * 2.2 + 128 + 25;

    // Hard threshold
    const bw = v > 170 ? 255 : v < 100 ? 0 : clamp(Math.round((v - 100) * (255 / 70)));

    data[idx] = bw;
    data[idx + 1] = bw;
    data[idx + 2] = bw;
    data[idx + 3] = 255;
  }
}

/**
 * Apply the selected filter mode to image data.
 */
export function applyFilter(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  mode: ScanFilterMode,
) {
  switch (mode) {
    case 'magic':
      applyMagicColor(data, width, height);
      break;
    case 'grayscale':
      applyGrayscaleFilter(data, width, height);
      break;
    case 'bw':
      applyBWFilter(data, width, height);
      break;
    case 'original':
      // No filter — just sharpen slightly
      sharpen(data, width, height, 0.3);
      break;
  }
}

function computeSharpness(data: Uint8ClampedArray, width: number, height: number) {
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  const step = 4;

  for (let y = 1; y < height - 1; y += step) {
    for (let x = 1; x < width - 1; x += step) {
      const index = (y * width + x) * 4;
      const center = data[index];
      const top = data[((y - 1) * width + x) * 4];
      const bottom = data[((y + 1) * width + x) * 4];
      const left = data[(y * width + (x - 1)) * 4];
      const right = data[(y * width + (x + 1)) * 4];
      const laplacian = 4 * center - top - bottom - left - right;

      sum += laplacian;
      sumSq += laplacian * laplacian;
      count += 1;
    }
  }

  if (count === 0) return 0;

  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/**
 * Auto-detect document edges using contrast analysis.
 * Scans inward from each edge to find where the document starts,
 * returning normalized crop bounds (0-1) for react-easy-crop.
 */
export function detectDocumentEdges(
  imageElement: HTMLImageElement,
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
  const w = imageElement.naturalWidth || imageElement.width;
  const h = imageElement.naturalHeight || imageElement.height;

  // Downsample for performance
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { cropX: 0, cropY: 0, cropWidth: 1, cropHeight: 1 };

  ctx.drawImage(imageElement, 0, 0, sw, sh);
  const data = ctx.getImageData(0, 0, sw, sh).data;

  // Convert to grayscale
  const gray = new Uint8Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }

  // Compute gradient magnitude (Sobel-like)
  const gradient = new Float32Array(sw * sh);
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const gx =
        -gray[(y - 1) * sw + (x - 1)] + gray[(y - 1) * sw + (x + 1)]
        - 2 * gray[y * sw + (x - 1)] + 2 * gray[y * sw + (x + 1)]
        - gray[(y + 1) * sw + (x - 1)] + gray[(y + 1) * sw + (x + 1)];
      const gy =
        -gray[(y - 1) * sw + (x - 1)] - 2 * gray[(y - 1) * sw + x] - gray[(y - 1) * sw + (x + 1)]
        + gray[(y + 1) * sw + (x - 1)] + 2 * gray[(y + 1) * sw + x] + gray[(y + 1) * sw + (x + 1)];
      gradient[y * sw + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // Find threshold (mean + 0.5 * stddev of gradient)
  let gSum = 0, gSumSq = 0, gCount = 0;
  for (let i = 0; i < gradient.length; i++) {
    if (gradient[i] > 0) { gSum += gradient[i]; gSumSq += gradient[i] * gradient[i]; gCount++; }
  }
  const gMean = gCount > 0 ? gSum / gCount : 0;
  const gStd = gCount > 0 ? Math.sqrt(gSumSq / gCount - gMean * gMean) : 0;
  const threshold = gMean + 0.5 * gStd;

  // Scan from each edge to find where strong edges begin
  const margin = 0.02; // minimum margin
  const scanLimit = 0.35; // don't scan more than 35% from each edge

  function scanFromLeft(): number {
    const maxX = Math.round(sw * scanLimit);
    const sampleRows = 10;
    for (let x = 0; x < maxX; x++) {
      let edgeCount = 0;
      for (let s = 0; s < sampleRows; s++) {
        const y = Math.round((sh * (s + 1)) / (sampleRows + 1));
        if (gradient[y * sw + x] > threshold) edgeCount++;
      }
      if (edgeCount >= sampleRows * 0.3) return Math.max(margin, (x - 2) / sw);
    }
    return margin;
  }

  function scanFromRight(): number {
    const minX = Math.round(sw * (1 - scanLimit));
    const sampleRows = 10;
    for (let x = sw - 1; x > minX; x--) {
      let edgeCount = 0;
      for (let s = 0; s < sampleRows; s++) {
        const y = Math.round((sh * (s + 1)) / (sampleRows + 1));
        if (gradient[y * sw + x] > threshold) edgeCount++;
      }
      if (edgeCount >= sampleRows * 0.3) return Math.max(margin, 1 - (x + 2) / sw);
    }
    return margin;
  }

  function scanFromTop(): number {
    const maxY = Math.round(sh * scanLimit);
    const sampleCols = 10;
    for (let y = 0; y < maxY; y++) {
      let edgeCount = 0;
      for (let s = 0; s < sampleCols; s++) {
        const x = Math.round((sw * (s + 1)) / (sampleCols + 1));
        if (gradient[y * sw + x] > threshold) edgeCount++;
      }
      if (edgeCount >= sampleCols * 0.3) return Math.max(margin, (y - 2) / sh);
    }
    return margin;
  }

  function scanFromBottom(): number {
    const minY = Math.round(sh * (1 - scanLimit));
    const sampleCols = 10;
    for (let y = sh - 1; y > minY; y--) {
      let edgeCount = 0;
      for (let s = 0; s < sampleCols; s++) {
        const x = Math.round((sw * (s + 1)) / (sampleCols + 1));
        if (gradient[y * sw + x] > threshold) edgeCount++;
      }
      if (edgeCount >= sampleCols * 0.3) return Math.max(margin, 1 - (y + 2) / sh);
    }
    return margin;
  }

  const left = scanFromLeft();
  const right = scanFromRight();
  const top = scanFromTop();
  const bottom = scanFromBottom();

  console.log('[DocumentScanner] detecção de bordas:', { left, right, top, bottom });

  return {
    cropX: left,
    cropY: top,
    cropWidth: 1 - left - right,
    cropHeight: 1 - top - bottom,
  };
}

export async function createPersistableCapture(file: File, maxWidth = 1600, quality = 0.86) {
  const image = await loadImage(URL.createObjectURL(file));

  try {
    let width = image.naturalWidth || image.width;
    let height = image.naturalHeight || image.height;

    if (width > maxWidth) {
      height = Math.round(height * (maxWidth / width));
      width = maxWidth;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas não suportado para persistir a captura');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const normalizedFile = dataUrlToFile(dataUrl, file.name, 'image/jpeg');

    // Detect document edges
    const edges = detectDocumentEdges(image);

    return { dataUrl, file: normalizedFile, edges };
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

export async function getCroppedProcessedImage(params: {
  src: string;
  cropArea: Area;
  rotation: number;
  fileName: string;
  filterMode?: ScanFilterMode;
}) {
  const { src, cropArea, rotation, fileName, filterMode = 'magic' } = params;
  const image = await loadImage(src);
  const bounds = getRotatedBounds(image.naturalWidth || image.width, image.naturalHeight || image.height, rotation);

  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = bounds.width;
  rotatedCanvas.height = bounds.height;

  const rotatedContext = rotatedCanvas.getContext('2d');
  if (!rotatedContext) throw new Error('Canvas não suportado para recortar a imagem');

  rotatedContext.fillStyle = '#ffffff';
  rotatedContext.fillRect(0, 0, bounds.width, bounds.height);
  rotatedContext.translate(bounds.width / 2, bounds.height / 2);
  rotatedContext.rotate((rotation * Math.PI) / 180);
  rotatedContext.drawImage(
    image,
    -(image.naturalWidth || image.width) / 2,
    -(image.naturalHeight || image.height) / 2,
  );
  rotatedContext.setTransform(1, 0, 0, 1, 0, 0);

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = Math.max(1, Math.round(cropArea.width));
  outputCanvas.height = Math.max(1, Math.round(cropArea.height));

  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) throw new Error('Canvas não suportado para processar a imagem');

  outputContext.fillStyle = '#ffffff';
  outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputContext.drawImage(
    rotatedCanvas,
    Math.round(cropArea.x),
    Math.round(cropArea.y),
    Math.round(cropArea.width),
    Math.round(cropArea.height),
    0,
    0,
    outputCanvas.width,
    outputCanvas.height,
  );

  const imageData = outputContext.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  applyFilter(imageData.data, outputCanvas.width, outputCanvas.height, filterMode);
  outputContext.putImageData(imageData, 0, 0);

  const sharpness = computeSharpness(imageData.data, outputCanvas.width, outputCanvas.height);
  const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.92);
  const file = dataUrlToFile(dataUrl, fileName, 'image/jpeg');

  return { dataUrl, file, sharpness };
}