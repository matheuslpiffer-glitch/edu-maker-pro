import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, simulatorId, studentName, studentClass, answers, elapsedSeconds, isTeacherPreview } =
      await req.json();

    if (!simulatorId) {
      return new Response(JSON.stringify({ error: "ID do simulado é obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sim, error: fetchError } = await supabase
      .from("simulators")
      .select("id, title, institution_name, exam_type, grade, subject_area, user_id, questions, access_code")
      .eq("id", simulatorId)
      .single();

    if (fetchError || !sim) {
      return new Response(JSON.stringify({ error: "Simulado não encontrado." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only simulators explicitly shared (have an access_code) are reachable
    // through this anonymous endpoint. Private simulators must never be
    // accessible just by knowing the internal UUID.
    if (!sim.access_code) {
      return new Response(JSON.stringify({ error: "Simulado indisponível." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = (sim.questions as any[]) || [];

    // ACTION: fetch — return questions WITHOUT isCorrect
    if (action === "fetch") {
      const sanitized = questions.map((q: any) => ({
        content: q.content || "",
        options: (q.options || []).map((o: any) => ({
          letter: o.letter,
          text: o.text,
          // DO NOT include isCorrect
        })),
        skillCode: q.skillCode,
        descriptor: q.descriptor,
        answerLines: q.answerLines,
      }));

      return new Response(JSON.stringify({
        id: sim.id,
        title: sim.title,
        institution_name: sim.institution_name,
        exam_type: sim.exam_type,
        grade: sim.grade,
        subject_area: sim.subject_area,
        user_id: sim.user_id,
        questions: sanitized,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: submit — grade server-side and save result
    if (action === "submit") {
      if (!studentName || !studentClass || !answers) {
        return new Response(JSON.stringify({ error: "Nome, turma e respostas são obrigatórios." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const gradable = questions.filter(
        (q: any) => Array.isArray(q.options) && q.options.length > 0,
      );
      const totalQuestions = gradable.length || questions.length;

      const correctCount = gradable.reduce((score: number, q: any, index: number) => {
        const selected = answers[index];
        const correctOption = (q.options || []).find((o: any) => o.isCorrect)?.letter;
        return score + (selected === correctOption ? 1 : 0);
      }, 0);

      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const proficiencyLevel =
        percentage < 25 ? "abaixo_basico" :
        percentage < 50 ? "basico" :
        percentage < 75 ? "proficiente" : "avancado";

      const { error: insertError } = await supabase.from("student_results").insert({
        user_id: sim.user_id,
        simulator_id: sim.id,
        student_name: isTeacherPreview ? `[Teste de Professor] ${String(studentName).trim()}` : String(studentName).trim().slice(0, 200),
        student_class: isTeacherPreview ? `[TESTE] ${String(studentClass).trim()}` : String(studentClass).trim().slice(0, 100),
        correct_count: correctCount,
        total_questions: totalQuestions,
        percentage,
        proficiency_level: proficiencyLevel,
      });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({
        correct: correctCount,
        total: totalQuestions,
        percentage,
        timeSeconds: elapsedSeconds || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'fetch' ou 'submit'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("public-simulator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
