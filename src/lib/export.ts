import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { RGF_DEFAULT, rgfText } from '@/lib/rgf-format';

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

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

export async function exportToPDF(element: HTMLElement, filename: string) {
  const { generatePdfFromElement } = await import('@/lib/pdf-utils');
  await generatePdfFromElement(element, filename, { margins: [15, 15, 15, 15] });
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
    const contentText = stripHtml(q.content);
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
          children: [new TextRun({ text: rgfText(`     ${String.fromCharCode(97 + j)}) ${opt.text}`), size: sz, font })],
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
            new TextRun({ text: q.answer || 'Resposta dissertativa', italics: true, size: 22 }),
          ],
        }));
      }
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${header.title || 'avaliacao'}.docx`);
}
