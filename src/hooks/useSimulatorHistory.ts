import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SimOption { letter: string; text: string; isCorrect: boolean; }
interface SimQuestion { content: string; options: SimOption[]; skillCode?: string; descriptor?: string; answerLines?: number; correctionMirror?: string; explanation?: string; }
interface SavedSimulator { id: string; title: string; exam_type: string; subject_area: string; grade: string; questions: SimQuestion[]; created_at: string; }

export function useSimulatorHistory() {
  const [history, setHistory] = useState<SavedSimulator[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('simulators').select('*').order('created_at', { ascending: false });
    setHistory((data as unknown as SavedSimulator[]) || []);
    setLoadingHistory(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return { history, loadingHistory, loadHistory };
}
