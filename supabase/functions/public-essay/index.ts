import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, accessCode, submissionId, essayText, studentName, studentClass, question } =
      await req.json();

    if (!accessCode) return json({ error: "Código de acesso é obrigatório." }, 400);
    const code = String(accessCode).trim();

    // Every action re-verifies the code against the row it targets.
    // No action ever trusts a bare submissionId without the matching code.
    const { data: submission, error: fetchError } = await supabase
      .from("essay_submissions")
      .select("*")
      .eq("access_code", code)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!submission) return json({ error: "Proposta não encontrada." }, 404);

    // For actions targeting a specific row (submit/save/ask), make sure the
    // caller isn't passing a different submissionId than the one their code resolves to.
    if (submissionId && submissionId !== submission.id) {
      return json({ error: "Código de acesso não corresponde a esta submissão." }, 403);
    }

    if (action === "fetch") {
      let history: any[] = [];
      if (submission.student_name) {
        const { data: hist } = await supabase
          .from("essay_submissions")
          .select("*")
          .eq("teacher_user_id", submission.teacher_user_id)
          .eq("student_name", submission.student_name)
          .eq("status", "corrected")
          .order("created_at", { ascending: false })
          .limit(5);
        history = hist || [];
      }
      return json({ submission, history });
    }

    if (action === "save_draft") {
      const { error } = await supabase.from("essay_submissions").update({
        essay_text: essayText ?? submission.essay_text,
        student_name: (studentName ?? submission.student_name)?.trim(),
        student_class: (studentClass ?? submission.student_class)?.trim(),
      }).eq("id", submission.id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "submit") {
      if (!essayText || essayText.trim().length < 50) {
        return json({ error: "Escreva pelo menos 50 caracteres." }, 400);
      }
      if (!studentName || !studentName.trim()) {
        return json({ error: "Nome é obrigatório." }, 400);
      }
      const { error } = await supabase.from("essay_submissions").update({
        essay_text: essayText.trim(),
        student_name: studentName.trim(),
        student_class: (studentClass || "").trim(),
        status: "submitted",
      }).eq("id", submission.id);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "ask_question") {
      if (!question || !question.trim()) return json({ error: "Escreva sua dúvida." }, 400);
      const existingNotes = submission.teacher_notes || "";
      const appended = existingNotes
        ? `${existingNotes}\n[DÚVIDA ALUNO] ${question.trim()}`
        : `[DÚVIDA ALUNO] ${question.trim()}`;
      const { error } = await supabase.from("essay_submissions").update({
        teacher_notes: appended,
      }).eq("id", submission.id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("public-essay error:", e);
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
