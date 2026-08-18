# Skill: Disciplina de Engenharia Atômica

Regra de processo, não de código — aplica-se a QUALQUER mudança pedida
neste projeto (feature nova, correção de bug, refatoração).

## 1. Uma mudança por vez
- Nunca empacotar duas correções não relacionadas no mesmo prompt/commit.
- Se uma tarefa parece grande, quebrar em fases numeradas antes de
  começar a implementar qualquer uma delas.
- Cada fase precisa poder ser testada isoladamente antes da próxima
  começar.

## 2. Testar antes de prosseguir
- Depois de cada fase aplicada no Lovable, o passo de teste é parte da
  tarefa, não opcional. Definir ANTES de aplicar o que "funcionando"
  significa nessa fase específica (ex: "aluno consegue abrir simulado
  via PIN e enviar resposta").
- Mudanças que trocam a fonte de dados de uma tela (ex: de leitura direta
  de tabela para edge function) só têm a policy/permissão antiga removida
  DEPOIS que a nova estiver validada em produção — nunca no mesmo passo.

## 3. Sem over-engineering antes de receita
- Não construir abstração, generalização ou "flexibilidade futura" para
  um caso de uso que ainda não existe pagando a conta.
- Preferir a solução mais direta que resolve o problema de hoje, mesmo
  que pareça "menos elegante" — revisar depois se o produto crescer.

## 4. Reverter em vez de corrigir em lote
- Se uma mudança quebrar algo e a causa não for óbvia em poucos minutos,
  reverter para o estado anterior conhecido-bom e tentar de novo em passo
  menor — não empilhar correções em cima de um estado quebrado tentando
  adivinhar o que deu errado.

## 5. Todo agente (humano ou IA) que mexer neste projeto consulta `skills/` antes
- Este diretório existe para que decisões já tomadas (segurança, fiscal,
  comercial, engenharia) não precisem ser re-explicadas ou re-descobertas
  a cada sessão nova.
- Se uma tarefa pontual conflitar com uma skill existente, o conflito é
  avisado antes de agir, não resolvido silenciosamente numa direção ou
  outra.
