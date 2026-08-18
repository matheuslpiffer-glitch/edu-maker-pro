# Skill: Runbooks Operacionais

Passo a passo para as situações mais prováveis de dar errado — objetivo é
que qualquer pessoa (Marcela, um contratado futuro, ou o próprio fundador
sob pressão) consiga agir sem precisar reconstruir o raciocínio do zero.
Preencher os detalhes específicos (URLs de painel, contatos) conforme
forem existindo.

## 1. Pagamento de um cliente falhou (Stripe/Mercado Pago)
1. Checar `payments-webhook` nos logs da edge function — o evento chegou?
2. Se o webhook não disparou: verificar status direto no painel do
   Stripe/Mercado Pago antes de qualquer ação manual no banco.
3. Nunca editar `profiles.plan` ou `subscriptions` manualmente sem
   registrar o motivo — isso quebra a sincronia com o que o Stripe pensa
   que é verdade.
4. [Preencher: contato de suporte do processador de pagamento usado]

## 2. Escola/cliente pede cancelamento
1. Confirmar por escrito (e-mail) o pedido antes de qualquer ação no
   sistema.
2. [Preencher: prazo contratual de cancelamento, se houver, e política de
   reembolso proporcional]
3. Encerrar acesso só depois de confirmar que não há cobrança pendente
   em aberto para o período já usado.

## 3. API de IA (Gemini) fora do ar ou com erro
1. Checar status oficial do provedor antes de assumir bug no próprio
   código.
2. As funções de geração já têm credit-gating — confirmar que o crédito
   do usuário NÃO foi descontado se a chamada falhou antes de retornar
   resultado (evita cliente pagar por algo que não recebeu).
3. Se for instabilidade prolongada, avisar proativamente os professores
   ativos daquele dia — evita chamados de suporte duplicados sobre o
   mesmo problema.

## 4. Incidente de segurança / suspeita de acesso indevido a dado de aluno
1. Não apagar nada antes de entender o escopo — revogar acesso é
   prioridade sobre investigar a causa.
2. Consultar `skills/seguranca-acesso-anonimo.md` para os pontos que já
   foram auditados e corrigidos — confirmar se o incidente é algo novo
   ou uma regressão de algo já resolvido.
3. [Preencher: se a escola precisa ser comunicada formalmente, dado o
   contexto de LGPD em ambiente escolar]
