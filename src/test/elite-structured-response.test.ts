import { describe, expect, it, vi } from 'vitest';
import { jsonrepair } from 'jsonrepair';
import { isCorrection, isTranscription, parseCompleteObject, requestStructuredJson } from '../../supabase/functions/correct-essay-elite/structured-response';

const response = (content: string, finish_reason = 'stop') => new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason }] }));

describe('Elite structured responses', () => {
  it('reads fenced JSON and preserves paragraphs, quotes and braces in transcription', () => {
    const text = 'Parágrafo 1 {exemplo}\nParágrafo 2 "citação"';
    expect(parseCompleteObject('```json\n' + JSON.stringify({ transcribed_text: text }) + '\n```', jsonrepair).transcribed_text).toBe(text);
  });
  it('repairs literal newlines and trailing commas in a complete object', () => {
    expect(parseCompleteObject('{"transcribed_text":"Primeiro\nSegundo",}', jsonrepair).transcribed_text).toBe('Primeiro\nSegundo');
  });
  it('rejects truncation after a completed nested score rather than inventing results', () => {
    expect(() => parseCompleteObject('{"scores":[{"score":40,"max":200}],"feedback_aluno":"cortado', jsonrepair)).toThrow();
  });
  it('retries token-limited output once with a larger budget and JSON mode', async () => {
    const call = vi.fn().mockResolvedValueOnce(response('{"transcribed_text":"partial"}', 'length')).mockResolvedValueOnce(response('{"transcribed_text":"Completo"}'));
    const result = await requestStructuredJson(call, { max_tokens: 8192 }, isTranscription, jsonrepair);
    expect(result.parsed?.transcribed_text).toBe('Completo');
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[1][0]).toMatchObject({ max_tokens: 16384, response_format: { type: 'json_object' } });
  });
  it('retries malformed JSON but fails safely if both attempts are incomplete', async () => {
    const call = vi.fn().mockImplementation(async () => response('{"transcribed_text":"cortado'));
    await expect(requestStructuredJson(call, { max_tokens: 8192 }, isTranscription, jsonrepair)).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(2);
  });
  it('does not retry upstream authorization or credit errors', async () => {
    const call = vi.fn().mockResolvedValue(new Response('{}', { status: 402 }));
    expect((await requestStructuredJson(call, { max_tokens: 8192 }, isTranscription, jsonrepair)).response.status).toBe(402);
    expect(call).toHaveBeenCalledTimes(1);
  });
  it('rejects parseable JSON without the correction fields the screen needs', () => {
    expect(isCorrection({ scores: [{ criteria: 'Coesão', score: 40, max: 200 }] })).toBe(false);
    expect(isCorrection({ scores: [{ criteria: 'Coesão', score: 40, max: 200 }], total_score: 40, max_total: 200, strengths: [], improvements: [], feedback_aluno: 'Feedback', feedback_professor: 'Análise' })).toBe(true);
  });
});