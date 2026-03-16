import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface SavedQuestion {
  id: string;
  banca: string;
  tema: string;
  conteudo: string;
  tipo: string;
  options?: any[];
  dataCriacao: string;
}

interface SavedQuestionsBankContextType {
  questions: SavedQuestion[];
  addQuestions: (items: SavedQuestion[]) => void;
  removeQuestion: (id: string) => void;
  clearAll: () => void;
}

const SavedQuestionsBankContext = createContext<SavedQuestionsBankContextType>({
  questions: [],
  addQuestions: () => {},
  removeQuestion: () => {},
  clearAll: () => {},
});

const STORAGE_KEY = 'savedQuestionsBank';

function loadFromStorage(): SavedQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function SavedQuestionsBankProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<SavedQuestion[]>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  }, [questions]);

  const addQuestions = useCallback((items: SavedQuestion[]) => {
    setQuestions(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const newItems = items.filter(i => !existingIds.has(i.id));
      return [...newItems, ...prev];
    });
  }, []);

  const removeQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  const clearAll = useCallback(() => setQuestions([]), []);

  return (
    <SavedQuestionsBankContext.Provider value={{ questions, addQuestions, removeQuestion, clearAll }}>
      {children}
    </SavedQuestionsBankContext.Provider>
  );
}

export function useSavedQuestionsBank() {
  return useContext(SavedQuestionsBankContext);
}
