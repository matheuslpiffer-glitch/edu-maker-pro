# Instruções do Agente

## Skills
Antes de executar qualquer tarefa, leia os arquivos em `skills/` e siga as regras aplicáveis. Em caso de conflito entre um pedido pontual e uma skill, avise o conflito antes de agir.
## Routing
- `/` renders the teacher dashboard (Index) for signed-in teachers; the landing lives at `/professor` and shows only for signed-out visitors at `/`. Keep `/dashboard-professor` as a redirect alias. Why: user wants the dashboard as the home page.

## Elite correction
- Keep structured-response handling local to the Elite function, validate complete results and retry malformed or token-limited output once without another credit debit. Why: partial AI output must not become a fabricated transcription or score.
