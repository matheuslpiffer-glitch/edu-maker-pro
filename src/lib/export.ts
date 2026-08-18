import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { RGF_DEFAULT, rgfText } from '@/lib/rgf-format';
import { latexToUnicode } from '@/lib/latex-to-unicode';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  subject_id: string;
  type: string;
  content: string;
  options: QuestionOption[];
  answer: string;
  explanation?: string;
  correctionMirror?: string;
  topic?: string;
  difficulty?: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Header {
  institutionName: string;
  teacherName: string;
  date: string;
  className: string;
  title: string;
}

export function stripHtml(text: string): string {
  if (!text) return '';
  let out = text.replace(/<[^>]*>/g, '');
  out = out
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'");
  out = out.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  return out;
}

export function sanitizeForDocx(text: string): string {
  return latexToUnicode(stripHtml(text));
}

const clean = sanitizeForDocx;

function getCommentedResolution(q: Question): string {
  return clean(q.explanation || '');
}

/**
 * Escapa HTML para impedir injeção quando o texto sanitizado for embutido
 * num HTML de impressão (caminho do PDF construído via buildSanitizedQuestionHtml).
 */
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Monta um HTML 100% sanitizado (sem HTML cru, sem LaTeX, sem $) com
 * enunciado, alternativas, gabarito e resolução comentada — pronto para
 * ser convertido em PDF via html2canvas/jspdf.
 * Usado pelos testes e pela sobrecarga de exportToPDF que recebe os
 * dados estruturados.
 */
export function buildSanitizedQuestionHtml(
  header: Header,
  questions: Question[],
  subjects: Subject[],
  includeGabarito: boolean,
): string {
  const parts: string[] = [];
  parts.push(
    `<header style="text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:8px;margin-bottom:16px;">` +
      `<h1 style="margin:0;font-size:18px;">${escapeHtml(clean(header.institutionName || 'Instituição'))}</h1>` +
      `<h2 style="margin:4px 0;font-size:14px;">${escapeHtml(clean(header.title || 'Avaliação'))}</h2>` +
      `<p style="margin:0;font-size:11px;">Prof.: ${escapeHtml(clean(header.teacherName))} • Data: ${escapeHtml(clean(header.date))} • Turma: ${escapeHtml(clean(header.className))}</p>` +
    `</header>`,
  );

  questions.forEach((q, i) => {
    const subject = subjects.find((s) => s.id === q.subject_id);
    parts.push(
      `<section style="margin-bottom:14px;page-break-inside:avoid;">` +
        `<p style="margin:0 0 6px;font-size:12px;"><strong>${i + 1})</strong> ` +
          (subject?.name ? `<span style="color:#666;">[${escapeHtml(subject.name)}]</span> ` : '') +
          `${escapeHtml(clean(q.content))}</p>`,
    );
    if (q.type === 'multiple-choice') {
      parts.push('<ol type="A" style="margin:0 0 0 24px;padding:0;font-size:12px;">');
      q.options.forEach((o) => {
        parts.push(`<li style="margin:2px 0;">${escapeHtml(clean(o.text))}</li>`);
      });
      parts.push('</ol>');
    } else {
      parts.push(
        '<div style="border-bottom:1px solid #ccc;height:22px;"></div>'.repeat(6),
      );
    }
    parts.push('</section>');
  });

  if (includeGabarito) {
    parts.push(`<h2 style="page-break-before:always;text-align:center;font-size:16px;">Gabarito</h2>`);
    questions.forEach((q, i) => {
      let answerText = '';
      if (q.type === 'multiple-choice') {
        const idx = q.options.findIndex((o) => o.isCorrect);
        answerText = String.fromCharCode(65 + Math.max(0, idx));
      } else {
        answerText = clean(q.answer) || 'Resposta dissertativa';
      }
      parts.push(
        `<div style="margin:6px 0;font-size:12px;"><strong>${i + 1}.</strong> ${escapeHtml(answerText)}</div>`,
      );
      const resolution = getCommentedResolution(q);
      if (resolution) {
        parts.push(
          `<div style="margin:0 0 10px 16px;font-size:11px;color:#374151;"><em>Resolução comentada:</em> ${escapeHtml(resolution)}</div>`,
        );
      }
    });
  }

  return `<article style="font-family:Arial,sans-serif;line-height:1.4;color:#111;">${parts.join('')}</article>`;
}

export async function exportToPDF(element: HTMLElement, filename: string): Promise<void>;
export async function exportToPDF(
  header: Header,
  questions: Question[],
  subjects: Subject[],
  includeGabarito: boolean,
  filename?: string,
): Promise<void>;
export async function exportToPDF(
  a: HTMLElement | Header,
  b: string | Question[],
  subjects?: Subject[],
  includeGabarito?: boolean,
  filename?: string,
): Promise<void> {
  const { generatePdfFromElement } = await import('@/lib/pdf-utils');

  if (a instanceof HTMLElement) {
    await generatePdfFromElement(a, b as string, { margins: [15, 15, 15, 15] });
    return;
  }

  const header = a as Header;
  const questions = b as Question[];
  const html = buildSanitizedQuestionHtml(header, questions, subjects || [], !!includeGabarito);
  const node = document.createElement('div');
  // O nó capturado deve ficar estático: se for fixed/absolute, o clone do
  // html2canvas colapsa para altura 0 e o PDF sai em branco.
  node.style.cssText = 'width:794px;background:#fff;padding:24px;box-sizing:border-box;display:block;position:static;';
  node.innerHTML = html;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-9999px;top:0;background:#fff;width:794px;z-index:-1000;';
  holder.appendChild(node);
  document.body.appendChild(holder);
  try {
    await generatePdfFromElement(node, filename || `${header.title || 'avaliacao'}.pdf`, {
      margins: [15, 15, 15, 15],
    });
  } finally {
    holder.remove();
  }
}

export async function exportToDocx(
  header: Header,
  questions: Question[],
  subjects: Subject[],
  includeGabarito: boolean
) {
  const sz = RGF_DEFAULT.fontSizeDocx;
  const font = 'Arial';
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    children: [new TextRun({ text: rgfText(header.institutionName || 'Instituição'), bold: true, size: 28, font })],
    alignment: AlignmentType.CENTER,
    spacing: { line: 276 }, // 1.15 line spacing (240 * 1.15)
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: rgfText(header.title || 'Avaliação'), bold: true, size: 24, font })],
    alignment: AlignmentType.CENTER,
    spacing: { line: 276 },
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: rgfText(`Professor: ${header.teacherName}  |  Data: ${header.date}  |  Turma: ${header.className}`), size: sz, font })],
    alignment: AlignmentType.CENTER,
    spacing: { line: 276 },
  }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: rgfText('Nome: __________________________________________ Nº: ______'), size: sz, font })] }));
  children.push(new Paragraph({ text: '' }));

  questions.forEach((q, i) => {
    const subject = subjects.find(s => s.id === q.subject_id);
    const contentText = clean(q.content);
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${i + 1}) `, bold: true, size: sz, font }),
        new TextRun({ text: `[${subject?.name || ''}] `, italics: true, size: 18, color: '888888', font }),
        new TextRun({ text: rgfText(contentText), size: sz, font }),
      ],
      spacing: { line: 276 },
    }));

    if (q.type === 'multiple-choice') {
      q.options.forEach((opt, j) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: rgfText(`     ${String.fromCharCode(97 + j)}) ${clean(opt.text)}`), size: sz, font })],
          spacing: { line: 276 },
        }));
      });
    } else {
      for (let j = 0; j < 6; j++) {
        children.push(new Paragraph({ children: [new TextRun({ text: '_'.repeat(80), size: sz, font })] }));
      }
    }
    children.push(new Paragraph({ text: '' }));
  });

  if (includeGabarito) {
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'GABARITO', bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
    }));
    children.push(new Paragraph({ text: '' }));

    questions.forEach((q, i) => {
      if (q.type === 'multiple-choice') {
        const idx = q.options.findIndex(o => o.isCorrect);
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
            new TextRun({ text: String.fromCharCode(65 + Math.max(0, idx)), size: 22 }),
          ],
        }));
      } else {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `${i + 1}. `, bold: true, size: 22 }),
            new TextRun({ text: clean(q.answer) || 'Resposta dissertativa', italics: true, size: 22 }),
          ],
        }));
      }

      const commentedResolution = getCommentedResolution(q);
      if (commentedResolution) {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: 'Resolução comentada: ', bold: true, size: 22 }),
            new TextRun({ text: commentedResolution, size: 22 }),
          ],
        }));
      }
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${header.title || 'avaliacao'}.docx`);
}
