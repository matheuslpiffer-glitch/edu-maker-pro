## O que já existe (não vou refazer)

- `CreateQuestion.tsx` + `AIGenerateModal` + edge function `generate-question` geram **1 questão** (enunciado, alternativas, gabarito).
- `src/lib/export.ts` já tem `stripHtml` → `latexToUnicode` (`sanitizeForDocx`) aplicado em enunciado, alternativas, gabarito e resolução comentada no DOCX.
- Existem testes em `export.test.ts`, `export.docx-content.test.ts` e `export.pdf.test.tsx`.

## Lacunas a fechar

1. **Não existe** botão para "gerar outra questão variando tipo/tópico" para enriquecer o banco.
2. **Não existe** geração de resolução comentada por IA — o campo `explanation` nem está na tabela `questions` (hoje só `answer`).
3. **PDF**: `exportToPDF` apenas converte um `HTMLElement` via html2canvas. A sanitização depende do componente que renderiza. Falta uma camada explícita que garanta limpeza (ou um helper `buildPdfHtml` reutilizável).
4. **Testes** cobrem DOCX e parte do PDF, mas não validam explicitamente "sem `<script>`, `<style>`, `<iframe>`, `<img onerror>`, sem `$...$`, sem `\frac` cru" em todos os campos.

## Plano

### 1. Migration: adicionar `explanation` em `questions`
```sql
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS explanation text;
```
Sem novo RLS (a tabela já tem políticas por `user_id`).

### 2. Edge function `generate-resolution`
- Recebe `{ content, options, answer, type, subjectName, topic }`.
- Mesmo padrão de auth + débito de crédito + retry de `generate-question`.
- Mesmas regras "Formatação Blindada" (Unicode, sem `$`, sem LaTeX, sem tags HTML de formatação).
- Retorna `{ explanation: string }` — resolução passo a passo + justificativa de cada alternativa (quando MC).

### 3. UI em `CreateQuestion.tsx`
- Botão **"Gerar resolução com IA"** ao lado do gabarito/alternativas → preenche novo campo `explanation` (textarea), persistido em `questions.explanation`.
- Botão **"Gerar outra para o banco"** (ativo só depois de existir uma questão atual) → abre `AIGenerateModal` em modo "variar", pré-preenchido com:
  - mesma disciplina,
  - **tipo invertido** (`multiple-choice` ↔ `essay`),
  - tópico sugerido = `topic` + sufixo aleatório de um pool ("aplicações", "interpretação de problema", "contexto interdisciplinar", "erros comuns"),
  - ao confirmar, em vez de preencher o formulário atual, **insere direto em `questions`** e mostra toast "Questão adicionada ao banco".

### 4. Reforço de sanitização para PDF
- Novo helper `buildSanitizedQuestionHtml(question, subjects)` em `src/lib/export.ts` que monta o HTML do print já com `sanitizeForDocx` aplicado a enunciado, alternativas, gabarito e resolução.
- `exportToPDF` ganha overload que aceita `(questions, header, subjects, includeGabarito)` → monta o nó via helper e converte. O caminho antigo `exportToPDF(element, filename)` continua funcionando.

### 5. Testes (vitest)
Adicionar/expandir em `src/lib/export.docx-content.test.ts` e `src/lib/export.pdf.test.tsx`:
- Caso "questão poluída": `content`, `options[*].text`, `answer`, `explanation` com `<script>alert(1)</script>`, `<style>`, `<iframe>`, `<img src=x onerror=...>`, `$x^2$`, `\\frac{a}{b}`, `R$ 10,00`.
- Asserções para **DOCX** (parse de `word/document.xml` via JSZip) e **PDF HTML** (string do helper):
  - **não** contém: `<script`, `<style`, `<iframe`, `onerror=`, `\frac`, `\sqrt`, regex `\$[^\s\d]` (cifrão não-monetário).
  - **contém**: texto Unicode esperado (`x²`, `a/b`) e **preserva** `R$ 10,00`.
- Cobertura para todos os 4 campos (enunciado, alternativa, gabarito, resolução comentada).

## Detalhes técnicos

- Idempotência: `generate-resolution` debita 1 crédito; UI desabilita o botão durante o request.
- Sem mudança de RLS, sem mexer em `config.toml`.
- `latexMode` continua existindo no editor; a sanitização só atua no momento do export, preservando o LaTeX que o usuário queira ver renderizado em tela.
- `AIGenerateModal` ganha props opcionais `mode: 'fill' | 'append'` e `defaults` para suportar a 2ª geração sem duplicar componente.

## Arquivos tocados

- `supabase/migrations/<ts>_add_explanation_to_questions.sql` (novo)
- `supabase/functions/generate-resolution/index.ts` (novo)
- `src/lib/export.ts` (helper `buildSanitizedQuestionHtml` + overload de `exportToPDF`)
- `src/pages/CreateQuestion.tsx` (campo explanation, 2 novos botões, persistência)
- `src/components/AIGenerateModal.tsx` (modo `append` + defaults)
- `src/lib/export.docx-content.test.ts` e `src/lib/export.pdf.test.tsx` (cenário poluído + asserções negativas)

## Perguntas antes de implementar

1. A **2ª questão** ("enriquecer o banco") deve ir **direto pro banco** (`questions` insert) ou substituir o formulário atual? Estou propondo direto no banco para não perder o que o professor já editou.
2. A resolução comentada deve ficar num **campo separado** (`explanation`, como proposto) ou ser **concatenada ao `answer`**? Recomendo separado para que o gabarito enxuto continue existindo e o PDF possa mostrar "Resposta" + "Resolução comentada".

Se concordar com as duas decisões (direto no banco + campo separado), eu sigo implementando.