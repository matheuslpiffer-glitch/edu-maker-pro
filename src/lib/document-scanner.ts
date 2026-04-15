import type { Area } from 'react-easy-crop';

export interface StoredScannerCapture {
  rawDataUrl: string;
  processedDataUrl: string | null;
  fileName: string;
  mimeType: string;
  rotation: number;
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

function applyXeroxEffect(data: Uint8ClampedArray) {
  for (let index = 0; index < data.length; index += 4) {
    let gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    gray = (gray - 128) * 1.8 + 128;
    gray += 30;
    gray = Math.max(0, Math.min(255, gray));

    if (gray > 200) gray = 255;
    if (gray < 80) gray = 0;

    data[index] = gray;
    data[index + 1] = gray;
    data[index + 2] = gray;
    data[index + 3] = 255;
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

    return { dataUrl, file: normalizedFile };
  } finally {
    URL.revokeObjectURL(image.src);
  }
}

export async function getCroppedProcessedImage(params: {
  src: string;
  cropArea: Area;
  rotation: number;
  fileName: string;
}) {
  const { src, cropArea, rotation, fileName } = params;
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
  applyXeroxEffect(imageData.data);
  outputContext.putImageData(imageData, 0, 0);

  const sharpness = computeSharpness(imageData.data, outputCanvas.width, outputCanvas.height);
  const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.92);
  const file = dataUrlToFile(dataUrl, fileName, 'image/jpeg');

  return { dataUrl, file, sharpness };
}