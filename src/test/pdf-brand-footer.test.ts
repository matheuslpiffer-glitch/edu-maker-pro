import { describe, it, expect } from 'vitest';
import { jsPDF } from 'jspdf';
import { registerBrandFooter, setBrandLogoData } from '@/lib/pdf-brand-footer';
import { readFileSync } from 'fs';

describe('logo no rodapé dos PDFs', () => {
  it('coloca o logo em todas as páginas', () => {
    registerBrandFooter();
    setBrandLogoData('data:image/png;base64,' + readFileSync('/mnt/user-uploads/pifferedutech-logo-horizontal.png').toString('base64'));
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.text('Questão 1', 20, 20);
    pdf.addPage(); pdf.addPage();
    const out = pdf.output();
    expect(pdf.getNumberOfPages()).toBe(3);
    // cada página referencia a imagem do logo
    expect((out.match(/\/I\d+ Do/g) || []).length).toBe(3);
  });
});
