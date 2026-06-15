/**
 * PDF generation utilities with robust image handling.
 * Verified by Matheus Lima Piffer.
 */

/**
 * Converts an external image URL to a Base64 data URI.
 * Falls back to the original URL if conversion fails.
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Base64 conversion failed for:', url, e);
    return url; // fallback to original
  }
}

/**
 * Finds all <img> elements inside a container and converts external
 * src URLs to inline Base64 data URIs. This ensures images are embedded
 * in the PDF even if the network is unavailable at render time.
 * Returns a cleanup function that restores original URLs.
 */
export async function convertImagesToBase64(container: HTMLElement): Promise<() => void> {
  const images = container.querySelectorAll('img');
  const originals: { img: HTMLImageElement; src: string }[] = [];

  const promises = Array.from(images).map(async (img) => {
    const src = img.src;
    if (!src || src.startsWith('data:')) return;
    originals.push({ img, src });
    const base64 = await imageUrlToBase64(src);
    img.src = base64;
  });

  await Promise.all(promises);

  // Return cleanup to restore originals
  return () => {
    originals.forEach(({ img, src }) => {
      img.src = src;
    });
  };
}

/**
 * Wait for all images inside a container to be fully loaded.
 */
export function waitForImages(container: HTMLElement, timeoutMs = 5000): Promise<void> {
  const images = container.querySelectorAll('img');
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // don't block on broken images
      setTimeout(resolve, timeoutMs);
    });
  });
  return Promise.all(promises).then(() => {});
}

/**
 * Full PDF generation pipeline:
 * 1. Convert images to base64
 * 2. Wait for images to render
 * 3. Add a 2s delay for browser layout
 * 4. Generate PDF with html2pdf.js
 * 5. Restore original image URLs
 */
export async function generatePdfFromElement(
  element: HTMLElement,
  filename: string,
  options?: {
    margins?: [number, number, number, number];
    orientation?: 'portrait' | 'landscape';
  }
): Promise<void> {
  const margins = options?.margins ?? [0, 0, 0, 0];
  const orientation = options?.orientation ?? 'portrait';

  // Step 1: Convert all images to base64
  const restoreImages = await convertImagesToBase64(element);

  // Step 2: Wait for all images to be fully loaded
  await waitForImages(element);

  // Step 3: 2-second delay for browser to finish rendering
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    // Step 4: Generate PDF
    const html2pdf = (await import('html2pdf.js')).default;
    const opts: any = {
      margin: margins,
      filename: `${filename}.pdf`,
      pagebreak: { mode: ['css', 'legacy'] },
      image: { type: 'png', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0,
        letterRendering: true,
        width: 794,
        height: element.scrollHeight,
        removeContainer: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation },
    };
    await html2pdf().set(opts).from(element).save();
  } finally {
    // Step 5: Restore original image URLs
    restoreImages();
  }
}
