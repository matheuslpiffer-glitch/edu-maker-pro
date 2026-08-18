# Plano de Refatoração: Simulators.tsx

O arquivo `src/pages/Simulators.tsx` será decomposto em componentes menores, hooks especializados e constantes externas para melhorar a manutenibilidade, sem alterar nenhuma funcionalidade existente.

## 1. Hooks Especializados

### `useSimulatorState`
*   **Responsabilidade**: Gerenciar o estado central do simulado (título, questões, filtros, histórico).
*   **Conteúdo**: Estados de `title`, `questions`, `history`, `activeTab`, `savedId`, e a lógica de `loadHistory`, `handleDelete`, `handleLoadSimulator`.

### `useSimulatorGeneration`
*   **Responsabilidade**: Orquestrar o pipeline de geração de questões via IA.
*   **Conteúdo**: Função `generateQuestions`, estados de `generating`, `generationProgress`, `generationMessage`, e integração com `simulator-generation-job`.

### `useSimulatorExport`
*   **Responsabilidade**: Lógica de exportação para PDF e integrações externas.
*   **Conteúdo**: Funções `handlePDF`, `handleCopyStudentLink`, `handleWhatsApp`, `handleKahoot`, `handlePodcast`, `handleIllustrate`.

## 2. Subcomponentes de UI

### `SimulatorMotorSelector`
*   **Responsabilidade**: Renderizar os cards de seleção do motor (Simulado, Aula, Questões, Inclusao).
*   **Local**: `src/components/simulator/SimulatorMotorSelector.tsx`

### `SimulatorConfigPanel`
*   **Responsabilidade**: Agrupar os seletores de DNA, Disciplina, Série e Configurações Finais.
*   **Sub-partes**:
    *   `DNAPicker`: Seleção de público-alvo (Redes Oficiais, Olimpíadas, etc).
    *   `TecnicoConfig`: Configurações específicas para cursos técnicos e SENAI.
    *   `VestibularConfig`: Configurações para universidades públicas e privadas.
    *   `InclusaoConfig`: Estúdio de AEE e modos de trabalho inclusivos.
*   **Local**: `src/components/simulator/SimulatorConfigPanel.tsx`

### `SimulatorA4Preview`
*   **Responsabilidade**: Wrapper do preview A4 com controles de margem, colunas e gabarito.
*   **Local**: `src/components/simulator/SimulatorA4Preview.tsx`

### `SimulatorMagicActions`
*   **Responsabilidade**: Barra de ações rápidas (Podcast, Ilustrar, Kahoot).
*   **Local**: `src/components/simulator/SimulatorMagicActions.tsx`

### `SimulatorHistory`
*   **Responsabilidade**: Listagem e busca de simulados salvos anteriormente.
*   **Local**: `src/components/simulator/SimulatorHistory.tsx`

## 3. Extração de Dados e Constantes
*   **Responsabilidade**: Mover as grandes estruturas de dados (`MODEL_CONFIGS`, `ARVORE_PUBLICOS`, `SENAI_EIXOS`, etc.) para arquivos de configuração.
*   **Local**: `src/lib/simulator-constants.ts` ou similar.

## Próximos Passos
Após a aprovação deste plano, iniciarei a criação dos novos arquivos e a migração gradual do código de `Simulators.tsx`, mantendo a página principal apenas como um orquestrador leve destes novos elementos.
