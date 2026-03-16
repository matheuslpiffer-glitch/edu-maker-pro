import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import GeneratingOverlay from '@/components/GeneratingOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useCustomLogo } from '@/hooks/useCustomLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Download, Printer, Eye, Save, Trash2, FileText, GraduationCap, Wrench, BookOpen, School, Infinity, Calculator, Shapes, Trophy, PenTool, Brain, Building2, Award, Columns2, AlignJustify, Globe, Zap, PenLine, BookText, ListChecks, Mic, Palette, Gamepad2, Library, CheckCircle2, Accessibility, RefreshCw, BookMarked, Cpu, Target } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import SimulatorPreview from '@/components/SimulatorPreview';
import AnswerSheet from '@/components/AnswerSheet';
import GabaritoOficial from '@/components/GabaritoOficial';
import EspelhoCorrecao from '@/components/EspelhoCorrecao';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useSavedQuestionsBank } from '@/hooks/useSavedQuestionsBank';

interface SimOption { letter: string; text: string; isCorrect: boolean; }
interface SimQuestion { content: string; options: SimOption[]; skillCode?: string; descriptor?: string; answerLines?: number; correctionMirror?: string; }
interface SavedSimulator { id: string; title: string; exam_type: string; subject_area: string; grade: string; questions: SimQuestion[]; created_at: string; }

const EXAM_TYPES = [
  { value: 'saresp', label: 'SARESP' },
  { value: 'prova_paulista', label: 'Prova Paulista' },
  { value: 'ade', label: 'Avaliação Diagnóstica (ADE)' },
  { value: 'saeb', label: 'SAEB' },
];

// Categorized DNA models for Simulado
interface DNAModel { value: string; label: string; icon: any; }
interface DNACategory { id: string; title: string; color: string; models: DNAModel[]; }

// DNA categories for Vestibulares mode
const VESTIBULARES_DNA: DNACategory[] = [
  {
    id: 'vest_publicas',
    title: 'Universidades Públicas',
    color: 'text-blue-600',
    models: [
      { value: 'vest_publicos', label: 'Universidades Públicas', icon: GraduationCap },
    ],
  },
  {
    id: 'vest_privadas',
    title: 'Universidades Privadas',
    color: 'text-amber-600',
    models: [
      { value: 'vest_privados', label: 'Universidades Privadas', icon: Building2 },
    ],
  },
];

// Técnicos institution cards
const TECNICOS_INSTITUTIONS = [
  { id: 'ifs', label: 'Instituto Federal (IFs)', desc: 'Exame de Seleção Nacional', icon: Building2, gradient: 'from-emerald-600 to-green-700' },
  { id: 'etec', label: 'ETEC / CPS', desc: 'Vestibulinho Centro Paula Souza', icon: Cpu, gradient: 'from-teal-500 to-emerald-600' },
  { id: 'cotuca', label: 'Técnicos Unicamp', desc: 'Cotuca / Cotil — Seleção Unicamp', icon: Target, gradient: 'from-green-500 to-teal-600' },
];

const TECNICOS_AREA_SUBJECTS = [
  { id: 'mat', label: 'Matemática', icon: '📐' },
  { id: 'port', label: 'Português', icon: '📝' },
  { id: 'natureza', label: 'Ciências da Natureza', icon: '🧪' },
  { id: 'humanas', label: 'Humanas / Atualidades', icon: '🌎' },
];

// DNA categories for Técnicos mode (kept for compatibility)
const TECNICOS_DNA: DNACategory[] = [
  {
    id: 'vestibulinhos_cat',
    title: 'Vestibulinhos de Ingresso',
    color: 'text-emerald-600',
    models: [
      { value: 'vestibulinhos', label: 'Vestibulinhos de Ingresso', icon: School },
    ],
  },
  {
    id: 'cursos_cat',
    title: 'Cursos Profissionalizantes',
    color: 'text-cyan-600',
    models: [
      { value: 'cursos_tecnicos', label: 'Cursos Profissionalizantes', icon: Wrench },
    ],
  },
];

const SIMULADO_DNA_CATEGORIES: DNACategory[] = [
  {
    id: 'redes_oficiais',
    title: 'Redes Oficiais',
    color: 'text-indigo-600',
    models: [
      { value: 'padrao', label: 'Padrão (SEDUC-SP)', icon: BookOpen },
      { value: 'super_bncc_elite', label: 'Super BNCC Elite', icon: GraduationCap },
      { value: 'concurso_publico', label: 'Concurso Público', icon: Award },
    ],
  },
  {
    id: 'olimpiadas',
    title: 'Olimpíadas',
    color: 'text-amber-600',
    models: [
      { value: 'obmep', label: 'OBMEP (Olimpíada)', icon: Trophy },
    ],
  },
];

const AULA_DNA: DNAModel[] = [
  { value: 'aula_fundamental', label: 'Ensino Fundamental', icon: BookOpen },
  { value: 'aula_medio', label: 'Ensino Médio', icon: GraduationCap },
  { value: 'aula_tecnico', label: 'Ensino Técnico', icon: Wrench },
  { value: 'aula_pre_vestibular', label: 'Pré-Vestibular', icon: Trophy },
];

const QUESTOES_DNA: DNAModel[] = [
  { value: 'questoes_bncc', label: 'BNCC Alinhadas', icon: BookOpen },
  { value: 'questoes_vestibular', label: 'Vestibular', icon: GraduationCap },
  { value: 'questoes_concurso', label: 'Concurso Público', icon: Award },
  { value: 'questoes_olimpiada', label: 'Olimpíadas', icon: Trophy },
];

// Flat list for lookup (all simulado models)
const ALL_SIMULADO_MODELS = SIMULADO_DNA_CATEGORIES.flatMap(c => c.models);

// Motor categories (top-level flow selectors)
const AEE_DNA: DNAModel[] = [
  { value: 'aee_visual', label: 'Deficiência Visual', icon: Accessibility },
  { value: 'aee_intelectual', label: 'Deficiência Intelectual', icon: Brain },
  { value: 'aee_tea', label: 'TEA (Autismo)', icon: Shapes },
  { value: 'aee_tdah', label: 'TDAH', icon: Zap },
];

const MOTOR_CATEGORIES = [
  {
    id: 'simulado',
    label: 'Nova Prova & Simulado',
    description: 'Crie provas completas, simulados ENEM, SAEB e avaliações diagnósticas com gabarito automático.',
    icon: FileText,
    flow: 'simulado' as const,
    models: ALL_SIMULADO_MODELS,
  },
  {
    id: 'aula',
    label: 'Nova Aula & Apostila',
    description: 'Gere aulas interativas, apostilas e materiais didáticos alinhados à BNCC com slides prontos.',
    icon: BookText,
    flow: 'aula' as const,
    models: AULA_DNA,
  },
  {
    id: 'questoes',
    label: 'Novas Questões Específ.',
    description: 'Produza questões objetivas e dissertativas por habilidade, tema e nível de dificuldade.',
    icon: ListChecks,
    flow: 'questoes' as const,
    models: QUESTOES_DNA,
  },
  {
    id: 'inclusao',
    label: 'Estúdio de Inclusão AEE',
    description: 'Gere questões adaptadas, traduza provas e crie roteiros visuais para educação inclusiva.',
    icon: Accessibility,
    flow: 'inclusao' as const,
    models: AEE_DNA,
  },
];
const SUBJECT_AREAS = [
  { name: 'Língua Portuguesa', icon: '📝' }, { name: 'Matemática', icon: '📐' },
  { name: 'Ciências da Natureza', icon: '🧪' }, { name: 'Ciências Humanas', icon: '🌎' },
  { name: 'Geografia', icon: '🗺️' }, { name: 'História', icon: '📜' },
  { name: 'Física', icon: '⚛️' }, { name: 'Química', icon: '🧪' },
  { name: 'Biologia', icon: '🧬' }, { name: 'Filosofia', icon: '💭' },
  { name: 'Sociologia', icon: '👥' }, { name: 'Arte', icon: '🎨' },
  { name: 'Educação Física', icon: '⚽' }, { name: 'Língua Inglesa', icon: '🌍' },
  { name: 'Atualidades', icon: '🌐' },
];

// Dynamic contextual configs per exam model
interface FormatOption {
  id: string;
  label: string;
  icon: string;
  subjects: string[];
}

const MODEL_CONFIGS: Record<string, { label: string; formats: FormatOption[] }> = {
  senai_tecnico: {
    label: 'SENAI (Técnico)',
    formats: [
      { id: 'senai_completa', label: 'Prova Completa (Port/Mat/Cie)', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza'] },
      { id: 'senai_mat', label: 'Apenas Matemática', icon: '📐', subjects: ['Matemática'] },
      { id: 'senai_port', label: 'Apenas Português', icon: '📝', subjects: ['Língua Portuguesa'] },
      { id: 'senai_cie', label: 'Apenas Ciências (Fís/Quí/Bio)', icon: '🧪', subjects: ['Física', 'Química', 'Biologia'] },
    ],
  },
  super_enem: {
    label: 'Super ENEM',
    formats: [
      { id: 'enem_dia1', label: 'Dia 1: Linguagens e Humanas', icon: '📝', subjects: ['Língua Portuguesa', 'Língua Inglesa', 'Arte', 'História', 'Geografia', 'Filosofia', 'Sociologia'] },
      { id: 'enem_dia2', label: 'Dia 2: Matemática e Natureza', icon: '📐', subjects: ['Matemática', 'Física', 'Química', 'Biologia'] },
      { id: 'enem_completo', label: 'Simulado Completo', icon: '🎯', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'] },
    ],
  },
  vestibulares_paulistas: {
    label: 'FUVEST/UNICAMP/UNESP',
    formats: [
      { id: 'fuvest_1fase', label: '1ª Fase (Conhecimentos Gerais)', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Filosofia', 'Sociologia'] },
      { id: 'fuvest_2exatas', label: '2ª Fase: Exatas', icon: '📐', subjects: ['Matemática', 'Física', 'Química'] },
      { id: 'fuvest_2humanas', label: '2ª Fase: Humanas', icon: '🌎', subjects: ['História', 'Geografia', 'Filosofia', 'Sociologia'] },
      { id: 'fuvest_2bio', label: '2ª Fase: Biológicas', icon: '🧬', subjects: ['Biologia', 'Química', 'Física'] },
    ],
  },
  padrao: {
    label: 'SEDUC-SP',
    formats: [
      { id: 'seduc_saresp', label: 'SARESP', icon: '📊', subjects: [] },
      { id: 'seduc_prova_paulista', label: 'Prova Paulista', icon: '📝', subjects: [] },
      { id: 'seduc_ade', label: 'Avaliação Diagnóstica (ADE)', icon: '🔍', subjects: [] },
    ],
  },
  concurso_publico: {
    label: 'Concurso Público',
    formats: [
      { id: 'concurso_anos_iniciais', label: 'Anos Iniciais (1º ao 5º Ano)', icon: '📗', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'] },
      { id: 'concurso_anos_finais', label: 'Anos Finais (6º ao 9º Ano)', icon: '📘', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'] },
      { id: 'concurso_ensino_medio', label: 'Ensino Médio', icon: '🎓', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas', 'Atualidades'] },
    ],
  },
  eixo_tecnico_cps: {
    label: 'ETEC / CPS (Técnico)',
    formats: [
      { id: 'etec_completa', label: 'Vestibulinho Completo (50 Questões)', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'] },
      { id: 'etec_mat_logica', label: 'Matemática e Raciocínio Lógico', icon: '🧮', subjects: ['Matemática'] },
      { id: 'etec_linguagens', label: 'Linguagens e Interpretação', icon: '📝', subjects: ['Língua Portuguesa', 'Língua Inglesa'] },
      { id: 'etec_ciencias', label: 'Ciências da Natureza', icon: '🧪', subjects: ['Física', 'Química', 'Biologia'] },
    ],
  },
  obmep: {
    label: 'OBMEP (Olimpíada)',
    formats: [
      { id: 'obmep_n1_f1', label: 'Nível 1 — Fase 1 (20 objetivas)', icon: '🥉', subjects: ['Matemática'] },
      { id: 'obmep_n1_f2', label: 'Nível 1 — Fase 2 (6 discursivas)', icon: '🥉', subjects: ['Matemática'] },
      { id: 'obmep_n2_f1', label: 'Nível 2 — Fase 1 (20 objetivas)', icon: '🥈', subjects: ['Matemática'] },
      { id: 'obmep_n2_f2', label: 'Nível 2 — Fase 2 (6 discursivas)', icon: '🥈', subjects: ['Matemática'] },
      { id: 'obmep_n3_f1', label: 'Nível 3 — Fase 1 (20 objetivas)', icon: '🥇', subjects: ['Matemática'] },
      { id: 'obmep_n3_f2', label: 'Nível 3 — Fase 2 (6 discursivas)', icon: '🥇', subjects: ['Matemática'] },
    ],
  },
  mackenzie: {
    label: 'Mackenzie',
    formats: [
      { id: 'mack_completa', label: 'Prova Completa (1ª Fase)', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'História', 'Geografia', 'Física', 'Química', 'Biologia', 'Língua Inglesa'] },
      { id: 'mack_exatas', label: 'Bloco Exatas', icon: '📐', subjects: ['Matemática', 'Física', 'Química'] },
      { id: 'mack_humanas', label: 'Bloco Humanas', icon: '🌎', subjects: ['História', 'Geografia', 'Filosofia', 'Sociologia'] },
      { id: 'mack_linguagens', label: 'Bloco Linguagens', icon: '📝', subjects: ['Língua Portuguesa', 'Língua Inglesa', 'Arte'] },
    ],
  },
  coc: {
    label: 'COC',
    formats: [
      { id: 'coc_simulado', label: 'Simulado Geral Integrado', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'] },
      { id: 'coc_exatas', label: 'Ciências Exatas', icon: '📐', subjects: ['Matemática', 'Física', 'Química'] },
      { id: 'coc_humanas', label: 'Ciências Humanas e Linguagens', icon: '🌎', subjects: ['Língua Portuguesa', 'História', 'Geografia', 'Filosofia', 'Sociologia'] },
      { id: 'coc_natureza', label: 'Ciências da Natureza', icon: '🧪', subjects: ['Física', 'Química', 'Biologia'] },
    ],
  },
  etapa: {
    label: 'Etapa',
    formats: [
      { id: 'etapa_completa', label: 'Prova Geral (Alto Nível)', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'História', 'Geografia', 'Física', 'Química', 'Biologia'] },
      { id: 'etapa_exatas', label: 'Exatas Avançadas', icon: '📐', subjects: ['Matemática', 'Física', 'Química'] },
      { id: 'etapa_humanas', label: 'Humanas e Filosofia', icon: '📜', subjects: ['História', 'Geografia', 'Filosofia', 'Sociologia'] },
      { id: 'etapa_biomed', label: 'Biológicas e Saúde', icon: '🧬', subjects: ['Biologia', 'Química'] },
    ],
  },
  objetivo: {
    label: 'Objetivo',
    formats: [
      { id: 'obj_simulado', label: 'Simulado Interdisciplinar', icon: '📋', subjects: ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas', 'Atualidades'] },
      { id: 'obj_atualidades', label: 'Atualidades e Geopolítica', icon: '🌐', subjects: ['Atualidades', 'Geografia', 'História'] },
      { id: 'obj_exatas', label: 'Matemática e Natureza', icon: '📐', subjects: ['Matemática', 'Física', 'Química', 'Biologia'] },
      { id: 'obj_linguagens', label: 'Linguagens e Redação', icon: '📝', subjects: ['Língua Portuguesa', 'Língua Inglesa', 'Arte'] },
    ],
  },
};

const GRADES = [
  '5º Ano EF', '9º Ano EF', '3ª Série EM',
  '6º Ano EF', '7º Ano EF', '8º Ano EF',
  '1ª Série EM', '2ª Série EM',
];

const SERIES_CATEGORIAS = [
  {
    label: '🌈 Educação Infantil',
    series: [
      { id: 'mini_maternal', label: 'Mini Maternal' },
      { id: 'maternal', label: 'Maternal' },
      { id: 'jardim_1', label: 'Jardim I' },
      { id: 'jardim_2', label: 'Jardim II' },
      { id: 'pre', label: 'Pré-Escola' },
    ],
  },
  {
    label: '📗 Ensino Fundamental I',
    series: [
      { id: 'ano_1', label: '1º Ano' },
      { id: 'ano_2', label: '2º Ano' },
      { id: 'ano_3', label: '3º Ano' },
      { id: 'ano_4', label: '4º Ano' },
      { id: 'ano_5', label: '5º Ano' },
    ],
  },
  {
    label: '📘 Ensino Fundamental II',
    series: [
      { id: 'ano_6', label: '6º Ano' },
      { id: 'ano_7', label: '7º Ano' },
      { id: 'ano_8', label: '8º Ano' },
      { id: 'ano_9', label: '9º Ano' },
    ],
  },
  {
    label: '🎓 Ensino Médio & Técnico',
    series: [
      { id: 'serie_1', label: '1ª Série EM' },
      { id: 'serie_2', label: '2ª Série EM' },
      { id: 'serie_3', label: '3ª Série EM' },
      { id: 'tecnico', label: 'Curso Técnico' },
      { id: 'etec', label: 'ETEC / COTUCA' },
    ],
  },
];

const SERIE_GRADE_MAP: Record<string, string> = {
  mini_maternal: 'Mini Maternal', maternal: 'Maternal', jardim_1: 'Jardim I', jardim_2: 'Jardim II', pre: 'Pré-Escola',
  ano_1: '1º Ano EF', ano_2: '2º Ano EF', ano_3: '3º Ano EF', ano_4: '4º Ano EF', ano_5: '5º Ano EF',
  ano_6: '6º Ano EF', ano_7: '7º Ano EF', ano_8: '8º Ano EF', ano_9: '9º Ano EF',
  serie_1: '1ª Série EM', serie_2: '2ª Série EM', serie_3: '3ª Série EM',
  tecnico: 'Curso Técnico', etec: 'ETEC / COTUCA',
};

const ARVORE_PUBLICOS = [
  { id: 'super_enem', label: 'Super ENEM' },
  { id: 'fuvest', label: 'FUVEST (USP)' },
  { id: 'unicamp', label: 'UNICAMP' },
  { id: 'unesp', label: 'UNESP' },
  { id: 'ufscar_federais', label: 'UFSCar / Federais' },
];

const ARVORE_PRIVADOS = [
  { id: 'puc', label: 'PUC (Geral)' },
  { id: 'mackenzie', label: 'Mackenzie' },
  { id: 'fgv', label: 'FGV (Administração/Direito)' },
  { id: 'medicina', label: 'Medicina (Einstein/Santa Casa)' },
  { id: 'espm', label: 'ESPM' },
];

const ARVORE_VESTIBULINHOS = [
  { id: 'vestibulinho_ifs', label: 'Instituto Federal (IFs) — Exame de Seleção' },
  { id: 'vestibulinho_etec', label: 'Simulado Vestibulinho ETEC' },
  { id: 'cotuca_cotil', label: 'Seleção Cotuca/Cotil (Unicamp)' },
  { id: 'senai', label: 'Processo Seletivo SENAI' },
  { id: 'vestibulinho_cps', label: 'Vestibulinho CPS' },
];

const ARVORE_CURSOS_TECNICOS = [
  { id: 'ti_dev', label: 'Eixo: T.I. / Desenvolvimento' },
  { id: 'saude', label: 'Eixo: Enfermagem / Saúde' },
  { id: 'mecatronica', label: 'Eixo: Mecatrônica / Indústria' },
  { id: 'adm', label: 'Eixo: Administração / Negócios' },
  { id: 'quimica', label: 'Eixo: Química' },
  { id: 'agropecuaria', label: 'Eixo: Agropecuária' },
];

const FORMATOS_PROVA = [
  { id: 'completa', label: 'Prova Completa (Modelo Oficial)', desc: 'Todas as disciplinas misturadas' },
  { id: 'matematica', label: 'Apenas Matemática e Lógica', desc: 'Foco em exatas e raciocínio' },
  { id: 'linguagens', label: 'Apenas Linguagens', desc: 'Interpretação de texto e gramática' },
  { id: 'natureza', label: 'Ciências da Natureza', desc: 'Física, Química e Biologia' },
  { id: 'humanas', label: 'Humanas e Atualidades', desc: 'História, Geografia e Contexto Social' },
];

interface SimulatorsProps {
  mode?: 'vestibulares' | 'tecnicos';
}

export default function Simulators({ mode }: SimulatorsProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logoUrl } = useCustomLogo();
  const { addQuestions: addToBank } = useSavedQuestionsBank();
  const previewRef = useRef<HTMLDivElement>(null);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [examType, setExamType] = useState('saresp');
  const [activeMotor, setActiveMotor] = useState(mode ? 'simulado' : 'simulado');
  const [examModel, setExamModel] = useState(
    mode === 'vestibulares' ? 'vest_publicos'
    : mode === 'tecnicos' ? 'vestibulinhos'
    : 'padrao'
  );
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [grade, setGrade] = useState('');
  const [title, setTitle] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [specificTopic, setSpecificTopic] = useState('');

  const [easyCount, setEasyCount] = useState(3);
  const [mediumCount, setMediumCount] = useState(4);
  const [hardCount, setHardCount] = useState(3);

  const [questions, setQuestions] = useState<SimQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [showGabarito, setShowGabarito] = useState(true);
  const [isDiscursiva, setIsDiscursiva] = useState(false);
  const [customMaterial, setCustomMaterial] = useState('');
  const [bloomLevel, setBloomLevel] = useState(2);
  const [columns, setColumns] = useState<1 | 2>(1);
  const [activeSerie, setActiveSerie] = useState('ano_9');

  // AEE states
  const [aeeMode, setAeeMode] = useState<'gerar_novas' | 'adaptar_antigas' | 'texto_resumo'>('gerar_novas');
  const [aeeQuestionCount, setAeeQuestionCount] = useState(5);
  const [aeeQuestionType, setAeeQuestionType] = useState('multipla_visual');
  const [aeeTopic, setAeeTopic] = useState('');
  const [aeeContent, setAeeContent] = useState('');
  const [includeImages, setIncludeImages] = useState(false);
  const [technicalDiscipline, setTechnicalDiscipline] = useState('');
  const [activeEspecialidade, setActiveEspecialidade] = useState('');
  const [activeFormat, setActiveFormat] = useState('completa');

  // Vestibulares-specific states
  const [vestTab, setVestTab] = useState<'publicas' | 'particulares'>('publicas');
  const [vestInstitution, setVestInstitution] = useState('');
  const [vestFormatType, setVestFormatType] = useState<'geral' | 'disciplina'>('geral');
  const [vestDiscipline, setVestDiscipline] = useState('');

  // Técnicos-specific states
  const [tecnicoInstitution, setTecnicoInstitution] = useState('');
  const [tecnicoMode, setTecnicoMode] = useState<'' | 'completo' | 'por_area'>('');
  const [tecnicoSubjects, setTecnicoSubjects] = useState<string[]>(['Matemática', 'Português', 'Ciências da Natureza', 'Humanas / Atualidades']);
  const [tecnicoQuestionCount, setTecnicoQuestionCount] = useState(20);

  const [history, setHistory] = useState<SavedSimulator[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState('create');
  const [magicLoading, setMagicLoading] = useState<string | null>(null);
  const [podcastScript, setPodcastScript] = useState<string | null>(null);

  useEffect(() => { loadHistory(); }, []);

  // Reset format when exam model changes
  const modelConfig = MODEL_CONFIGS[examModel];
  useEffect(() => {
    if (modelConfig) {
      setSelectedFormat(modelConfig.formats[0].id);
      // Auto-set subjects from the format
      setSelectedSubjects(modelConfig.formats[0].subjects);
    } else {
      setSelectedFormat('');
    }
  }, [examModel]);

  // Reset especialidade when DNA model changes
  useEffect(() => {
    setActiveEspecialidade('');
    setTechnicalDiscipline('');
    setActiveFormat('completa');
  }, [examModel]);

  // Reset format when especialidade changes
  useEffect(() => {
    setActiveFormat('completa');
  }, [activeEspecialidade]);

  // When format changes, auto-set subjects
  useEffect(() => {
    if (modelConfig && selectedFormat) {
      const fmt = modelConfig.formats.find(f => f.id === selectedFormat);
      if (fmt && fmt.subjects.length > 0) {
        setSelectedSubjects(fmt.subjects);
      }
    }
  }, [selectedFormat]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('simulators').select('*').order('created_at', { ascending: false });
    setHistory((data as unknown as SavedSimulator[]) || []);
    setLoadingHistory(false);
  };

  const toggleSubject = (name: string) => {
    setSelectedSubjects(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const activeCategory = MOTOR_CATEGORIES.find(c => c.id === activeMotor)!;
  const currentFlow = mode ? 'simulado' : activeCategory.flow;
  const isAula = currentFlow === 'aula';
  const isQuestoes = currentFlow === 'questoes';
  const isInclusao = currentFlow === 'inclusao';
  const isObmep = examModel === 'obmep';
  const isTecnicosMode = mode === 'tecnicos';
  const isFastTrackVestibulinho = isTecnicosMode && tecnicoMode === 'completo' && !!tecnicoInstitution;
  const isTecnicosPorArea = isTecnicosMode && tecnicoMode === 'por_area' && !!tecnicoInstitution;
  const isTecnicosAny = isFastTrackVestibulinho || isTecnicosPorArea;
  const isVestibularesMode = mode === 'vestibulares';
  const isConcurso = examModel === 'concurso_publico';
  const showSerieStep = (activeMotor === 'simulado' || !!mode) && !isObmep && !isTecnicosMode && !isVestibularesMode && !isConcurso;

  // Determine which DNA categories to show based on mode
  const activeDnaCategories = mode === 'vestibulares'
    ? VESTIBULARES_DNA
    : mode === 'tecnicos'
      ? TECNICOS_DNA
      : SIMULADO_DNA_CATEGORIES;

  // OBMEP grade/phase mapping from format
  const OBMEP_GRADE_MAP: Record<string, string> = {
    obmep_n1_f1: '6º-7º Ano EF', obmep_n1_f2: '6º-7º Ano EF',
    obmep_n2_f1: '8º-9º Ano EF', obmep_n2_f2: '8º-9º Ano EF',
    obmep_n3_f1: 'Ensino Médio', obmep_n3_f2: 'Ensino Médio',
  };
  const isObmepFase2 = isObmep && selectedFormat.endsWith('_f2');
  const obmepCount = isObmepFase2 ? 6 : 20;

  const generateQuestions = async (discursiva = false) => {

    const effectiveGrade = isObmep
      ? (OBMEP_GRADE_MAP[selectedFormat] || '')
      : showSerieStep
        ? (SERIE_GRADE_MAP[activeSerie] || grade)
        : grade;
    const effectiveSubjects = isObmep ? ['Matemática'] : selectedSubjects;

    if (!isAula && !isObmep && !isTecnicosAny && !isConcurso && !isVestibularesMode && (selectedSubjects.length === 0 || !effectiveGrade)) {
      toast({ title: 'Selecione ao menos uma disciplina e a série.', variant: 'destructive' });
      return;
    }
    if (isTecnicosPorArea && tecnicoSubjects.length === 0) {
      toast({ title: 'Selecione ao menos uma área para o simulado.', variant: 'destructive' });
      return;
    }
    // OBMEP: auto-set discursiva for Fase 2
    const effectiveDiscursiva = isObmepFase2 ? true : discursiva;
    setIsDiscursiva(effectiveDiscursiva);
    setGenerating(true);
    setQuestions([]);
    const allQuestions: SimQuestion[] = [];

    const tecnicoCount = isFastTrackVestibulinho ? 50 : isTecnicosPorArea ? tecnicoQuestionCount : 0;
    const tecnicoSubs = isFastTrackVestibulinho
      ? ['Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas']
      : isTecnicosPorArea
        ? tecnicoSubjects.map(s => s === 'Português' ? 'Língua Portuguesa' : s === 'Humanas / Atualidades' ? 'Ciências Humanas' : s)
        : [];
    const tecnicoInstLabel = TECNICOS_INSTITUTIONS.find(i => i.id === tecnicoInstitution)?.label || tecnicoInstitution;

    const batches = isAula
      ? [{ difficulty: 'medium', count: 1 }]
      : isObmep
        ? [{ difficulty: 'hard', count: obmepCount }]
      : isTecnicosAny
        ? [{ difficulty: 'medium', count: tecnicoCount }]
      : isConcurso
        ? [{ difficulty: 'hard', count: 10 }]
        : [
            { difficulty: 'easy', count: easyCount },
            { difficulty: 'medium', count: mediumCount },
            { difficulty: 'hard', count: hardCount },
          ].filter(b => b.count > 0);
    try {
      for (const batch of batches) {
        const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
          body: {
            examType, examModel: examModel !== 'padrao' ? (isObmep ? selectedFormat : examModel) : undefined,
            subjects: isTecnicosAny ? tecnicoSubs : isConcurso ? ['Legislação Educacional', 'Conhecimentos Pedagógicos', 'BNCC', 'LDB', 'ECA'] : effectiveSubjects,
            subjectArea: isTecnicosAny ? 'Multidisciplinar' : isConcurso ? 'Conhecimentos Pedagógicos' : effectiveSubjects[0],
            grade: isTecnicosAny ? '9º Ano EF' : isConcurso ? 'Concurso Público' : effectiveGrade,
            difficulty: batch.difficulty, count: isObmep ? obmepCount : isTecnicosAny ? tecnicoCount : isConcurso ? Math.min(batch.count || 10, 10) : (isAula ? 1 : batch.count),
            isDiscursiva: effectiveDiscursiva, isRedacao: false, isAula, isQuestoes,
            isFastTrackVestibulinho: isTecnicosAny || undefined,
            tecnicoInstitution: isTecnicosAny ? tecnicoInstLabel : undefined,
            tecnicoMode: isTecnicosAny ? tecnicoMode : undefined,
            customMaterial: customMaterial.trim() || undefined,
            bloomLevel,
            specificTopic: specificTopic.trim() || undefined,
            serie: showSerieStep ? activeSerie : undefined,
            includeImages,
            technicalDiscipline: technicalDiscipline || undefined,
            provaFormat: activeFormat !== 'completa' ? activeFormat : undefined,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.questions) allQuestions.push(...data.questions);
      }
      setQuestions(allQuestions);
      setSavedId(null);
      // Auto-save to bank
      addToBank(allQuestions.map((q: any, i: number) => ({
        id: `sim-${Date.now()}-${i}`,
        banca: 'Simulado',
        tema: specificTopic || selectedSubjects.join(', ') || 'Geral',
        conteudo: q.content,
        tipo: isDiscursiva ? 'Dissertativa' : 'Múltipla Escolha',
        options: q.options,
        dataCriacao: new Date().toISOString(),
      })));
      toast({ title: `${allQuestions.length} questões geradas com sucesso!` });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao gerar questões', description: e.message, variant: 'destructive' });
    } finally { setGenerating(false); }
  };

  const handleSave = async () => {
    if (!user || questions.length === 0) return;
    setSaving(true);
    const answerKey = questions.map((q, i) => ({
      question: i + 1, answer: q.options?.find(o => o.isCorrect)?.letter || '?',
      skillCode: q.skillCode || '', descriptor: q.descriptor || '',
    }));
    const payload = {
      user_id: user.id, exam_type: examType,
      title: title || `Simulado ${EXAM_TYPES.find(e => e.value === examType)?.label}`,
      institution_name: institutionName, questions: questions as any, answer_key: answerKey as any,
      skill_codes: questions.map(q => q.skillCode || '').filter(Boolean),
      grade, subject_area: selectedSubjects.join(', '),
    };
    const { data, error } = await supabase.from('simulators').insert(payload).select('id').single();
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); setSaving(false); return; }
    setSavedId(data.id);
    toast({ title: 'Simulado e gabarito salvos!', description: `ID: ${data.id.slice(0, 8).toUpperCase()}` });
    loadHistory(); setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('simulators').delete().eq('id', id);
    toast({ title: 'Simulado removido.' }); loadHistory();
  };

  const handleLoadSimulator = (sim: SavedSimulator) => {
    setTitle(sim.title); setExamType(sim.exam_type);
    setSelectedSubjects(sim.subject_area ? sim.subject_area.split(', ') : []);
    setGrade(sim.grade); setQuestions(sim.questions); setSavedId(sim.id);
    setActiveTab('preview');
    toast({ title: 'Simulado carregado.' });
  };

  const handlePDF = async () => {
    const container = printContainerRef.current;
    if (!container) return;
    toast({ title: 'Gerando PDF...' });
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${title || 'simulado'}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
      } as any).from(container).save();
      toast({ title: 'PDF gerado!' });
    } catch (e: any) {
      console.error('PDF error:', e);
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' });
    }
  };

  const totalQuestions = easyCount + mediumCount + hardCount;
  const currentId = savedId || crypto.randomUUID();

  // === MAGIC ACTIONS ===
  const handlePodcast = async () => {
    if (questions.length === 0) return;
    setMagicLoading('podcast');
    try {
      const { data, error } = await supabase.functions.invoke('generate-podcast-summary', {
        body: { questions, title, subject: selectedSubjects[0] || 'Geral' },
      });
      if (error) throw error;
      setPodcastScript(data.script);
      toast({ title: '🎙️ Roteiro de Podcast gerado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar podcast', description: e.message, variant: 'destructive' });
    } finally { setMagicLoading(null); }
  };

  const handleIllustrate = async () => {
    const prompt = window.prompt('Descreva a ilustração que deseja gerar:');
    if (!prompt) return;
    setMagicLoading('illustrate');
    try {
      const { data, error } = await supabase.functions.invoke('generate-illustration', {
        body: { prompt },
      });
      if (error) throw error;
      if (data.imageUrl) {
        const imgTag = `<div style="text-align:center;margin:20px 0"><img src="${data.imageUrl}" style="max-width:100%;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1)" alt="${prompt}" /></div>`;
        if (questions.length > 0) {
          const updated = [...questions];
          updated[0] = { ...updated[0], content: updated[0].content + imgTag };
          setQuestions(updated);
        }
        toast({ title: '🎨 Ilustração adicionada ao documento!' });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao gerar ilustração', description: e.message, variant: 'destructive' });
    } finally { setMagicLoading(null); }
  };

  const handleKahoot = async () => {
    if (questions.length === 0) return;
    setMagicLoading('kahoot');
    try {
      const { data, error } = await supabase.functions.invoke('export-kahoot', {
        body: { questions },
      });
      if (error) throw error;
      const blob = new Blob([data.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kahoot_${title || 'simulado'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: '🎮 CSV do Kahoot baixado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao exportar Kahoot', description: e.message, variant: 'destructive' });
    } finally { setMagicLoading(null); }
  };

  // Magic Actions Bar component
  const MagicActionsBar = () => (
    <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white mb-3 no-print">
      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 hidden sm:inline">Ações Mágicas</span>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-white/10 text-xs gap-1.5"
        onClick={handlePodcast}
        disabled={magicLoading !== null || questions.length === 0}
      >
        {magicLoading === 'podcast' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mic className="h-3.5 w-3.5" />}
        Podcast
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-white/10 text-xs gap-1.5"
        onClick={handleIllustrate}
        disabled={magicLoading !== null}
      >
        {magicLoading === 'illustrate' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Palette className="h-3.5 w-3.5" />}
        Ilustrar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:bg-white/10 text-xs gap-1.5"
        onClick={handleKahoot}
        disabled={magicLoading !== null || questions.length === 0}
      >
        {magicLoading === 'kahoot' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gamepad2 className="h-3.5 w-3.5" />}
        Kahoot
      </Button>
    </div>
  );

  // Render preview panel (reused in side-by-side and tab)
  const renderPreview = () => (
    <div className="w-full max-w-[850px] overflow-x-auto">
      <div
        ref={printContainerRef}
        className="bg-white shadow-2xl border min-w-[794px]"
        style={{ width: '794px' }}
      >
      <SimulatorPreview
        ref={previewRef}
        title={title}
        institutionName={institutionName}
        examType={examType}
        questions={questions}
        isDiscursiva={isDiscursiva}
        columns={columns}
      />
      {!isDiscursiva && (
        <AnswerSheet questionCount={questions.length} simulatorId={currentId} title={title} institutionName={institutionName} />
      )}
      {!isDiscursiva && showGabarito && (
        <GabaritoOficial questions={questions} simulatorId={currentId} title={title} institutionName={institutionName} examType={examType} />
      )}
      {isDiscursiva && (
        <EspelhoCorrecao questions={questions} simulatorId={currentId} title={title} institutionName={institutionName} />
      )}
      </div>
    </div>
  );

  const modeConfig = mode === 'vestibulares'
    ? { gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-blue-500/20', label: 'Vestibulares & ENEM', subtitle: 'Federais, UFSCar, PUC, Mackenzie, FGV, Medicina' }
    : mode === 'tecnicos'
      ? { gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', label: 'Técnicos & IFs', subtitle: 'ETEC, Institutos Federais, Cotuca, SENAI, Cursos' }
      : { gradient: 'from-blue-600 to-indigo-600', shadow: 'shadow-indigo-500/20', label: 'Master Educator Pro 6.0', subtitle: 'Plataforma Inteligente' };

  return (
    <div className="relative max-w-[1600px] mx-auto overflow-x-hidden bg-slate-50 min-h-screen -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      <GeneratingOverlay isVisible={generating} message={isAula ? 'Preparando material didático...' : `Gerando ${totalQuestions || ''} questões com IA...`} />
      <div className="flex items-center gap-3 mb-8 no-print">
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${modeConfig.gradient} flex items-center justify-center shadow-lg ${modeConfig.shadow}`}>
          <FileText className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{modeConfig.subtitle}</p>
          <h1 className="text-2xl font-bold text-slate-900">{modeConfig.label}</h1>
        </div>
      </div>

      {/* Motor Cards — only show when no mode (general simuladores page) */}
      {!mode && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch mb-8 no-print">
        {MOTOR_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeMotor === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setActiveMotor(cat.id); setExamModel(cat.models[0].value); }}
              className={`relative w-full h-full flex flex-col text-left p-5 rounded-[24px] border transition-all duration-300 min-h-[160px] overflow-hidden ${
                isActive
                  ? cat.id === 'inclusao'
                    ? 'bg-gradient-to-br from-cyan-600 to-teal-600 text-white shadow-xl shadow-cyan-500/25 border-cyan-600 scale-[1.02]'
                    : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl shadow-indigo-500/25 border-indigo-600 scale-[1.02]'
                  : 'bg-white border-slate-200 hover:shadow-md hover:scale-[1.01]'
              }`}
            >
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
              </div>
              {isActive && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
              )}
              <div className="mt-auto">
                <span className={`font-bold text-sm ${isActive ? '' : 'text-slate-800'}`}>{cat.label}</span>
                <p className={`text-xs mt-1 line-clamp-2 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                  {cat.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* Unified Workspace Card */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-6 no-print">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* iOS-style Tabs */}
          <div className="flex justify-center mb-6 no-print">
            <div className="bg-slate-200/50 p-1.5 rounded-2xl inline-flex gap-1">
              {[
                { value: 'create', label: 'Criar Conteúdo' },
                { value: 'preview', label: 'Pré-visualização' },
                { value: 'history', label: `Histórico (${history.length})` },
              ].map(tab => (
                <button
                  key={tab.value}
                  onClick={() => {
                    if (tab.value === 'preview' && questions.length === 0) return;
                    setActiveTab(tab.value);
                  }}
                  disabled={tab.value === 'preview' && questions.length === 0}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    activeTab === tab.value
                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-200/80'
                      : tab.value === 'preview' && questions.length === 0
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* CREATE TAB */}
          <TabsContent value="create">
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Left: Config panel */}
              <div className="w-full xl:w-[600px] xl:shrink-0 space-y-6">

                {/* ══════ PASSO 1: DNA / Público-Alvo ══════ */}
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-full ${isTecnicosMode ? 'bg-emerald-600' : 'bg-indigo-600'} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>1</div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      {isTecnicosMode ? 'Selecione a Instituição' : 'Selecione o DNA / Público-Alvo'}
                    </h3>
                  </div>

                  {/* ── Técnicos: 3 Institution Cards ── */}
                  {isTecnicosMode ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {TECNICOS_INSTITUTIONS.map(inst => {
                        const InstIcon = inst.icon;
                        const isSelected = tecnicoInstitution === inst.id;
                        return (
                          <button
                            key={inst.id}
                            onClick={() => { setTecnicoInstitution(inst.id); setTecnicoMode(''); }}
                            className={`relative min-h-[140px] p-5 rounded-[24px] border-2 text-left transition-all duration-300 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 ${
                              isSelected
                                ? `bg-gradient-to-br ${inst.gradient} text-white shadow-xl shadow-emerald-500/20 border-transparent scale-[1.02]`
                                : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-lg hover:scale-[1.01]'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-white/80" />
                            )}
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-emerald-50'}`}>
                              <InstIcon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                            </div>
                            <div>
                              <span className={`text-sm font-black leading-tight block ${isSelected ? 'text-white' : 'text-slate-800'}`}>{inst.label}</span>
                              <span className={`text-[11px] mt-1 block ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>{inst.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : isVestibularesMode ? (
                    /* ══════ VESTIBULARES: Tabs + Dropdown ══════ */
                    <div className="space-y-5">
                      {/* Tabs: Públicas / Particulares */}
                      <div className="flex gap-2 bg-slate-100 p-1 rounded-2xl">
                        {([
                          { id: 'publicas' as const, label: '🏛️ Universidades Públicas' },
                          { id: 'particulares' as const, label: '🏆 Universidades Particulares' },
                        ]).map(tab => (
                          <button
                            key={tab.id}
                            onClick={() => { setVestTab(tab.id); setVestInstitution(''); setActiveEspecialidade(''); setVestFormatType('geral'); setVestDiscipline(''); }}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                              vestTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      {/* Dropdown: Selecione a Instituição */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Selecione a Instituição</Label>
                        <Select
                          value={vestInstitution}
                          onValueChange={(val) => {
                            setVestInstitution(val);
                            setActiveEspecialidade(val);
                            const item = [...ARVORE_PUBLICOS, ...ARVORE_PRIVADOS].find(i => i.id === val);
                            setTechnicalDiscipline(item?.label || '');
                            setExamModel(vestTab === 'publicas' ? 'vest_publicos' : 'vest_privados');
                          }}
                        >
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-[20px]">
                            <SelectValue placeholder="Escolha a banca examinadora..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(vestTab === 'publicas' ? ARVORE_PUBLICOS : ARVORE_PRIVADOS).map(inst => (
                              <SelectItem key={inst.id} value={inst.id}>{inst.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Radio: Formato do Simulado */}
                      {vestInstitution && (
                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in duration-300">
                          <Label className="text-xs font-bold text-slate-700">📋 Qual o formato do simulado?</Label>
                          <div className="flex flex-col gap-2">
                            {([
                              { id: 'geral' as const, label: 'Simulado Geral (Modelo da Banca)', desc: 'Todas as disciplinas misturadas no estilo da banca' },
                              { id: 'disciplina' as const, label: 'Focado por Disciplina', desc: 'Questões de uma única disciplina' },
                            ]).map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => { setVestFormatType(opt.id); if (opt.id === 'geral') setVestDiscipline(''); setActiveFormat(opt.id === 'geral' ? 'completa' : 'disciplina'); }}
                                className={`px-4 py-3 rounded-xl text-left border-2 transition-all ${
                                  vestFormatType === opt.id
                                    ? 'bg-indigo-50 border-indigo-600 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <span className={`text-xs font-bold block ${vestFormatType === opt.id ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</span>
                                <span className={`text-[10px] block mt-0.5 ${vestFormatType === opt.id ? 'text-indigo-500' : 'text-slate-400'}`}>{opt.desc}</span>
                              </button>
                            ))}
                          </div>

                          {/* Conditional: Discipline selector */}
                          {vestFormatType === 'disciplina' && (
                            <div className="space-y-2 mt-2 animate-in fade-in duration-200">
                              <Label className="text-xs font-semibold text-slate-500">Disciplina desejada</Label>
                              <Select value={vestDiscipline} onValueChange={(val) => { setVestDiscipline(val); setSelectedSubjects([val]); }}>
                                <SelectTrigger className="bg-white border-slate-200 rounded-[20px]">
                                  <SelectValue placeholder="Selecione a disciplina..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {SUBJECT_AREAS.map(s => (
                                    <SelectItem key={s.name} value={s.name}>{s.icon} {s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (activeMotor === 'simulado') ? (
                    /* Categorized DNA Cards for Simulado */
                    <div className="space-y-5">
                      {activeDnaCategories.map(cat => (
                        <div key={cat.id}>
                          <p className={`text-[11px] font-black uppercase tracking-[0.15em] mb-2.5 ${cat.color}`}>{cat.title}</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                            {cat.models.map(model => {
                              const ModelIcon = model.icon;
                              const isSelected = examModel === model.value;
                              return (
                                <button
                                  key={model.value}
                                  onClick={() => setExamModel(model.value)}
                                  className={`relative min-h-[80px] p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 ${
                                    isSelected
                                      ? 'bg-indigo-50 border-indigo-600 shadow-md shadow-indigo-500/10'
                                      : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                                  }`}
                                >
                                  {isSelected && (
                                    <CheckCircle2 className="absolute top-2.5 right-2.5 h-5 w-5 text-indigo-600" />
                                  )}
                                  <ModelIcon className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                  <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                                    {model.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : isInclusao ? (
                    /* ══════ AEE: Neo-Brutal Laudo Cards ══════ */
                    <div className="grid grid-cols-2 gap-4">
                      {activeCategory.models.map(model => {
                        const ModelIcon = model.icon;
                        const isSelected = examModel === model.value;
                        const colorMap: Record<string, { bg: string; border: string; icon: string; shadow: string }> = {
                          aee_tea: { bg: 'bg-amber-50', border: 'border-amber-500', icon: 'text-amber-600', shadow: 'shadow-amber-500/20' },
                          aee_tdah: { bg: 'bg-rose-50', border: 'border-rose-500', icon: 'text-rose-600', shadow: 'shadow-rose-500/20' },
                          aee_intelectual: { bg: 'bg-violet-50', border: 'border-violet-500', icon: 'text-violet-600', shadow: 'shadow-violet-500/20' },
                          aee_visual: { bg: 'bg-sky-50', border: 'border-sky-500', icon: 'text-sky-600', shadow: 'shadow-sky-500/20' },
                        };
                        const colors = colorMap[model.value] || colorMap.aee_tea;
                        return (
                          <button
                            key={model.value}
                            onClick={() => setExamModel(model.value)}
                            className={`relative min-h-[120px] p-5 rounded-2xl text-left transition-all duration-300 flex flex-col gap-3 ${
                              isSelected
                                ? `${colors.bg} border-[3px] ${colors.border} shadow-2xl ${colors.shadow} scale-[1.02]`
                                : 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-lg hover:scale-[1.01]'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className={`absolute top-3 right-3 h-6 w-6 ${colors.icon}`} />
                            )}
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${isSelected ? colors.bg : 'bg-slate-100'}`}>
                              <ModelIcon className={`h-7 w-7 ${isSelected ? colors.icon : 'text-slate-400'}`} />
                            </div>
                            <span className={`text-sm font-black leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                              {model.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Simple card grid for Aula / Questões */
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {activeCategory.models.map(model => {
                        const ModelIcon = model.icon;
                        const isSelected = examModel === model.value;
                        return (
                          <button
                            key={model.value}
                            onClick={() => setExamModel(model.value)}
                            className={`relative min-h-[80px] p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-600 shadow-md shadow-indigo-500/10'
                                : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="absolute top-2.5 right-2.5 h-5 w-5 text-indigo-600" />
                            )}
                            <ModelIcon className={`h-5 w-5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>
                              {model.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ══════ TÉCNICOS: PASSO 2 — Modelo de Simulado ══════ */}
                {isTecnicosMode && tecnicoInstitution && (
                  <>
                    <div className="border-t border-emerald-100" />
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Modelo de Simulado</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Opção A: Vestibulinho Completo */}
                        <button
                          onClick={() => setTecnicoMode('completo')}
                          className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-200 flex flex-col gap-3 min-h-[120px] ${
                            tecnicoMode === 'completo'
                              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-500 shadow-lg shadow-emerald-500/15'
                              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                          }`}
                        >
                          {tecnicoMode === 'completo' && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-emerald-600" />}
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tecnicoMode === 'completo' ? 'bg-emerald-600' : 'bg-emerald-100'}`}>
                            <Zap className={`h-5 w-5 ${tecnicoMode === 'completo' ? 'text-white' : 'text-emerald-600'}`} />
                          </div>
                          <div>
                            <span className={`text-sm font-black block ${tecnicoMode === 'completo' ? 'text-emerald-800' : 'text-slate-700'}`}>Vestibulinho Completo</span>
                            <span className={`text-[11px] block mt-0.5 ${tecnicoMode === 'completo' ? 'text-emerald-600' : 'text-slate-400'}`}>50 questões mistas — Padrão Oficial</span>
                          </div>
                        </button>
                        {/* Opção B: Simulado por Área */}
                        <button
                          onClick={() => setTecnicoMode('por_area')}
                          className={`relative p-5 rounded-[20px] border-2 text-left transition-all duration-200 flex flex-col gap-3 min-h-[120px] ${
                            tecnicoMode === 'por_area'
                              ? 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-500 shadow-lg shadow-teal-500/15'
                              : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-md'
                          }`}
                        >
                          {tecnicoMode === 'por_area' && <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-teal-600" />}
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tecnicoMode === 'por_area' ? 'bg-teal-600' : 'bg-teal-100'}`}>
                            <ListChecks className={`h-5 w-5 ${tecnicoMode === 'por_area' ? 'text-white' : 'text-teal-600'}`} />
                          </div>
                          <div>
                            <span className={`text-sm font-black block ${tecnicoMode === 'por_area' ? 'text-teal-800' : 'text-slate-700'}`}>Simulado por Área</span>
                            <span className={`text-[11px] block mt-0.5 ${tecnicoMode === 'por_area' ? 'text-teal-600' : 'text-slate-400'}`}>Escolha disciplinas e quantidade</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ══════ TÉCNICOS: PASSO 3 — Configuração por Área (condicional) ══════ */}
                {isTecnicosPorArea && (
                  <>
                    <div className="border-t border-teal-100" />
                    <div className="space-y-5 animate-in fade-in slide-in-from-top-3 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Selecione as Áreas</h3>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {TECNICOS_AREA_SUBJECTS.map(subj => {
                          const isActive = tecnicoSubjects.includes(subj.label);
                          return (
                            <button
                              key={subj.id}
                              onClick={() => setTecnicoSubjects(prev =>
                                prev.includes(subj.label) ? prev.filter(s => s !== subj.label) : [...prev, subj.label]
                              )}
                              className={`px-5 py-2.5 rounded-2xl text-sm font-bold border-2 transition-all duration-200 flex items-center gap-2 ${
                                isActive
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:shadow-sm'
                              }`}
                            >
                              <span>{subj.icon}</span>
                              <span>{subj.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-700">📊 Quantidade de Questões</Label>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-sm font-black">{tecnicoQuestionCount} questões</Badge>
                        </div>
                        <Slider
                          value={[tecnicoQuestionCount]}
                          onValueChange={([v]) => setTecnicoQuestionCount(v)}
                          min={5}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>5</span>
                          <span>25</span>
                          <span>50</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ══════ TÉCNICOS: Fast-Track Info Card ══════ */}
                {isFastTrackVestibulinho && (
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-emerald-800">⚡ Estrutura Inteligente Ativada</h4>
                        <p className="text-xs text-emerald-600 mt-1">50 questões abrangentes distribuídas entre as matérias principais da banca oficial.</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">📝 Português</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">📐 Matemática</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">🧪 Ciências</Badge>
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">🌎 Humanas</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════ TÉCNICOS: Cabeçalho + Botão Final ══════ */}
                {isTecnicosAny && (
                  <>
                    <div className="border-t border-emerald-100" />
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                          {isTecnicosPorArea ? 4 : 3}
                        </div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Cabeçalho do Simulado</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Nome da Instituição</Label>
                          <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder={TECNICOS_INSTITUTIONS.find(i => i.id === tecnicoInstitution)?.label || 'Instituição...'} className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-emerald-500/20" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold text-slate-500">Título do Documento</Label>
                          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Simulado Vestibulinho 2026" className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-emerald-500/20" />
                        </div>
                      </div>
                      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:pb-0 sm:pt-0 sm:mx-0 sm:px-0 z-20">
                      <Button
                        onClick={() => generateQuestions(false)}
                        disabled={generating || (isTecnicosPorArea && tecnicoSubjects.length === 0)}
                        size="lg"
                        className="w-full h-14 rounded-2xl text-white text-base font-black tracking-wide shadow-xl transition-all bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30"
                      >
                        {generating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
                        {generating ? 'GERANDO VESTIBULINHO...' : isFastTrackVestibulinho ? 'GERAR VESTIBULINHO COMPLETO' : 'GERAR SIMULADO PERSONALIZADO'}
                      </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* ══════ AEE: Hero Banner + Modo de Trabalho ══════ */}
                {isInclusao && (
                  <>
                    {/* Hero Banner */}
                    <div className="bg-[#0F172A] rounded-[3.5rem] p-8 sm:p-10 text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 to-teal-600/10 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <Accessibility className="h-6 w-6 text-white" />
                          </div>
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] uppercase tracking-widest font-bold">
                            Inclusão AEE
                          </Badge>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                          Educação para Todos,<br />Sem Exceção.
                        </h2>
                        <p className="text-sm text-slate-400 mt-3 max-w-md leading-relaxed">
                          IA especializada em Desenho Universal para a Aprendizagem. Crie materiais adaptados por perfil com imagens de apoio visual geradas automaticamente.
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">2</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Modo de Trabalho AEE</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {([
                          { id: 'gerar_novas' as const, label: 'Gerar Novas Questões', icon: Sparkles, desc: 'Crie questões adaptadas do zero' },
                          { id: 'adaptar_antigas' as const, label: 'Adaptar Prova Existente', icon: RefreshCw, desc: 'Traduza provas convencionais para formato inclusivo' },
                          { id: 'texto_resumo' as const, label: 'Apostila / Roteiro Visual', icon: BookMarked, desc: 'Gere materiais visuais e roteiros simplificados' },
                        ]).map(mode => {
                          const ModeIcon = mode.icon;
                          const isSelected = aeeMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              onClick={() => setAeeMode(mode.id)}
                              className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 flex flex-col gap-2 min-h-[100px] ${
                                isSelected
                                  ? 'bg-cyan-50 border-cyan-600 shadow-md shadow-cyan-500/10'
                                  : 'bg-slate-50 border-transparent hover:border-slate-200 hover:shadow-sm'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="absolute top-2.5 right-2.5 h-5 w-5 text-cyan-600" />}
                              <ModeIcon className={`h-5 w-5 ${isSelected ? 'text-cyan-600' : 'text-slate-400'}`} />
                              <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-cyan-700' : 'text-slate-600'}`}>{mode.label}</span>
                              <span className="text-[10px] text-slate-400 leading-tight">{mode.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">3</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Configuração do Conteúdo AEE</h3>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Assunto / Tema</Label>
                        <Input
                          value={aeeTopic}
                          onChange={e => setAeeTopic(e.target.value)}
                          placeholder="Ex: Sistema Solar, Frações, Animais vertebrados..."
                          className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-cyan-500/20"
                        />
                      </div>

                      {aeeMode === 'gerar_novas' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500">Quantidade de Questões</Label>
                            <Input
                              type="number"
                              min={1}
                              max={20}
                              value={aeeQuestionCount}
                              onChange={e => setAeeQuestionCount(+e.target.value)}
                              className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-cyan-500/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold text-slate-500">Tipo AEE</Label>
                            <Select value={aeeQuestionType} onValueChange={setAeeQuestionType}>
                              <SelectTrigger className="bg-slate-50 border-slate-200 rounded-[20px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="multipla_visual">Múltipla Escolha Visual</SelectItem>
                                <SelectItem value="verdadeiro_falso">Verdadeiro ou Falso</SelectItem>
                                <SelectItem value="ligar_colunas">Ligar Colunas</SelectItem>
                                <SelectItem value="perguntas_diretas">Perguntas Diretas</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">
                          {aeeMode === 'adaptar_antigas' ? 'Cole aqui a prova original para adaptação' : 'Contexto / Texto de apoio (Opcional)'}
                        </Label>
                        <Textarea
                          value={aeeContent}
                          onChange={e => setAeeContent(e.target.value)}
                          placeholder={
                            aeeMode === 'adaptar_antigas'
                              ? 'Cole aqui o texto da prova que deseja adaptar para formato inclusivo...'
                              : 'Informações adicionais, contexto pedagógico ou texto-base...'
                          }
                          className="bg-slate-50 border-slate-200 rounded-2xl min-h-[100px] focus:ring-4 focus:ring-cyan-500/20"
                        />
                      </div>

                      <Button
                        onClick={async () => {
                          setGenerating(true);
                          setQuestions([]);
                          try {
                            const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
                              body: {
                                isInclusao: true,
                                activeDna: examModel, // aee_visual, aee_intelectual, aee_tea, aee_tdah
                                aeeMode,
                                aeeTopic,
                                aeeContent: aeeContent.trim() || undefined,
                                aeeQuestionCount,
                                aeeQuestionType,
                                specificTopic: aeeTopic,
                              },
                            });
                            if (error) throw error;
                            if (data?.error) throw new Error(data.error);
                            if (data?.questions) {
                              setQuestions(data.questions);
                              setSavedId(null);
                              setActiveTab('preview');
                              // Auto-save AEE to bank
                              addToBank(data.questions.map((q: any, i: number) => ({
                                id: `aee-${Date.now()}-${i}`,
                                banca: 'AEE',
                                tema: aeeTopic || 'Inclusão',
                                conteudo: q.content,
                                tipo: aeeQuestionType || 'Adaptada',
                                options: q.options,
                                dataCriacao: new Date().toISOString(),
                              })));
                              toast({ title: '🏆 MISSÃO CONCLUÍDA! Material AEE gerado com sucesso! +500 XP' });
                            }
                          } catch (e: any) {
                            console.error(e);
                            toast({ title: 'Erro ao gerar conteúdo AEE', description: e.message, variant: 'destructive' });
                          } finally { setGenerating(false); }
                        }}
                        disabled={generating || !aeeTopic}
                        size="lg"
                        className="w-full rounded-[20px] text-white shadow-lg transition-all bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 shadow-cyan-500/20"
                      >
                        {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Accessibility className="h-4 w-4 mr-2" />}
                        {generating
                          ? 'Gerando...'
                          : 'GERAR ATIVIDADE COM FIGURAS'
                        }
                      </Button>
                    </div>
                  </>
                )}

                {!isInclusao && !isTecnicosMode && modelConfig && (() => {
                  const stepBanca = 2;
                  return (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{stepBanca}</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                          {isObmep ? 'Selecione o Nível Olímpico' : `Estrutura Específica da ${modelConfig.label}`}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modelConfig.formats.map(fmt => {
                          const isSelected = selectedFormat === fmt.id;
                          return (
                            <button
                              key={fmt.id}
                              onClick={() => setSelectedFormat(fmt.id)}
                              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-start gap-3 ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-500/10'
                                  : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                              }`}
                            >
                              <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                isSelected ? 'border-indigo-600' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-base">{fmt.icon}</span>
                                  <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{fmt.label}</span>
                                </div>
                                {fmt.subjects.length > 0 && (
                                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{fmt.subjects.join(' · ')}</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {selectedSubjects.length > 0 && (
                        <p className="text-xs text-indigo-500 font-medium">✅ {selectedSubjects.length} disciplina(s) selecionada(s) automaticamente</p>
                      )}
                    </div>
                  </>
                  );
                })()}

                {/* ══════ PASSO: Seletor de Disciplinas (quando não auto-populado) ══════ */}
                {!isInclusao && !isTecnicosMode && !isConcurso && !isObmep && selectedSubjects.length === 0 && (() => {
                  const stepDisc = modelConfig ? (showSerieStep ? 4 : 3) : (showSerieStep ? 3 : 2);
                  return (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{stepDisc}</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Selecione a(s) Disciplina(s)</h3>
                      </div>
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                        ⚠️ Selecione ao menos uma disciplina para continuar.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECT_AREAS.map(s => {
                          const isSelected = selectedSubjects.includes(s.name);
                          return (
                            <button
                              key={s.name}
                              onClick={() => toggleSubject(s.name)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                isSelected
                                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:shadow-sm'
                              }`}
                            >
                              {s.icon} {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                  );
                })()}

                {/* Discipline chips when subjects ARE selected but not from modelConfig (manual selection) */}
                {!isInclusao && !isTecnicosMode && !isConcurso && !isObmep && selectedSubjects.length > 0 && !modelConfig && (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">✓</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Disciplina(s) Selecionada(s)</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECT_AREAS.map(s => {
                          const isSelected = selectedSubjects.includes(s.name);
                          return (
                            <button
                              key={s.name}
                              onClick={() => toggleSubject(s.name)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                                isSelected
                                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300 hover:shadow-sm'
                              }`}
                            >
                              {s.icon} {s.name}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-violet-500 font-medium">✅ {selectedSubjects.length} disciplina(s) selecionada(s)</p>
                    </div>
                  </>
                )}

                {/* ══════ PASSO: Série Escolar (condicional — simulado && !obmep) ══════ */}
                {showSerieStep && !isTecnicosAny && (() => {
                  const stepSerie = modelConfig ? 3 : 2;
                  return (
                  <>
                    <div className="border-t border-slate-100" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{stepSerie}</div>
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Série / Ano Escolar</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {SERIES_CATEGORIAS.map(cat => (
                          <div key={cat.label}>
                            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 mb-2">{cat.label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.series.map(s => {
                                const isSelected = activeSerie === s.id;
                                return (
                                  <button
                                    key={s.id}
                                    onClick={() => { setActiveSerie(s.id); setGrade(SERIE_GRADE_MAP[s.id] || ''); }}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                                    }`}
                                  >
                                    {s.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Árvore Vestibulares — handled by tabs+dropdown in Step 1 for vestibulares mode */}

                      {/* Árvore Vestibulinhos (Ingresso) */}
                      {examModel === 'vestibulinhos' && (
                        <div className="space-y-3 mt-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 animate-in fade-in duration-300">
                          <Label className="text-xs font-bold text-emerald-700">🎓 Vestibulinhos — Exames de Ingresso</Label>
                          <div className="flex flex-wrap gap-2.5">
                            {ARVORE_VESTIBULINHOS.map(esp => (
                              <button
                                key={esp.id}
                                onClick={() => { setActiveEspecialidade(esp.id); setTechnicalDiscipline(esp.label); }}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                  activeEspecialidade === esp.id
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                    : 'bg-white border-emerald-200 text-emerald-700 hover:border-emerald-400'
                                }`}
                              >
                                {esp.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-emerald-600">Foco: conhecimentos gerais do Ensino Fundamental II (Português, Matemática, Ciências)</p>
                        </div>
                      )}

                      {/* Árvore Cursos Técnicos */}
                      {examModel === 'cursos_tecnicos' && (
                        <div className="space-y-3 mt-2 p-4 rounded-2xl bg-cyan-50 border border-cyan-200 animate-in fade-in duration-300">
                          <Label className="text-xs font-bold text-cyan-700">🔧 Cursos Profissionalizantes — Eixos Técnicos</Label>
                          <div className="flex flex-wrap gap-2.5">
                            {ARVORE_CURSOS_TECNICOS.map(esp => (
                              <button
                                key={esp.id}
                                onClick={() => { setActiveEspecialidade(esp.id); setTechnicalDiscipline(esp.label); }}
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                                  activeEspecialidade === esp.id
                                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                                    : 'bg-white border-cyan-200 text-cyan-700 hover:border-cyan-400'
                                }`}
                              >
                                {esp.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-cyan-600">Foco: conhecimentos específicos da profissão (Lógica, Anatomia, Eletricidade, Agronomia...)</p>
                        </div>
                      )}

                      {/* Formato / Recorte da Prova — hidden for Fast-Track Vestibulinho */}
                      {activeEspecialidade && examModel !== 'cursos_tecnicos' && !isFastTrackVestibulinho && (
                        <div className="space-y-3 mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in fade-in duration-300">
                          <Label className="text-xs font-bold text-slate-700">📋 Formato / Recorte da Prova</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {FORMATOS_PROVA.map(fmt => (
                              <button
                                key={fmt.id}
                                onClick={() => setActiveFormat(fmt.id)}
                                className={`px-3 py-2 rounded-xl text-left border transition-all ${
                                  activeFormat === fmt.id
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                                }`}
                              >
                                <span className="text-[11px] font-bold block">{fmt.label}</span>
                                <span className={`text-[10px] block ${activeFormat === fmt.id ? 'text-slate-300' : 'text-slate-400'}`}>{fmt.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                  );
                })()}

                {/* ══════ PASSO FINAL: Configurações Finais ══════ */}
                {!isInclusao && !isTecnicosMode && (() => {
                  let finalStep = 2;
                  if (modelConfig) finalStep++;
                  if (showSerieStep) finalStep++;
                  
                  return (
                <>
                <div className="border-t border-slate-100" />
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-full ${isFastTrackVestibulinho ? 'bg-emerald-600' : 'bg-cyan-600'} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>
                      {isFastTrackVestibulinho ? 2 : finalStep}
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
                      {isFastTrackVestibulinho ? 'Cabeçalho do Simulado' : 'Configurações Finais'}
                    </h3>
                  </div>

                  <div className={`grid grid-cols-1 ${isFastTrackVestibulinho ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500">Nome da Instituição</Label>
                      <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Escola Municipal..." className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-500">Título do Documento</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={isFastTrackVestibulinho ? 'Simulado Vestibulinho 2025' : (isAula ? 'Apostila de Biologia' : `Simulado ${activeCategory.label}`)} className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
                    </div>
                    {!isFastTrackVestibulinho && (
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Tema Específico (Opcional)</Label>
                        <Input value={specificTopic} onChange={e => setSpecificTopic(e.target.value)} placeholder="Ex: Mitose e Meiose..." className="bg-slate-50 border-slate-200 rounded-[20px] focus:ring-4 focus:ring-indigo-500/20" />
                      </div>
                    )}
                  </div>

                  {/* Fast-Track Vestibulinho Info Card */}
                  {isFastTrackVestibulinho && activeEspecialidade && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 animate-in fade-in duration-300">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-emerald-800">⚡ Estrutura Inteligente Ativada</p>
                          <p className="text-xs text-emerald-600 mt-1 leading-relaxed">
                            50 questões abrangentes distribuídas equilibradamente entre <strong>Português</strong>, <strong>Matemática</strong> e <strong>Ciências</strong> — seguindo rigorosamente o estilo oficial da banca selecionada.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">📝 Língua Portuguesa</Badge>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">📐 Matemática</Badge>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">🧪 Ciências da Natureza</Badge>
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">🌎 Ciências Humanas</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isFastTrackVestibulinho && !isObmep && !showSerieStep && !isVestibularesMode && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500">Série</Label>
                        <Select value={grade} onValueChange={setGrade}>
                          <SelectTrigger className="bg-slate-50 border-slate-200 rounded-[20px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {isObmep && selectedFormat && (
                    <p className="text-xs text-indigo-500 font-medium">
                      🏅 {modelConfig?.formats.find(f => f.id === selectedFormat)?.label} — {isObmepFase2 ? '6 questões discursivas' : '20 questões objetivas'} geradas automaticamente
                    </p>
                  )}

                  {showSerieStep && activeSerie && (
                    <p className="text-xs text-indigo-600 font-medium">
                      📚 Série selecionada: {SERIE_GRADE_MAP[activeSerie] || activeSerie}
                    </p>
                  )}

                  {!isFastTrackVestibulinho && (
                  <>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">📖 Material de Apoio (RAG)</h4>
                    <textarea
                      value={customMaterial}
                      onChange={e => setCustomMaterial(e.target.value)}
                      placeholder="Cole aqui o conteúdo da sua apostila, texto-base ou material de referência..."
                      className="w-full min-h-[80px] p-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 resize-y focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
                    />
                    {customMaterial.trim() && (
                      <p className="text-xs text-cyan-600 font-medium">✅ Material carregado ({customMaterial.length} caracteres)</p>
                    )}
                  </div>

                  {/* Toggle: Include Images */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50 border border-indigo-200">
                    <div className="flex-1 mr-4">
                      <Label className="text-sm font-bold text-indigo-700 cursor-pointer">Incluir Figuras / Ilustrações</Label>
                      <p className="text-[10px] text-indigo-500 mt-0.5">(A IA irá gerar ou buscar pictogramas e imagens didáticas. Altamente recomendado para Infantil e Fund 1)</p>
                    </div>
                    <Switch
                      checked={includeImages}
                      onCheckedChange={setIncludeImages}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold text-slate-500">🌡️ Termómetro de Bloom</Label>
                    <input type="range" min={1} max={4} step={1} value={bloomLevel} onChange={e => setBloomLevel(+e.target.value)} className="w-full accent-indigo-600" />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span className={bloomLevel === 1 ? 'text-cyan-600 font-bold' : ''}>Fácil</span>
                      <span className={bloomLevel === 2 ? 'text-amber-600 font-bold' : ''}>Médio</span>
                      <span className={bloomLevel === 3 ? 'text-red-600 font-bold' : ''}>Difícil</span>
                      <span className={bloomLevel === 4 ? 'text-purple-600 font-bold' : ''}>Hacker</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 text-center">
                      <Label className="text-cyan-600 font-semibold text-xs">🟢 Fácil</Label>
                      <Input type="number" min={0} max={15} value={easyCount} onChange={e => setEasyCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
                    </div>
                    <div className="space-y-2 text-center">
                      <Label className="text-amber-600 font-semibold text-xs">🟡 Médio</Label>
                      <Input type="number" min={0} max={15} value={mediumCount} onChange={e => setMediumCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
                    </div>
                    <div className="space-y-2 text-center">
                      <Label className="text-red-600 font-semibold text-xs">🔴 Difícil</Label>
                      <Input type="number" min={0} max={15} value={hardCount} onChange={e => setHardCount(+e.target.value)} className="text-center bg-slate-50 border-slate-200 rounded-2xl" />
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">Total: {totalQuestions} questões</p>
                  </>
                  )}
                </div>
                </>
                  );
                })()}

                {!isInclusao && <>
                <div className="border-t border-slate-100 pt-4" />
                <div className="flex flex-col gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 sm:static sm:bg-transparent sm:backdrop-blur-none sm:pb-0 sm:pt-0 sm:mx-0 sm:px-0 z-20">
                  {isFastTrackVestibulinho ? (
                    <Button
                      onClick={() => generateQuestions(false)}
                      disabled={generating || !activeEspecialidade}
                      size="lg"
                      className="w-full h-14 rounded-2xl text-white text-base font-black tracking-wide shadow-xl transition-all bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-500/30"
                    >
                      {generating ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Zap className="h-5 w-5 mr-2" />}
                      {generating ? 'GERANDO VESTIBULINHO...' : 'GERAR SIMULADO VESTIBULINHO COMPLETO'}
                    </Button>
                  ) : isAula ? (
                    <Button
                      onClick={() => generateQuestions(false)}
                      disabled={generating || (selectedSubjects.length === 0 && !specificTopic)}
                      size="lg"
                      className="w-full rounded-[20px] text-white shadow-lg transition-all bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-cyan-500/20"
                    >
                      {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BookText className="h-4 w-4 mr-2" />}
                      {generating ? 'Gerando material...' : 'GERAR MATERIAL'}
                    </Button>
                  ) : (
                    <>
                    {!isConcurso && !isObmep && selectedSubjects.length === 0 && (
                      <p className="text-xs text-amber-600 font-semibold text-center animate-pulse">⚠️ Selecione ao menos uma disciplina acima para habilitar a geração.</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button onClick={() => generateQuestions(false)} disabled={generating || totalQuestions === 0 || (!isConcurso && !isObmep && selectedSubjects.length === 0)} size="lg" className="w-full rounded-[20px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-500/20 transition-all">
                        {generating && !isDiscursiva ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        {generating && !isDiscursiva ? 'Gerando...' : `GERAR OBJETIVA — ${totalQuestions}q`}
                      </Button>
                      <Button onClick={() => generateQuestions(true)} disabled={generating || totalQuestions === 0 || (!isConcurso && !isObmep && selectedSubjects.length === 0)} size="lg" variant="outline" className="w-full rounded-[20px] border-slate-200 hover:bg-slate-50 transition-all">
                        {generating && isDiscursiva ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenTool className="h-4 w-4 mr-2" />}
                        {generating && isDiscursiva ? 'Gerando...' : `GERAR DISCURSIVA — ${totalQuestions}q`}
                      </Button>
                    </div>
                    </>
                  )}
                </div>
                </>}

                {generating && (
                  <div className="mt-4 flex flex-col items-center gap-3 py-6 animate-pulse">
                    <div className="relative">
                      <GraduationCap className="h-12 w-12 text-indigo-500 animate-bounce" />
                      <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-ping" />
                    </div>
                    <p className="text-sm font-medium text-slate-500 text-center">Gerando conteúdo de elite...</p>
                  </div>
                )}

              {/* Quick questions list */}
              {questions.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Questões ({questions.length})</CardTitle>
                      <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Salvar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                    {questions.map((q, i) => (
                      <div key={i} className="p-2 border rounded-lg text-sm">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="shrink-0 text-xs">{String(i + 1).padStart(2, '0')}</Badge>
                          <div className="flex-1 min-w-0">
                            {q.skillCode && <span className="text-xs text-muted-foreground">[{q.skillCode}]</span>}
                            <div className="text-xs mt-0.5 line-clamp-2" dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Live A4 preview (desktop only) */}
            {questions.length > 0 && (
              <div className="hidden xl:block flex-1 min-w-0">
                <Card className="sticky top-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      {!isDiscursiva && (
                        <div className="flex items-center gap-2">
                          <Checkbox id="showGabSide" checked={showGabarito} onCheckedChange={(v) => setShowGabarito(!!v)} />
                          <Label htmlFor="showGabSide" className="text-sm cursor-pointer">Gabarito</Label>
                        </div>
                      )}
                      {isDiscursiva && <Badge variant="outline" className="text-xs">2ª Fase</Badge>}
                      <div className="flex items-center gap-1 border rounded-lg p-0.5">
                        <button onClick={() => setColumns(1)} className={`p-1.5 rounded ${columns === 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="1 Coluna"><AlignJustify size={14} /></button>
                        <button onClick={() => setColumns(2)} className={`p-1.5 rounded ${columns === 2 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="2 Colunas"><Columns2 size={14} /></button>
                      </div>
                      <div className="flex-1" />
                      <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={14} className="mr-1" />Imprimir</Button>
                      <Button size="sm" onClick={handlePDF} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Download size={14} className="mr-1" />PDF
                      </Button>
                    </div>
                    <MagicActionsBar />
                    <div className="overflow-auto max-h-[80vh] bg-muted/30 rounded-lg p-4 flex justify-center">
                      {renderPreview()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4 flex-wrap">
                {!isDiscursiva && (
                  <div className="flex items-center gap-2">
                    <Checkbox id="showGab" checked={showGabarito} onCheckedChange={(v) => setShowGabarito(!!v)} />
                    <Label htmlFor="showGab" className="text-sm cursor-pointer">Incluir Gabarito Oficial</Label>
                  </div>
                )}
                {isDiscursiva && <Badge variant="outline" className="text-xs">2ª Fase — Discursiva</Badge>}
                <div className="flex items-center gap-1 border rounded-lg p-0.5">
                  <button onClick={() => setColumns(1)} className={`p-1.5 rounded ${columns === 1 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="1 Coluna"><AlignJustify size={14} /></button>
                  <button onClick={() => setColumns(2)} className={`p-1.5 rounded ${columns === 2 ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`} title="2 Colunas"><Columns2 size={14} /></button>
                </div>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2" />Imprimir</Button>
                <Button size="sm" onClick={handlePDF} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Download size={16} className="mr-2" />Baixar PDF
                </Button>
              </CardContent>
            </Card>
            {questions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Gere questões para ver a pré-visualização.</p>
              </div>
            ) : (
              <>
                <MagicActionsBar />
                <div className="flex justify-center bg-muted/30 py-4 sm:py-8 rounded-lg overflow-x-auto">
                  {renderPreview()}
                </div>
                {podcastScript && (
                  <Card className="mt-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2"><Mic className="h-5 w-5 text-purple-500" /> Roteiro de Podcast</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setPodcastScript(null)}>✕</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: podcastScript }} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-lg">Simulados Salvos</CardTitle></CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum simulado salvo ainda.</p>
              ) : (
                <div className="space-y-2">
                  {history.map(sim => (
                    <div key={sim.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{sim.title}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{EXAM_TYPES.find(e => e.value === sim.exam_type)?.label}</Badge>
                          <span className="text-xs text-muted-foreground">{sim.subject_area} · {sim.grade}</span>
                          <span className="text-xs text-muted-foreground">{(sim.questions as any[])?.length || 0} questões</span>
                          <span className="text-xs font-mono text-muted-foreground">ID: {sim.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleLoadSimulator(sim)}><Eye size={16} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(sim.id)} className="text-destructive"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>{/* end unified workspace card */}
      {/* Print-only view */}
      <div className="print-only">
        {questions.length > 0 && (
          <>
            <SimulatorPreview title={title} institutionName={institutionName} examType={examType} questions={questions} isDiscursiva={isDiscursiva} columns={columns} />
            {!isDiscursiva && <AnswerSheet questionCount={questions.length} simulatorId={currentId} title={title} institutionName={institutionName} />}
            {!isDiscursiva && showGabarito && <GabaritoOficial questions={questions} simulatorId={currentId} title={title} institutionName={institutionName} examType={examType} />}
            {isDiscursiva && <EspelhoCorrecao questions={questions} simulatorId={currentId} title={title} institutionName={institutionName} />}
          </>
        )}
      </div>
    </div>
  );
}
