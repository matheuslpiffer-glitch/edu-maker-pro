type JsonObject = Record<string, any>;
type RequestBody = Record<string, any>;

export function parseCompleteObject(raw: string, repair: (text: string) => string): JsonObject {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  if (start < 0) throw new Error('Missing JSON object');
  // Never fabricate missing scores or transcription by closing truncated output.
  let inString = false;
  let escaped = false;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) {
      const text = cleaned.slice(start, i + 1);
      let parsed: unknown;
      try { parsed = JSON.parse(text); }
      catch { parsed = JSON.parse(repair(text)); }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JSON object');
      return parsed as JsonObject;
    }
  }
  throw new Error('Incomplete JSON object');
}

export function isTranscription(value: JsonObject): boolean {
  return value.error === 'IMAGEM_ILEGIVEL' || typeof value.transcribed_text === 'string';
}

export function isCorrection(value: JsonObject): boolean {
  return Array.isArray(value.scores) && value.scores.length > 0 &&
    value.scores.every((item: any) => item && typeof item.criteria === 'string' &&
      Number.isFinite(item.score) && Number.isFinite(item.max)) &&
    Number.isFinite(value.total_score) && Number.isFinite(value.max_total) &&
    ['strengths', 'improvements'].every(key => Array.isArray(value[key]) && value[key].every((item: unknown) => typeof item === 'string')) &&
    typeof value.feedback_aluno === 'string' && typeof value.feedback_professor === 'string';
}

export function isIntervention(value: JsonObject): boolean {
  return ['biggest_gap', 'gap_explanation', 'theory_snippet'].every(key => typeof value[key] === 'string') &&
    Array.isArray(value.activities) && value.activities.length > 0 &&
    value.activities.every((item: any) => item && ['title', 'description', 'duration'].every(key => typeof item[key] === 'string'));
}

export async function requestStructuredJson(
  call: (body: RequestBody) => Promise<Response>,
  body: RequestBody,
  validate: (value: JsonObject) => boolean,
  repair: (text: string) => string,
): Promise<{ response: Response; parsed?: JsonObject }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await call({
      ...body,
      response_format: { type: 'json_object' },
      max_tokens: attempt === 0 ? body.max_tokens : Math.min(body.max_tokens * 2, 32768),
    });
    if (!response.ok) return { response };
    const data = await response.json();
    const choice = data.choices?.[0];
    try {
      if (choice?.finish_reason === 'length' || choice?.finish_reason === 'MAX_TOKENS') throw new Error('Token limit');
      if (typeof choice?.message?.content !== 'string') throw new Error('Missing content');
      const parsed = parseCompleteObject(choice.message.content, repair);
      if (!validate(parsed)) throw new Error('Missing result fields');
      return { response, parsed };
    } catch {
      // Log metadata only: essay text and feedback must remain private.
      console.warn('Elite structured response rejected', { attempt: attempt + 1, finishReason: choice?.finish_reason });
    }
  }
  throw new Error('A IA não concluiu a resposta em um formato válido. Tente novamente em instantes.');
}