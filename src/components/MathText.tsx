import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text?: string;
  content?: string;
  className?: string;
}

type Segment = { type: 'text' | 'math'; content: string; display: boolean };

/** Detects if a $...$ block is likely real math (not currency or random). */
function looksLikeMath(s: string): boolean {
  if (!s || s.length > 500) return false;
  // Common LaTeX hints
  if (/\\[a-zA-Z]+/.test(s)) return true;
  if (/[\^_{}]/.test(s)) return true;
  if (/[=+\-*/<>](?!\s*$)/.test(s) && /[a-zA-Z]/.test(s)) return true;
  return false;
}

/** Currency guard: a "$" preceded by R/r OR followed by digit (optionally with space) is money. */
function isMoneyDollar(text: string, idx: number): boolean {
  const prev = text[idx - 1];
  if (prev === 'R' || prev === 'r') return true;
  // immediately followed by digit, or whitespace+digit
  const after = text.slice(idx + 1, idx + 6);
  if (/^\s*\d/.test(after)) return true;
  return false;
}

function parseSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  const pushText = (ch: string) => {
    const last = segs[segs.length - 1];
    if (last && last.type === 'text') last.content += ch;
    else segs.push({ type: 'text', content: ch, display: false });
  };

  let i = 0;
  const n = text.length;
  while (i < n) {
    // \[ ... \]
    if (text.startsWith('\\[', i)) {
      const end = text.indexOf('\\]', i + 2);
      if (end !== -1) {
        segs.push({ type: 'math', content: text.slice(i + 2, end), display: true });
        i = end + 2; continue;
      }
    }
    // \( ... \)
    if (text.startsWith('\\(', i)) {
      const end = text.indexOf('\\)', i + 2);
      if (end !== -1) {
        segs.push({ type: 'math', content: text.slice(i + 2, end), display: false });
        i = end + 2; continue;
      }
    }
    // $$ ... $$
    if (text.startsWith('$$', i)) {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        segs.push({ type: 'math', content: text.slice(i + 2, end), display: true });
        i = end + 2; continue;
      }
    }
    // $ ... $ (with currency guard + math syntax check)
    if (text[i] === '$') {
      if (!isMoneyDollar(text, i)) {
        // find next $ that isn't $$ continuation
        let j = i + 1;
        while (j < n) {
          if (text[j] === '$' && text[j + 1] !== '$' && text[j - 1] !== '\\') break;
          j++;
        }
        if (j < n && text[j] === '$') {
          const inner = text.slice(i + 1, j);
          if (looksLikeMath(inner) && !inner.includes('\n\n')) {
            segs.push({ type: 'math', content: inner, display: false });
            i = j + 1; continue;
          }
        }
      }
    }
    pushText(text[i]);
    i++;
  }
  return segs;
}

function renderMathSafe(src: string, displayMode: boolean): string {
  try {
    return katex.renderToString(src, {
      throwOnError: false,
      displayMode,
      strict: 'ignore',
      output: 'html',
    });
  } catch {
    // Absolute fallback: return raw text escaped
    const escaped = src.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
    return `<span>${displayMode ? '\\[' : '\\('}${escaped}${displayMode ? '\\]' : '\\)'}</span>`;
  }
}

const MathText: React.FC<MathTextProps> = ({ text, content, className = '' }) => {
  const raw = (text ?? content ?? '').toString();
  const segments = useMemo(() => parseSegments(raw), [raw]);

  if (!raw) return null;

  return (
    <div className={className}>
      {segments.map((s, idx) =>
        s.type === 'math' ? (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: renderMathSafe(s.content, s.display) }}
          />
        ) : (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: s.content }}
          />
        )
      )}
    </div>
  );
};

export default MathText;