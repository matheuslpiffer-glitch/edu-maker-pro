// Pure post-generation checks for AEE (inclusion) activities. No Deno imports so vitest can cover it.

const THREE_OPTION_PROFILES = new Set(["aee_intelectual", "aee_dm"]);
const LETTERS = ["A", "B", "C", "D", "E"];

type Option = { letter?: string; text?: string; isCorrect?: boolean };
type Question = { content?: string; options?: Option[]; imageUrl?: string; imagePrompt?: string; adaptationNote?: string; [k: string]: unknown };

const stripTags = (s: string) => String(s ?? "").replace(/<[^>]*>/g, "").replace(/\$/g, "").trim();

export function maxOptionsFor(profileKeys: string[]): number | null {
  return profileKeys.some((k) => THREE_OPTION_PROFILES.has(k)) ? 3 : null;
}

export function enforceAeeRules(questions: Question[], profileKeys: string[]): Question[] {
  const max = maxOptionsFor(profileKeys);
  return (Array.isArray(questions) ? questions : []).map((q) => {
    const out: Question = { ...q };
    // External placeholder images are unreliable; teachers generate pictures on demand from imagePrompt.
    if (typeof out.imageUrl === "string" && /pollinations/i.test(out.imageUrl)) delete out.imageUrl;
    if (typeof out.content === "string") out.content = out.content.replace(/<img[^>]*pollinations[^>]*>/gi, "");

    let opts = Array.isArray(q.options) ? q.options.map((o) => ({ ...o, text: stripTags(o.text ?? "") })) : [];
    opts = opts.filter((o) => o.text);
    if (opts.length > 0) {
      let correctIdx = opts.findIndex((o) => o.isCorrect === true);
      if (correctIdx === -1) correctIdx = 0;
      opts = opts.map((o, i) => ({ ...o, isCorrect: i === correctIdx }));
      if (max && opts.length > max) {
        const correct = opts[correctIdx];
        const others = opts.filter((_, i) => i !== correctIdx).slice(0, max - 1);
        // keep original relative order
        opts = opts.filter((o) => o === correct || others.includes(o));
      }
      opts = opts.map((o, i) => ({ ...o, letter: LETTERS[i] }));
    }
    out.options = opts;
    return out;
  });
}
