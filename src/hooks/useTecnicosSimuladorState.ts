import { useState, useEffect, useRef, useCallback } from 'react';
import { SimQuestion } from '@/types/simulator';

export function useTecnicosSimuladorState(isTecnicosMode: boolean, questions: SimQuestion[], setQuestions: (q: SimQuestion[]) => void, title: string, setTitle: (t: string) => void, institutionName: string, setInstitutionName: (i: string) => void) {
  const [tecnicoInstitution, setTecnicoInstitution] = useState('');
  const [tecnicoMode, setTecnicoMode] = useState<'' | 'completo' | 'por_area'>('');
  const [tecnicoSubjects, setTecnicoSubjects] = useState<string[]>(['Matemática', 'Português', 'Ciências da Natureza', 'Humanas / Atualidades']);
  const [tecnicoQuestionCount, setTecnicoQuestionCount] = useState(20);
  const [senaiEixo, setSenaiEixo] = useState('mecanica');
  const [senaiTopic, setSenaiTopic] = useState('');
  const [senaiVestibulinho, setSenaiVestibulinho] = useState(false);
  const [senaiTimerSeconds, setSenaiTimerSeconds] = useState(0);
  const senaiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist Técnico state in sessionStorage
  useEffect(() => {
    if (isTecnicosMode) {
      const saved = sessionStorage.getItem('senai_progress');
      if (saved) {
        try {
          const s = JSON.parse(saved);
          if (s.senaiEixo) setSenaiEixo(s.senaiEixo);
          if (s.senaiTopic) setSenaiTopic(s.senaiTopic);
          if (s.senaiVestibulinho) setSenaiVestibulinho(s.senaiVestibulinho);
          if (s.questions?.length) setQuestions(s.questions);
          if (s.title) setTitle(s.title);
          if (s.institutionName) setInstitutionName(s.institutionName);
        } catch {}
      }
    }
  }, [isTecnicosMode, setQuestions, setTitle, setInstitutionName]);

  useEffect(() => {
    if (isTecnicosMode && (senaiEixo || senaiTopic || questions.length)) {
      sessionStorage.setItem('senai_progress', JSON.stringify({
        senaiEixo, senaiTopic, senaiVestibulinho, questions, title, institutionName,
      }));
    }
  }, [isTecnicosMode, senaiEixo, senaiTopic, senaiVestibulinho, questions, title, institutionName]);

  // 120-min countdown for vestibulinho técnico
  const startSenaiTimer = useCallback(() => {
    if (senaiTimerRef.current) return;
    setSenaiTimerSeconds(120 * 60);
    senaiTimerRef.current = setInterval(() => {
      setSenaiTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(senaiTimerRef.current!);
          senaiTimerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (senaiTimerRef.current) clearInterval(senaiTimerRef.current); }, []);

  return {
    tecnicoInstitution, setTecnicoInstitution,
    tecnicoMode, setTecnicoMode,
    tecnicoSubjects, setTecnicoSubjects,
    tecnicoQuestionCount, setTecnicoQuestionCount,
    senaiEixo, setSenaiEixo,
    senaiTopic, setSenaiTopic,
    senaiVestibulinho, setSenaiVestibulinho,
    senaiTimerSeconds, setSenaiTimerSeconds,
    startSenaiTimer
  };
}
