# Skill: Backup e Continuidade Técnica

Regra de segurança operacional — o objetivo é que o projeto sobreviva a
qualquer falha de um único ponto (Lovable fora do ar, conta suspensa,
notebook do fundador quebrado).

## 1. Código-fonte
- O projeto deve estar conectado a um repositório GitHub próprio (conta
  do fundador ou da empresa, nunca só dentro da Lovable) — Lovable tem
  integração nativa pra isso ("Connect to GitHub" nas configurações do
  projeto).
- Sem essa conexão, o único histórico de código é o que a Lovable guarda
  — se o acesso à Lovable for perdido, o histórico de mudanças some
  junto.
- Checar periodicamente (ex: a cada mudança grande) que o push pro
  GitHub está de fato acontecendo, não só configurado uma vez e
  esquecido.

## 2. Banco de dados (Supabase)
- Supabase é Postgres padrão — portável para qualquer outro host Postgres
  se um dia for necessário migrar. Isso não é o ponto de maior risco.
- Confirmar que o backup automático do Supabase está ativo no plano
  contratado, e que existe pelo menos um export manual recente guardado
  fora da Supabase (ex: `pg_dump` salvo localmente) para o caso de
  problema simultâneo de conta.

## 3. Segredos e chaves de API
- Manter uma cópia própria (fora da Lovable/Supabase, ex: gerenciador de
  senhas) de todas as chaves usadas nas edge functions: `GEMINI_API_KEY`,
  chaves do Stripe/Mercado Pago, `PAYMENTS_SANDBOX_WEBHOOK_SECRET` /
  `PAYMENTS_LIVE_WEBHOOK_SECRET`.
- Sem isso, perder acesso ao painel da Lovable/Supabase significa não
  conseguir nem recriar o ambiente do zero rapidamente.

## 4. Dependência real de plataforma (o que É lock-in de verdade)
- A maioria das funções de IA já chama a API do Gemini direto — portável.
- Duas exceções usam o gateway proprietário da Lovable
  (`ai.gateway.lovable.dev`): geração de ilustração e geração de vídeo.
  Migrar essas duas pra acesso direto ao Google Cloud (Imagen/Veo) é o
  único trabalho real necessário pra sair da Lovable, se algum dia for
  preciso.
- O fluxo de programação via prompt na Lovable é conveniência de
  processo, não amarra o código em si — o projeto gerado é React/Vite/
  TypeScript/Supabase padrão, editável em qualquer editor normal.

## Checklist de verificação (revisar a cada poucos meses)
- [ ] Projeto conectado a um GitHub próprio, com push recente confirmado
- [ ] Backup do banco confirmado ativo
- [ ] Cópia das chaves de API guardada fora da Lovable/Supabase
- [ ] Ninguém além do fundador sabe onde essa cópia de chaves está — isso
      também é um risco (ver `skills/runbooks-operacionais.md`)
