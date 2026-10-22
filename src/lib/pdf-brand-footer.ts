/**
 * Selo da empresa (Piffer EduTech) no rodapé de TODA página de PDF gerada
 * pelo app (jsPDF direto ou via html2pdf). Registrado como evento global do
 * jsPDF, então qualquer nova exportação recebe o logo automaticamente.
 */
import { jsPDF } from 'jspdf';
import logoAsset from '@/assets/pifferedutech-logo.png.asset.json';

const RATIO = 803 / 213;
let logoData: string | null = null;
let registered = false;

export function setBrandLogoData(data: string | null) { logoData = data; }

export function stampBrandFooter(pdf: any) {
  if (!logoData) return;
  try {
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    const k = pdf.internal.scaleFactor; // pontos por unidade
    const mm = 72 / 25.4 / k; // 1 mm na unidade do documento
    const logoH = 4 * mm;
    const logoW = logoH * RATIO;
    pdf.addImage(logoData, 'PNG', w - logoW - 8 * mm, h - logoH - 3 * mm, logoW, logoH, 'piffer-logo', 'FAST');
  } catch { /* nunca impedir o PDF */ }
}

export function registerBrandFooter() {
  if (registered) return;
  registered = true;
  (jsPDF as any).API.events.push(['addPage', function (this: any) { stampBrandFooter(this); }]);
  if (typeof window === 'undefined') return;
  fetch(logoAsset.url)
    .then((r) => r.blob())
    .then((b) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result as string); fr.onerror = rej; fr.readAsDataURL(b); }))
    .then(setBrandLogoData)
    .catch(() => {});
}
