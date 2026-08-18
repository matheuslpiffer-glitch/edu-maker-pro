# Skill: Segurança em Acesso Anônimo (RLS + Edge Functions)

Aplica-se sempre que uma tabela ou fluxo precisar ser acessível por alguém
sem login (aluno via PIN/link, assinatura de presença, portal de redação,
qualquer "link público").

## 1. Nunca usar "IS NOT NULL" como gate de acesso
- `access_code IS NOT NULL` em uma policy de RLS confere se o registro FOI
  compartilhado, não se quem está perguntando SABE o código certo.
- Isso permite que qualquer pessoa com a anon key liste TODOS os registros
  compartilhados da tabela inteira (gabarito, redação de aluno, nota),
  não só o de um link específico.
- RLS não tem como validar um valor digitado pelo cliente contra a linha,
  a não ser via `current_setting()` de header — frágil e raramente vale
  a pena configurar.

## 2. Padrão correto: edge function com service role revalida o código
- Toda ação anônima (ler, editar, submeter) passa por uma edge function
  que recebe o código como parâmetro e volta a consultar o banco
  (`.eq('access_code', code)`) antes de fazer qualquer coisa — nunca confia
  em um `id` sozinho vindo do cliente sem reconferir o código.
- A function usa `SUPABASE_SERVICE_ROLE_KEY`, então ignora RLS por
  definição — por isso a tabela em si pode (e deve) ter as policies
  anônimas de SELECT/UPDATE/INSERT diretas REMOVIDAS depois que a function
  estiver no ar.
- Referência de implementação: `supabase/functions/public-simulator` e
  `supabase/functions/public-essay`.

## 3. Correção nunca acontece no cliente
- Se existe gabarito (`isCorrect`, `answer_key`), ele NUNCA vai no payload
  que o navegador recebe antes da resposta ser enviada.
- A comparação resposta-do-aluno vs. gabarito acontece dentro da edge
  function, com o resultado (nota, percentual) calculado no servidor e
  só então gravado — nunca aceitar `score`/`percentage` vindo pronto do
  cliente.

## 4. PIN / link curto não lê a tabela de conteúdo
- Resolver "código → id" usa uma RPC `SECURITY DEFINER` dedicada
  (`resolve_access_code`) que devolve só `{id, kind}` — nunca um SELECT
  direto na tabela de conteúdo, mesmo que pareça mais simples.

## 5. Checklist antes de liberar qualquer fluxo público novo
- [ ] Existe edge function dedicada, ou é leitura direta de tabela?
- [ ] Se é leitura direta: o que exatamente um `select('*')` sem filtro
      devolveria pra um anon com a apikey pública?
- [ ] Tem dado sensível (gabarito, texto de aluno, nota, PII) nessa tabela?
- [ ] A escrita (INSERT/UPDATE) desse fluxo está gravando algo calculado
      no cliente que deveria ser calculado no servidor?
