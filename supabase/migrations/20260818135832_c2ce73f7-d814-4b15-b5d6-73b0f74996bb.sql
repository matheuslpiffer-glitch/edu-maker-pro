-- 1) question_banks: gabarito (isCorrect) não pode mais ser lido
--    direto pelo cliente anon. O fluxo de aluno passa pela edge
--    function student-activity, que já sanitiza a resposta.
DROP POLICY IF EXISTS "Anon can read question_banks with access code" ON public.question_banks;

-- 2) simulators: idem — o fluxo de aluno agora passa pela edge
--    function public-simulator (Fase 2), que sanitiza a resposta.
DROP POLICY IF EXISTS "Anon can read simulators with access code" ON public.simulators;

-- 3) questions: policy legada, sem nenhum consumidor no frontend
--    atual (verificado). Superfície de ataque desnecessária.
DROP POLICY IF EXISTS "Anon can read questions linked to accessible banks" ON public.questions;

-- 4) student_results: leitura anônima não é usada em nenhum lugar
--    do app (o resultado já volta na resposta da própria function
--    de submit). Remover.
DROP POLICY IF EXISTS "Anon can read results for accessible simulators" ON public.student_results;

-- 5) student_results: a escrita agora acontece só via edge function
--    public-simulator (service role, que já ignora RLS). Remover o
--    insert direto do cliente fecha a brecha de nota forjada — um
--    aluno não consegue mais gravar um resultado sem passar pela
--    correção no servidor.
DROP POLICY IF EXISTS "Anon can insert results for accessible simulators" ON public.student_results;

-- 6) student_activity_results: mesmo raciocínio — a escrita já
--    acontece via edge function student-activity (service role).
--    Remover o insert direto fecha a mesma brecha para atividades.
DROP POLICY IF EXISTS "Anon can insert results for valid banks" ON public.student_activity_results;