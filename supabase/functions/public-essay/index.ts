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

    const { 
      action, 
      accessCode, 
      submissionId, 
      essayText, 
      studentName, 
      studentClass, 
      question 
    } = await req.json();

    if (!accessCode) {
      return json({ error: "Código de acesso é obrigatório." }, 400);
    }

    if (action === "fetch") {
      // Busca a redação APENAS se o access_code bater
      const { data: submission, error: fetchError } = await supabase
        .from("essay_submissions")
        .select(`
          id,
          access_code,
          student_name,
          student_class,
          essay_text,
          status,
          grade_final,
          feedback_text,
          correction_json,
          created_at,
          proposal_content
        `)
        .eq("access_code", accessCode)
        .single();

      if (fetchError || !submission) {
        return json({ error: "Redação não encontrada ou código inválido." }, 404);
      }

      // Oculta teacher_notes e outros campos privados se houver
      return json(submission);
    }

    if (action === "submit") {
      if (!submissionId) return json({ error: "ID da submissão é obrigatório para envio." }, 400);
      if (!essayText) return json({ error: "O texto da redação não pode estar vazio." }, 400);

      // Valida o access_code antes de permitir o update
      const { data: check, error: checkError } = await supabase
        .from("essay_submissions")
        .select("id, status")
        .eq("id", submissionId)
        .eq("access_code", accessCode)
        .single();

      if (checkError || !check) {
        return json({ error: "Não autorizado a atualizar esta redação." }, 403);
      }

      if (check.status === "corrected") {
        return json({ error: "Esta redação já foi corrigida e não pode ser alterada." }, 400);
      }

      const { data, error } = await supabase
        .from("essay_submissions")
        .update({
          essay_text: essayText,
          student_name: studentName,
          student_class: studentClass,
          status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", submissionId)
        .select()
        .single();

      if (error) throw error;
      return json(data);
    }

    return json({ error: "Ação inválida." }, 400);

  } catch (error) {
    console.error(error);
    return json({ error: error.message }, 500);
  }
});
