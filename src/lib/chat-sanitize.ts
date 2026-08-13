/**
 * Remove metadados técnicos (payloads JSON internos como {"database":"video",...})
 * do texto exibido no chat, mantendo apenas a mensagem humanizada.
 */
export function sanitizeChatText(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // Remove blocos JSON no início da string que contenham chaves internas
  for (let guard = 0; guard < 3 && text.startsWith('{'); guard++) {
    let depth = 0;
    let end = -1;
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) break;

    const block = text.slice(0, end + 1);
    if (!/"(database|action_final|texto_limpo|anexos_presentes)"/.test(block)) break;

    // Preserva o texto humanizado se estiver embutido no payload
    let inner = '';
    try {
      const parsed = JSON.parse(block) as Record<string, unknown>;
      const candidate = parsed.texto_limpo ?? parsed.resposta ?? parsed.texto;
      if (typeof candidate === 'string') inner = candidate.trim();
    } catch { /* payload parcial durante o streaming */ }

    text = (inner ? inner + '\n\n' : '') + text.slice(end + 1).trim();
    text = text.trim();
  }

  // Remove blocos JSON internos remanescentes e tags de debug
  return text
    // Blocos cercados (```json ... ``` ou ``` { ... } ```) com payload interno
    .replace(
      /```[a-zA-Z]*\s*\{[\s\S]*?"(?:database|action_final|texto_limpo|anexos_presentes|conteudo_json|tipo_documento|nivel_complexidade|componente_curricular|secoes)"[\s\S]*?\}\s*```/g,
      '',
    )
    // Payload JSON solto (sem cercas) ao final da resposta
    .replace(
      /\n\s*\{\s*"(?:database|action_final|texto_limpo|conteudo_json|tipo_documento|nivel_complexidade|componente_curricular|titulo)"[\s\S]*\}\s*$/,
      '',
    )
    .replace(/\[VIDEO_PROMPT:[\s\S]*?\]/g, '')
    .replace(/\[IMAGE_DATA:[\s\S]*?\]/g, '')
    .replace(/\[ANEXOS_PRESENTES:[\s\S]*?\]/g, '')
    .trim();
}
