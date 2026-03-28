// BNCC + Parte Diversificada subjects with categories, icons, colors, and skill prefixes

export interface SubjectDef {
  name: string;
  icon: string;
  color: string;
  bnccPrefix: string;
}

export interface SubjectCategory {
  label: string;
  subjects: SubjectDef[];
}

export const SUBJECT_CATEGORIES: SubjectCategory[] = [
  {
    label: '📚 Linguagens',
    subjects: [
      { name: 'Língua Portuguesa', icon: '📝', color: 'blue', bnccPrefix: 'EF/EM – LP' },
      { name: 'Arte', icon: '🎨', color: 'pink', bnccPrefix: 'EF/EM – AR' },
      { name: 'Educação Física', icon: '⚽', color: 'indigo', bnccPrefix: 'EF/EM – EF' },
      { name: 'Língua Inglesa', icon: '🌍', color: 'cyan', bnccPrefix: 'EF/EM – LI' },
    ],
  },
  {
    label: '🔢 Matemática',
    subjects: [
      { name: 'Matemática', icon: '📐', color: 'amber', bnccPrefix: 'EF/EM13MAT' },
    ],
  },
  {
    label: '🔬 Ciências da Natureza',
    subjects: [
      { name: 'Ciências', icon: '🧪', color: 'cyan', bnccPrefix: 'EF – CI' },
      { name: 'Física', icon: '⚛️', color: 'blue', bnccPrefix: 'EM13CNT' },
      { name: 'Química', icon: '🧪', color: 'purple', bnccPrefix: 'EM13CNT' },
      { name: 'Biologia', icon: '🧬', color: 'purple', bnccPrefix: 'EM13CNT' },
    ],
  },
  {
    label: '🌎 Ciências Humanas',
    subjects: [
      { name: 'História', icon: '📜', color: 'amber', bnccPrefix: 'EF/EM13CHS' },
      { name: 'Geografia', icon: '🗺️', color: 'cyan', bnccPrefix: 'EF/EM13CHS' },
      { name: 'Filosofia', icon: '💭', color: 'purple', bnccPrefix: 'EM13CHS' },
      { name: 'Sociologia', icon: '👥', color: 'rose', bnccPrefix: 'EM13CHS' },
    ],
  },
  {
    label: '🚀 Parte Diversificada (PEI/Integral)',
    subjects: [
      { name: 'Projeto de Vida', icon: '🚀', color: 'orange', bnccPrefix: '' },
      { name: 'Tecnologia e Inovação', icon: '💻', color: 'cyan', bnccPrefix: '' },
      { name: 'Eletivas', icon: '🎯', color: 'pink', bnccPrefix: '' },
      { name: 'Orientação de Estudos (OE)', icon: '📖', color: 'blue', bnccPrefix: '' },
      { name: 'Práticas Experimentais', icon: '🔬', color: 'cyan', bnccPrefix: '' },
      { name: 'Protagonismo Juvenil', icon: '🌟', color: 'amber', bnccPrefix: '' },
    ],
  },
  {
    label: '🙏 Ensino Religioso',
    subjects: [
      { name: 'Ensino Religioso', icon: '🕊️', color: 'amber', bnccPrefix: 'EF – ER' },
    ],
  },
  {
    label: '🎵 Educação Musical',
    subjects: [
      { name: 'Educação Musical', icon: '🎵', color: 'rose', bnccPrefix: '' },
    ],
  },
];

export const ALL_DEFAULT_SUBJECTS = SUBJECT_CATEGORIES.flatMap(c => c.subjects);

/** Find subject definition by name */
export function findSubjectDef(name: string): SubjectDef | undefined {
  return ALL_DEFAULT_SUBJECTS.find(s => s.name === name);
}

/** Get BNCC prefix for a given subject name */
export function getBnccPrefix(subjectName: string): string {
  return findSubjectDef(subjectName)?.bnccPrefix || '';
}

/** Get icon for a given subject name */
export function getSubjectIcon(subjectName: string): string {
  return findSubjectDef(subjectName)?.icon || '📄';
}
