/**
 * Converte a resposta em Markdown do assistente Mat em um documento HTML
 * A4 profissional (Arial, margens respeitadas, sem "cara de comando").
 *
 * Regras:
 * - Remove cercas ```, marcadores **, ---, `code` da visualização crua.
 * - Diagramas em bloco (ASCII) viram caixas monoespaçadas centralizadas.
 * - Títulos, listas, tabelas e questões recebem estilo tipográfico limpo.
 */

import { sanitizeChatText } from '@/lib/chat-sanitize';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Formatação inline: negrito, itálico e código. */
function inline(raw: string): string {
  let s = escapeHtml(raw);
  s = s.replace(/`([^`]+)`/g, '<span class="mono">$1</span>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  return s;
}

function isTableRow(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line);
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** Markdown -> HTML enxuto e tipograficamente limpo. */
export function markdownToDocumentHtml(markdown: string): string {
  const text = sanitizeChatText(markdown || '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const out: string[] = [];

  let i = 0;
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Bloco de código / diagrama ASCII
    if (/^\s*```/.test(line)) {
      closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      const body = buf.join('\n').replace(/^\n+|\n+$/g, '');
      if (body.trim()) {
        out.push(`<figure class="diagram"><pre>${escapeHtml(body)}</pre></figure>`);
      }
      continue;
    }

    // Tabela
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      out.push(
        `<table class="doc-table"><thead><tr>${header
          .map((h) => `<th>${inline(h)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      );
      continue;
    }

    // Linha horizontal (Markdown ---) - Removida para evitar "cara de comando"
    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
      closeList();
      // Apenas um espaçador vazio em vez de uma linha visível
      out.push('<div class="doc-spacer"></div>');
      i++;
      continue;
    }

    // Títulos
    const heading = line.match(/^\s*(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      out.push(`<h${level} class="doc-h${level}">${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // Listas
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      const wanted: 'ul' | 'ol' = bullet ? 'ul' : 'ol';
      if (listType && listType !== wanted) closeList();
      if (!listType) {
        listType = wanted;
        out.push(`<${wanted} class="doc-list">`);
      }
      out.push(`<li>${inline((bullet ? bullet[1] : ordered![1]) || '')}</li>`);
      i++;
      continue;
    }

    // Linha em branco
    if (!line.trim()) {
      closeList();
      i++;
      continue;
    }

    // Parágrafo (agrupa linhas contíguas)
    closeList();
    const para: string[] = [line.trim()];
    i++;
    // Alternativas (a), b)...) sempre ocupam uma linha própria
    if (/^\s*\*{0,2}[a-eA-E][).]\s/.test(line)) {
      out.push(`<p class="doc-option">${inline(line.trim())}</p>`);
      continue;
    }
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*(#{1,4}\s|[-*•]\s|\d+[.)]\s|```|\|)/.test(lines[i]) &&
      !/^\s*\*{0,2}[a-eA-E][).]\s/.test(lines[i]) &&
      !/^\s*(---+|\*\*\*+|___+)\s*$/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }

    const joined = para.join(' ');
    // Enunciados numerados e cabeçalhos de parte ganham destaque de bloco
    if (/^(PARTE|BLOCO|SEÇÃO|GABARITO)\b/i.test(joined)) {
      out.push(`<h3 class="doc-part">${inline(joined)}</h3>`);
    } else if (/^\*{0,2}\d+[.)]\s/.test(joined)) {
      out.push(`<p class="doc-question">${inline(joined)}</p>`);
    } else if (/^[a-eA-E][)\.]\s/.test(joined)) {
      out.push(`<p class="doc-option">${inline(joined)}</p>`);
    } else if (/^(LISTA|ATIVIDADE|AVALIAÇÃO|PROVA|SIMULADO)\b[^.]{0,80}$/i.test(joined)) {
      out.push(`<h2 class="doc-h2">${inline(joined)}</h2>`);
    } else {
      out.push(`<p class="doc-p">${inline(joined)}</p>`);
    }
  }

  closeList();
  return out.join('\n');
}

export interface MatDocumentOptions {
  title?: string;
  subtitle?: string;
  footer?: string;
  /** Margem uniforme em mm aplicada pelo html2pdf. */
  marginMm?: number;
}

/** Documento completo pronto para captura em PDF A4. */
export function buildMatDocument(markdown: string, opts: MatDocumentOptions = {}): HTMLElement {
  const {
    title = 'EduCreator Pro',
    subtitle = 'Material Pedagógico Gerado pelo Assistente Mat',
    footer = 'Desenvolvido por Matheus Lima Piffer',
  } = opts;

  const el = document.createElement('div');
  el.setAttribute('data-mat-document', 'true');
  el.innerHTML = `
    <style>
      [data-mat-document] {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #111827;
        background: #ffffff;
        text-align: justify;
        word-break: normal;
        overflow-wrap: break-word;
      }
      [data-mat-document] .doc-header {
        text-align: center;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-bottom: 18px;
      }
      [data-mat-document] .doc-header h1 {
        margin: 0;
        font-size: 15pt;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: #0f172a;
      }
      [data-mat-document] .doc-header p {
        margin: 4px 0 0;
        font-size: 8.5pt;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: .08em;
      }
      [data-mat-document] .doc-h2 {
        font-size: 12.5pt;
        text-transform: uppercase;
        margin: 18px 0 8px;
        padding-bottom: 4px;
        border-bottom: 1px solid #cbd5e1;
        text-align: left;
        break-after: avoid;
      }
      [data-mat-document] .doc-h3, [data-mat-document] .doc-part {
        font-size: 11.5pt;
        margin: 16px 0 6px;
        color: #0f172a;
        text-align: left;
        break-after: avoid;
      }
      [data-mat-document] .doc-h4 { font-size: 11pt; margin: 12px 0 4px; text-align: left; }
      [data-mat-document] .doc-p { margin: 0 0 9px; }
      [data-mat-document] .doc-question {
        margin: 14px 0 6px;
        font-weight: 700;
        text-align: left;
        break-inside: avoid;
      }
      [data-mat-document] .doc-option {
        margin: 0 0 3px 14px;
        text-align: left;
        break-inside: avoid;
      }
      [data-mat-document] .doc-list { margin: 0 0 10px 0; padding-left: 20px; }
      [data-mat-document] ul.doc-list { list-style: disc outside; }
      [data-mat-document] ol.doc-list { list-style: decimal outside; }
      [data-mat-document] .doc-list li { margin-bottom: 4px; text-align: left; }
      [data-mat-document] .doc-spacer {
        height: 12px;
        margin: 0;
      }
      [data-mat-document] .mono {
        font-family: 'Courier New', monospace;
        font-size: 10pt;
      }
      [data-mat-document] .diagram {
        margin: 10px auto 14px;
        padding: 10px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #f8fafc;
        display: table;
        break-inside: avoid;
      }
      [data-mat-document] .diagram pre {
        margin: 0;
        font-family: 'Courier New', monospace;
        font-size: 10pt;
        line-height: 1.25;
        white-space: pre;
        text-align: left;
      }
      [data-mat-document] .doc-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0 14px;
        font-size: 10pt;
        break-inside: avoid;
      }
      [data-mat-document] .doc-table th,
      [data-mat-document] .doc-table td {
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      [data-mat-document] .doc-table th {
        background: #f1f5f9;
        text-transform: uppercase;
        font-size: 9pt;
      }
      [data-mat-document] .doc-footer {
        margin-top: 22px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        font-size: 8pt;
        color: #94a3b8;
      }
    </style>
    <header class="doc-header">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(subtitle)}</p>
    </header>
    <main class="doc-body">${markdownToDocumentHtml(markdown)}</main>
    <footer class="doc-footer">${escapeHtml(footer)}</footer>
  `;
  return el;
}
