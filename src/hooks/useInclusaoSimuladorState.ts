import { useState } from 'react';

export function useInclusaoSimuladorState() {
  const [aeeMode, setAeeMode] = useState<'gerar_novas' | 'adaptar_antigas' | 'texto_resumo'>('gerar_novas');
  const [aeeQuestionCount, setAeeQuestionCount] = useState(5);
  const [aeeQuestionType, setAeeQuestionType] = useState('multipla_visual');
  const [aeeTopic, setAeeTopic] = useState('');
  const [aeeContent, setAeeContent] = useState('');

  return {
    aeeMode,
    setAeeMode,
    aeeQuestionCount,
    setAeeQuestionCount,
    aeeQuestionType,
    setAeeQuestionType,
    aeeTopic,
    setAeeTopic,
    aeeContent,
    setAeeContent,
  };
}
