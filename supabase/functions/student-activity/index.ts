import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, bankId, studentName, studentClass, answers } = await req.json();

    if (!bankId) {
      return new Response(JSON.stringify({ error: "ID da atividade é obrigatório." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the bank
    const { data: bank, error: fetchError } = await supabase
      .from("question_banks")
      .select("*")
      .eq("id", bankId)
      .single();

    if (fetchError || !bank) {
      return new Response(JSON.stringify({ error: "Atividade não encontrada." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = (bank.questions as any[]) || [];

    // ACTION: fetch — return questions WITHOUT correct answers
    if (action === "fetch") {
      const sanitized = questions.map((q: any, i: number) => ({
        index: i,
        content: q.content || "",
        options: (q.options || []).map((o: any) => ({
          letter: o.letter,
          text: o.text,
          // DO NOT include isCorrect
        })),
        skillCode: q.skillCode,
      }));

      return new Response(JSON.stringify({
        title: `${bank.subject} — ${bank.topic}`,
        institution: bank.institution_name || "EduCreator Pro",
        questionType: bank.question_type,
        grade: bank.grade,
        questions: sanitized,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: submit — compare answers server-side and save results
    if (action === "submit") {
      if (!studentName || !answers) {
        return new Response(JSON.stringify({ error: "Nome e respostas são obrigatórios." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isDiscursiva = bank.question_type === "discursiva" || bank.question_type === "gabarito_discursivo";

      if (isDiscursiva) {
        // Save discursive submission with status 'aguardando_revisao'
        await supabase.from("student_activity_results").insert({
          bank_id: bankId,
          teacher_user_id: bank.user_id,
          student_name: studentName,
          student_class: studentClass || '',
          score: 0,
          total_questions: questions.length,
          percentage: 0,
          status: 'aguardando_revisao',
          answers: answers,
          corrections: [],
        });

        return new Response(JSON.stringify({
          type: "discursiva",
          message: "Respostas enviadas com sucesso ao Professor Matheus!",
          studentName,
          totalQuestions: questions.length,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For objective, compare
      let correct = 0;
      const corrections: any[] = [];

      questions.forEach((q: any, i: number) => {
        const studentAnswer = answers[i] || "";
        const correctOption = (q.options || []).find((o: any) => o.isCorrect);
        const isRight = correctOption && studentAnswer === correctOption.letter;
        if (isRight) correct++;

        corrections.push({
          index: i,
          studentAnswer,
          correctAnswer: correctOption?.letter || "—",
          isCorrect: !!isRight,
          content: q.content,
        });
      });

      const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

      // Save objective result with status 'corrigido'
      await supabase.from("student_activity_results").insert({
        bank_id: bankId,
        teacher_user_id: bank.user_id,
        student_name: studentName,
        student_class: studentClass || '',
        score: correct,
        total_questions: questions.length,
        percentage: pct,
        status: 'corrigido',
        answers: answers,
        corrections: corrections,
      });

      return new Response(JSON.stringify({
        type: "objetiva",
        studentName,
        score: correct,
        total: questions.length,
        percentage: pct,
        corrections,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use 'fetch' ou 'submit'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("student-activity error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
