import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface StudentModeContextType {
  isStudentMode: boolean;
  toggleStudentMode: () => void;
  setStudentMode: (value: boolean) => void;
  studentXP: number;
  studentLevel: number;
  addXP: (amount: number) => void;
}

const StudentModeContext = createContext<StudentModeContextType>({
  isStudentMode: false,
  toggleStudentMode: () => {},
  setStudentMode: () => {},
  studentXP: 0,
  studentLevel: 1,
  addXP: () => {},
});

export function StudentModeProvider({ children }: { children: ReactNode }) {
  const [isStudentMode, setIsStudentMode] = useState(false);
  const [studentXP, setStudentXP] = useState(0);
  const [studentLevel, setStudentLevel] = useState(1);
  const { user } = useAuth();
  const storageKey = user ? `studentMode:${user.id}` : null;

  useEffect(() => {
    if (!storageKey) {
      setIsStudentMode(false);
      setStudentXP(0);
      setStudentLevel(1);
      return;
    }

    const saved = localStorage.getItem(storageKey);
    setIsStudentMode(saved === 'true');
    localStorage.removeItem('studentMode');
  }, [storageKey]);

  useEffect(() => {
    if (!user || !isStudentMode) return;

    supabase
      .from('student_progress')
      .select('xp_earned, level')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const totalXP = data.reduce((sum: number, r: any) => sum + (r.xp_earned || 0), 0);
          const maxLevel = Math.max(...data.map((r: any) => r.level || 1));
          setStudentXP(totalXP);
          setStudentLevel(maxLevel);
        }
      });
  }, [user, isStudentMode]);

  const persistStudentMode = (value: boolean) => {
    setIsStudentMode(value);
    if (storageKey) {
      localStorage.setItem(storageKey, String(value));
    }
    localStorage.removeItem('studentMode');
  };

  const toggleStudentMode = () => {
    persistStudentMode(!isStudentMode);
  };

  const setStudentMode = (value: boolean) => {
    persistStudentMode(value);
  };

  const addXP = (amount: number) => {
    setStudentXP(prev => {
      const newXP = prev + amount;
      const newLevel = Math.floor(newXP / 500) + 1;
      setStudentLevel(newLevel);
      return newXP;
    });
  };

  return (
    <StudentModeContext.Provider value={{ isStudentMode, toggleStudentMode, setStudentMode, studentXP, studentLevel, addXP }}>
      {children}
    </StudentModeContext.Provider>
  );
}

export const useStudentMode = () => useContext(StudentModeContext);
