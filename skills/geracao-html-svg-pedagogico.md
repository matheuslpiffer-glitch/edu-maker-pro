# Skill: Geração Pedagógica em HTML + Vetores SVG

Aplica-se sempre que o usuário solicitar avaliações, atividades, listas de exercícios
ou materiais visuais pedagógicos para impressão ou edição.

## 1. Estrutura HTML integral
- Gerar SEMPRE um único arquivo HTML standalone, com todo o CSS embutido em `<style>`.
- Definir `@page { size: A4; margin: 1.5cm; }` para alinhamento correto na impressão.
- Cabeçalho escolar estilizado: Nome da Escola, Aluno, Data, Turma, Professor e Caixa de Nota.
- Dividir as atividades em seções coloridas.
- Incluir, no início, uma caixa de "Dicas de Ouro / Regras Práticas".

## 2. Ilustrações vetoriais (SVG)
- NUNCA usar imagens externas (`<img>` com URL da web).
- Criar as ilustrações diretamente em `<svg>` inline.
- Usar cores contrastantes e formas claras adaptadas ao nível educacional:
  malhas quadriculadas, relógios com ponteiros, sólidos 3D com linhas visíveis/tracejadas,
  polígonos rotulados.

## 3. Gabarito e compatibilidade
- Sempre incluir "Gabarito para Correção" ao final, em tabela/grade organizada.
- Garantir compatibilidade de cópia direta para Microsoft Word e Google Docs
  (evitar flexbox/grid complexos, preferir tabelas e estilos inline nos elementos críticos).

## 4. Instruções ao usuário
- Ao final da resposta, incluir passo a passo de como salvar o arquivo em `.html`,
  abrir no navegador e copiar para o Word.

## Observações do projeto
- Manter a Formatação Blindada: sem LaTeX, apenas Unicode (π, ², √) nos enunciados.
- Fonte Arial 11pt, política White Label (sem nomes reais de escola).
