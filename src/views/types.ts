export interface SimOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface SimQuestion {
  content: string;
  options: SimOption[];
  skillCode?: string;
  descriptor?: string;
  answerLines?: number;
  correctionMirror?: string;
}

export interface SavedSimulator {
  id: string;
  title: string;
  exam_type: string;
  subject_area: string;
  grade: string;
  questions: SimQuestion[];
  created_at: string;
}
