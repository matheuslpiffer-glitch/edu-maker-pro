// Converts LaTeX-flavored math to plain Unicode for use in non-LaTeX contexts
// (DOCX exports, plain text emails, WhatsApp, etc.).
// Renderização visual (KaTeX) NÃO usa esta função.

const SUPER_DIGITS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
};
const SUB_DIGITS: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
};

const SYMBOLS: Array<[RegExp, string]> = [
  [/\\circ\b/g, '°'],
  [/\\times\b/g, '×'],
  [/\\div\b/g, '÷'],
  [/\\pm\b/g, '±'],
  [/\\mp\b/g, '∓'],
  [/\\leq\b/g, '≤'],
  [/\\geq\b/g, '≥'],
  [/\\neq\b/g, '≠'],
  [/\\approx\b/g, '≈'],
  [/\\cdot\b/g, '·'],
  [/\\ldots\b/g, '…'],
  [/\\cdots\b/g, '⋯'],
  [/\\infty\b/g, '∞'],
  [/\\rightarrow\b/g, '→'],
  [/\\leftarrow\b/g, '←'],
  [/\\Rightarrow\b/g, '⇒'],
  [/\\Leftarrow\b/g, '⇐'],
  [/\\to\b/g, '→'],
  // Greek
  [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'],
  [/\\delta\b/g, 'δ'], [/\\epsilon\b/g, 'ε'], [/\\zeta\b/g, 'ζ'],
  [/\\eta\b/g, 'η'], [/\\theta\b/g, 'θ'], [/\\iota\b/g, 'ι'],
  [/\\kappa\b/g, 'κ'], [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'],
  [/\\nu\b/g, 'ν'], [/\\xi\b/g, 'ξ'], [/\\pi\b/g, 'π'],
  [/\\rho\b/g, 'ρ'], [/\\sigma\b/g, 'σ'], [/\\tau\b/g, 'τ'],
  [/\\upsilon\b/g, 'υ'], [/\\phi\b/g, 'φ'], [/\\chi\b/g, 'χ'],
  [/\\psi\b/g, 'ψ'], [/\\omega\b/g, 'ω'],
  [/\\Gamma\b/g, 'Γ'], [/\\Delta\b/g, 'Δ'], [/\\Theta\b/g, 'Θ'],
  [/\\Lambda\b/g, 'Λ'], [/\\Xi\b/g, 'Ξ'], [/\\Pi\b/g, 'Π'],
  [/\\Sigma\b/g, 'Σ'], [/\\Phi\b/g, 'Φ'], [/\\Psi\b/g, 'Ψ'],
  [/\\Omega\b/g, 'Ω'],
];

// Find a balanced {...} group starting at index `start` (str[start] === '{').
// Returns the inner content and the index AFTER the closing '}'.
function readBraceGroup(str: string, start: number): { inner: string; end: number } | null {
  if (str[start] !== '{') return null;
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    const c = str[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { inner: str.slice(start + 1, i), end: i + 1 };
    }
  }
  return null;
}

function isMultiTerm(s: string): boolean {
  // More than one "term" → wrap in parentheses.
  // Heuristic: contains operators or whitespace between symbols.
  return /[+\-*/=\s,]/.test(s.trim()) && s.trim().length > 1;
}

function toSuperscript(s: string): string {
  let out = '';
  for (const ch of s) {
    if (SUPER_DIGITS[ch]) out += SUPER_DIGITS[ch];
    else return ''; // not fully convertible
  }
  return out;
}

function toSubscript(s: string): string {
  let out = '';
  for (const ch of s) {
    if (SUB_DIGITS[ch]) out += SUB_DIGITS[ch];
    else return '';
  }
  return out;
}

function processMathContent(input: string): string {
  let s = input;

  // \frac{a}{b}
  let prev = '';
  while (prev !== s) {
    prev = s;
    const m = /\\d?frac\s*\{/.exec(s);
    if (!m) break;
    const idx = m.index;
    const numStart = idx + m[0].length - 1; // position of '{'
    const num = readBraceGroup(s, numStart);
    if (!num) break;
    // skip optional whitespace
    let j = num.end;
    while (j < s.length && s[j] === ' ') j++;
    const den = readBraceGroup(s, j);
    if (!den) break;
    const a = processMathContent(num.inner);
    const b = processMathContent(den.inner);
    const aWrap = isMultiTerm(a) ? `(${a})` : a;
    const bWrap = isMultiTerm(b) ? `(${b})` : b;
    s = s.slice(0, idx) + `${aWrap}/${bWrap}` + s.slice(den.end);
  }

  // \sqrt[n]{x} or \sqrt{x}
  prev = '';
  while (prev !== s) {
    prev = s;
    const idx = s.indexOf('\\sqrt');
    if (idx === -1) break;
    let j = idx + '\\sqrt'.length;
    let rootPrefix = '√';
    if (s[j] === '[') {
      const close = s.indexOf(']', j);
      if (close !== -1) {
        const n = s.slice(j + 1, close).trim();
        const sup = toSuperscript(n);
        if (sup) rootPrefix = `${sup}√`;
        j = close + 1;
      }
    }
    if (s[j] !== '{') {
      // \sqrt followed by a single char/token
      const m = /^\s*([A-Za-z0-9])/.exec(s.slice(j));
      if (m) {
        s = s.slice(0, idx) + rootPrefix + m[1] + s.slice(j + m[0].length);
        continue;
      }
      s = s.slice(0, idx) + rootPrefix + s.slice(j);
      continue;
    }
    const grp = readBraceGroup(s, j);
    if (!grp) break;
    const inner = processMathContent(grp.inner);
    const wrapped = isMultiTerm(inner) ? `(${inner})` : inner;
    s = s.slice(0, idx) + rootPrefix + wrapped + s.slice(grp.end);
  }

  // Symbols
  for (const [re, rep] of SYMBOLS) s = s.replace(re, rep);

  // Superscripts
  // ^\circ → °
  s = s.replace(/\^\\circ\b/g, '°');
  // ^{...} numeric only → unicode superscript
  s = s.replace(/\^\{([^{}]*)\}/g, (m, inner) => {
    const sup = toSuperscript(inner);
    return sup || `^(${inner})`;
  });
  // ^digit
  s = s.replace(/\^(-?\d)/g, (m, d) => {
    const sup = toSuperscript(d);
    return sup || m;
  });

  // Subscripts
  s = s.replace(/_\{([^{}]*)\}/g, (m, inner) => {
    const sub = toSubscript(inner);
    return sub || `_(${inner})`;
  });
  s = s.replace(/_(-?\d)/g, (m, d) => {
    const sub = toSubscript(d);
    return sub || m;
  });

  // \text{...} → just the inner content
  s = s.replace(/\\text\s*\{([^{}]*)\}/g, '$1');
  // \mathrm{...} / \mathbf{...} → inner
  s = s.replace(/\\math(?:rm|bf|it|sf|tt)\s*\{([^{}]*)\}/g, '$1');

  // Remove leftover \left and \right
  s = s.replace(/\\left\s*/g, '').replace(/\\right\s*/g, '');

  // Strip remaining backslashed commands of form \word
  s = s.replace(/\\([a-zA-Z]+)\b\s?/g, '$1');

  return s;
}

/**
 * Convert LaTeX math markup to plain Unicode text suitable for DOCX export.
 * Handles \(...\), \[...\], $$...$$, $...$ delimiters and common commands.
 * Currency "R$ 50,00" stays untouched because the regex requires a closing $.
 */
export function latexToUnicode(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input);

  // Process delimited segments first.
  // \[ ... \]
  s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => processMathContent(inner));
  // \( ... \)
  s = s.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => processMathContent(inner));
  // $$ ... $$
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (_m, inner) => processMathContent(inner));
  // $ ... $  (avoid currency: skip if preceded by R/r or followed by digit only as money)
  s = s.replace(/(^|[^\\A-Za-z0-9])\$([^\$\n]+?)\$/g, (m, pre, inner) => {
    // Skip currency-like single $50,00 with no math operators
    if (/^\s*\d[\d.,\s]*$/.test(inner)) return m;
    return `${pre}${processMathContent(inner)}`;
  });

  // Sometimes the AI emits bare LaTeX without delimiters.
  // Run a light pass to convert common commands outside of delimiters.
  s = processMathContent(s);

  // Cleanup leftover orphan braces / stray backslashes / dollar signs at edges of tokens
  s = s.replace(/\{([^{}]*)\}/g, '$1'); // unwrap simple {x}
  s = s.replace(/\\(?=[^A-Za-z])/g, ''); // stray backslashes
  // Collapse multiple spaces
  s = s.replace(/[ \t]{2,}/g, ' ');

  return s;
}
