import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

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
  const html2pdf = (await import('html2pdf.js')).default;
  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: element.scrollWidth },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
  await html2pdf().set(opt).from(element).save();
}

export async function exportToDocx(
  header: Header,
  questions: Question[],
  subjects: Subject[],
  includeGabarito: boolean
) {
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    children: [new TextRun({ text: header.institutionName || 'Instituição', bold: true, size: 28 })],
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: header.title || 'Avaliação', bold: true, size: 24 })],
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `Professor: ${header.teacherName}  |  Data: ${header.date}  |  Turma: ${header.className}`, size: 20 })],
    alignment: AlignmentType.CENTER,
  }));
  children.push(new Paragraph({ text: '' }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'Nome: __________________________________________ Nº: ______', size: 20 })] }));
  children.push(new Paragraph({ text: '' }));

  questions.forEach((q, i) => {
    const subject = subjects.find(s => s.id === q.subject_id);
    const contentText = stripHtml(q.content);
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `${i + 1}) `, bold: true, size: 22 }),
        new TextRun({ text: `[${subject?.name || ''}] `, italics: true, size: 18, color: '888888' }),
        new TextRun({ text: contentText, size: 22 }),
      ],
    }));

    if (q.type === 'multiple-choice') {
      q.options.forEach((opt, j) => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `     ${String.fromCharCode(97 + j)}) ${opt.text}`, size: 22 })],
        }));
      });
    } else {
      for (let j = 0; j < 6; j++) {
        children.push(new Paragraph({ children: [new TextRun({ text: '_'.repeat(80), size: 20 })] }));
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
