import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { startGeneration, getGeneration, clearGeneration } from '@/lib/background-generation';
import DOMPurify from 'dompurify';
import { Trophy, Wand2, Copy, FileDown, Loader2, Save, MessageCircle, Link2, Sparkles, CalendarDays, QrCode, Rocket, PlusCircle, CheckCircle2, Circle } from 'lucide-react';
import QRCodeModal from '@/components/QRCodeModal';
import SimuladoLaunchScreen from '@/components/SimuladoLaunchScreen';
import matAvatar from '@/assets/mat-avatar.png';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { buildPublicAppUrl } from '@/lib/public-links';

const redesEnsino = [
  { value: 'rede_vertice_plus', label: 'Rede Vértice Plus', desc: 'Tradição e rigor acadêmico' },
  { value: 'rede_alpha', label: 'Rede Alpha', desc: 'Altíssima complexidade' },
  { value: 'rede_vertice', label: 'Rede Vértice', desc: 'Método espiral progressivo' },
  { value: 'sistema_delta', label: 'Sistema Delta', desc: 'Foco em resultados objetivos' },
  { value: 'instituto_lumina', label: 'Instituto Lumina', desc: 'Abrangência e profundidade' },
  { value: 'rede_sigma', label: 'Rede Sigma', desc: 'Didática estruturada' },
];

const MATRIZ_OPTIONS = [
  { value: 'bncc', label: 'Padrão BNCC', icon: '📘', desc: 'Habilidades curriculares nacionais' },
  { value: 'saresp', label: 'Foco Avaliação Externa', icon: '📊', desc: 'Simulados de larga escala' },
  { value: 'vestibular', label: 'Vestibular/Particulares', icon: '🎯', desc: 'Complexidade máxima' },
];

// Content suggestion database: série × disciplina → chips
const CONTENT_SUGGESTIONS: Record<string, Record<string, { label: string; tag: string }[]>> = {
  'infantil': {
    'Linguagem': [
      { label: 'Histórias cantadas e parlendas', tag: 'BNCC' },
      { label: 'Reconhecimento de letras do nome', tag: 'BNCC' },
      { label: 'Contação de histórias com imagens', tag: 'BNCC' },
    ],
    'Matemática': [
      { label: 'Contagem de objetos até 10', tag: 'BNCC' },
      { label: 'Formas geométricas no cotidiano', tag: 'BNCC' },
      { label: 'Noções de grande/pequeno, perto/longe', tag: 'BNCC' },
    ],
    'Natureza': [
      { label: 'Partes do corpo e sentidos', tag: 'BNCC' },
      { label: 'Animais domésticos e selvagens', tag: 'BNCC' },
      { label: 'Plantas e ciclo de crescimento', tag: 'BNCC' },
    ],
  },
  'fundamental-i': {
    'Matemática': [
      { label: 'Números e operações básicas', tag: 'BNCC' },
      { label: 'Geometria: formas e sólidos', tag: 'BNCC' },
      { label: 'Medidas de comprimento e massa', tag: 'BNCC' },
      { label: 'Problemas com sistema monetário', tag: 'Avaliação' },
      { label: 'Tabelas e gráficos simples', tag: 'Avaliação' },
    ],
    'Português': [
      { label: 'Leitura e interpretação de textos', tag: 'BNCC' },
      { label: 'Ortografia e acentuação', tag: 'BNCC' },
      { label: 'Produção de pequenos textos narrativos', tag: 'BNCC' },
      { label: 'Gêneros textuais: fábula, conto, poema', tag: 'Avaliação' },
      { label: 'Inferência e localização de informações', tag: 'Avaliação' },
    ],
    'Ciências': [
      { label: 'Corpo humano: sentidos e higiene', tag: 'BNCC' },
      { label: 'Animais e plantas: classificação', tag: 'BNCC' },
      { label: 'Água e ciclo da água', tag: 'BNCC' },
      { label: 'Meio ambiente e sustentabilidade', tag: 'Avaliação' },
    ],
    'História': [
      { label: 'Noção de tempo: passado e presente', tag: 'BNCC' },
      { label: 'Família e comunidade', tag: 'BNCC' },
      { label: 'Festas populares e cultura local', tag: 'BNCC' },
    ],
    'Geografia': [
      { label: 'Paisagens naturais e modificadas', tag: 'BNCC' },
      { label: 'Bairro e cidade: elementos', tag: 'BNCC' },
      { label: 'Representações cartográficas simples', tag: 'BNCC' },
    ],
  },
  'fundamental-ii': {
    'Matemática': [
      { label: 'Equações do 1º grau', tag: 'BNCC' },
      { label: 'Razão e proporção', tag: 'BNCC' },
      { label: 'Geometria plana: áreas e perímetros', tag: 'Avaliação' },
      { label: 'Estatística: média, moda e mediana', tag: 'Avaliação' },
      { label: 'Potenciação e radiciação', tag: 'BNCC' },
      { label: 'Frações e números decimais', tag: 'Avaliação' },
      { label: 'Teorema de Pitágoras', tag: 'Vestibular' },
    ],
    'Português': [
      { label: 'Interpretação de textos argumentativos', tag: 'Avaliação' },
      { label: 'Classes gramaticais', tag: 'BNCC' },
      { label: 'Concordância verbal e nominal', tag: 'BNCC' },
      { label: 'Gêneros: crônica, reportagem, editorial', tag: 'Avaliação' },
      { label: 'Variação linguística', tag: 'BNCC' },
      { label: 'Coesão e coerência textual', tag: 'Vestibular' },
    ],
    'Ciências': [
      { label: 'Célula: estrutura e organelas', tag: 'BNCC' },
      { label: 'Sistemas do corpo humano', tag: 'Avaliação' },
      { label: 'Ecologia: cadeias e teias alimentares', tag: 'BNCC' },
      { label: 'Transformações químicas', tag: 'BNCC' },
      { label: 'Energia: formas e transformações', tag: 'Avaliação' },
    ],
    'História': [
      { label: 'Idade Média: feudalismo', tag: 'BNCC' },
      { label: 'Grandes navegações e colonização', tag: 'BNCC' },
      { label: 'Revolução Industrial', tag: 'Avaliação' },
      { label: 'Brasil Colonial: economia e sociedade', tag: 'Avaliação' },
    ],
    'Geografia': [
      { label: 'Clima e vegetação do Brasil', tag: 'BNCC' },
      { label: 'Urbanização e êxodo rural', tag: 'Avaliação' },
      { label: 'Globalização e comércio internacional', tag: 'BNCC' },
      { label: 'Recursos naturais e sustentabilidade', tag: 'Avaliação' },
    ],
    'Inglês': [
      { label: 'Simple Present and Past', tag: 'BNCC' },
      { label: 'Reading comprehension', tag: 'Avaliação' },
      { label: 'Vocabulary: daily routine', tag: 'BNCC' },
    ],
    'Física': [
      { label: 'Movimento e velocidade', tag: 'BNCC' },
      { label: 'Forças e leis de Newton (introdução)', tag: 'BNCC' },
    ],
    'Química': [
      { label: 'Substâncias e misturas', tag: 'BNCC' },
      { label: 'Tabela periódica: elementos', tag: 'BNCC' },
    ],
    'Biologia': [
      { label: 'Ecossistemas brasileiros', tag: 'BNCC' },
      { label: 'Reprodução e genética básica', tag: 'BNCC' },
    ],
  },
  'medio': {
    'Matemática': [
      { label: 'Função afim e quadrática', tag: 'BNCC' },
      { label: 'Progressões aritmética e geométrica', tag: 'Avaliação' },
      { label: 'Trigonometria no triângulo retângulo', tag: 'BNCC' },
      { label: 'Probabilidade e combinatória', tag: 'Vestibular' },
      { label: 'Logaritmos e exponenciais', tag: 'Vestibular' },
      { label: 'Geometria espacial: prismas e cilindros', tag: 'Avaliação' },
      { label: 'Matrizes e determinantes', tag: 'Vestibular' },
    ],
    'Português': [
      { label: 'Interpretação de textos filosóficos e científicos', tag: 'Avaliação' },
      { label: 'Literatura: escolas literárias', tag: 'BNCC' },
      { label: 'Redação dissertativo-argumentativa', tag: 'Vestibular' },
      { label: 'Figuras de linguagem', tag: 'BNCC' },
      { label: 'Sintaxe: período composto', tag: 'Avaliação' },
      { label: 'Intertextualidade e paráfrase', tag: 'Vestibular' },
    ],
    'Física': [
      { label: 'Cinemática: MRU e MRUV', tag: 'BNCC' },
      { label: 'Dinâmica: leis de Newton', tag: 'Avaliação' },
      { label: 'Termodinâmica e calorimetria', tag: 'Vestibular' },
      { label: 'Óptica geométrica', tag: 'Avaliação' },
      { label: 'Eletricidade: circuitos e resistores', tag: 'Vestibular' },
      { label: 'Ondas e acústica', tag: 'BNCC' },
    ],
    'Química': [
      { label: 'Estequiometria', tag: 'Avaliação' },
      { label: 'Equilíbrio químico', tag: 'Vestibular' },
      { label: 'Funções orgânicas', tag: 'BNCC' },
      { label: 'Eletroquímica: pilhas e eletrólise', tag: 'Vestibular' },
      { label: 'Soluções: concentração e diluição', tag: 'Avaliação' },
    ],
    'Biologia': [
      { label: 'Genética: leis de Mendel', tag: 'BNCC' },
      { label: 'Ecologia: biomas e impactos ambientais', tag: 'Avaliação' },
      { label: 'Evolução: Darwin e seleção natural', tag: 'Vestibular' },
      { label: 'Citologia: divisão celular', tag: 'BNCC' },
      { label: 'Fisiologia humana: sistemas', tag: 'Avaliação' },
    ],
    'História': [
      { label: 'Era Vargas e populismo', tag: 'Avaliação' },
      { label: 'Guerra Fria e mundo bipolar', tag: 'BNCC' },
      { label: 'Ditadura militar no Brasil', tag: 'Vestibular' },
      { label: 'Revolução Francesa', tag: 'BNCC' },
      { label: 'Primeira e Segunda Guerra Mundial', tag: 'Avaliação' },
    ],
    'Geografia': [
      { label: 'Geopolítica contemporânea', tag: 'Vestibular' },
      { label: 'Climatologia e mudanças climáticas', tag: 'BNCC' },
      { label: 'Urbanização brasileira e problemas urbanos', tag: 'Avaliação' },
      { label: 'Agrária: agronegócio e reforma agrária', tag: 'Avaliação' },
    ],
    'Inglês': [
      { label: 'Reading comprehension: academic texts', tag: 'Vestibular' },
      { label: 'Verb tenses: perfect and continuous', tag: 'BNCC' },
      { label: 'Connectors and linking words', tag: 'Avaliação' },
    ],
    'Ciências': [
      { label: 'Física moderna: introdução', tag: 'Vestibular' },
      { label: 'Biotecnologia e ética', tag: 'BNCC' },
    ],
  },
  'eja-tecnico': {
    'Matemática': [
      { label: 'Porcentagem e juros simples', tag: 'BNCC' },
      { label: 'Leitura de gráficos e tabelas', tag: 'Avaliação' },
      { label: 'Regra de três simples e composta', tag: 'BNCC' },
      { label: 'Geometria aplicada ao cotidiano', tag: 'Avaliação' },
    ],
    'Português': [
      { label: 'Interpretação de textos informativos', tag: 'BNCC' },
      { label: 'Gêneros do mundo do trabalho: currículo, e-mail', tag: 'Avaliação' },
      { label: 'Ortografia e pontuação', tag: 'BNCC' },
    ],
    'Ciências': [
      { label: 'Saúde e prevenção de doenças', tag: 'BNCC' },
      { label: 'Meio ambiente e sustentabilidade', tag: 'Avaliação' },
    ],
    'História': [
      { label: 'Direitos humanos e cidadania', tag: 'BNCC' },
      { label: 'Brasil contemporâneo: democracia', tag: 'Avaliação' },
    ],
    'Geografia': [
      { label: 'Mercado de trabalho e globalização', tag: 'BNCC' },
      { label: 'Espaço urbano e mobilidade', tag: 'Avaliação' },
    ],
  },
};

function getTagColor(tag: string) {
  if (tag === 'BNCC') return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30';
  if (tag === 'Avaliação') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
  return 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30';
}

interface GeneratedQuestion {
  content: string;
  options: { letter: string; text: string; isCorrect: boolean }[];
  skillCode?: string;
  descriptor?: string;
  answerLines?: number;
  correctionMirror?: string;
}

interface SerieGroup {
  label: string;
  items: { value: string; label: string; segment: string }[];
}

const SERIES_ESPECIFICAS_GROUPED: SerieGroup[] = [
  {
    label: '🌈 Educação Infantil',
    items: [
      { value: 'bercario', label: 'Berçário (0–1a6m)', segment: 'infantil' },
      { value: 'maternal_1', label: 'Maternal I (1a7m–3a)', segment: 'infantil' },
      { value: 'maternal_2', label: 'Maternal II (4 anos)', segment: 'infantil' },
      { value: 'pre', label: 'Jardim / Pré-Escola (5 anos)', segment: 'infantil' },
    ],
  },
  {
    label: '📗 Anos Iniciais (Fund. I)',
    items: [
      { value: '1ano', label: '1º Ano (Alfabetização)', segment: 'fundamental-i' },
      { value: '2ano', label: '2º Ano (Consolidação da Leitura)', segment: 'fundamental-i' },
      { value: '3ano', label: '3º Ano (Desenvolvimento da Escrita)', segment: 'fundamental-i' },
      { value: '4ano', label: '4º Ano (Autonomia Acadêmica)', segment: 'fundamental-i' },
      { value: '5ano', label: '5º Ano (Transição para Anos Finais)', segment: 'fundamental-i' },
    ],
  },
  {
    label: '📘 Anos Finais (Fund. II)',
    items: [
      { value: '6ano', label: '6º Ano', segment: 'fundamental-ii' },
      { value: '7ano', label: '7º Ano', segment: 'fundamental-ii' },
      { value: '8ano', label: '8º Ano', segment: 'fundamental-ii' },
      { value: '9ano', label: '9º Ano', segment: 'fundamental-ii' },
    ],
  },
  {
    label: '🎓 Ensino Médio & Técnico',
    items: [
      { value: '1serie', label: '1ª Série EM', segment: 'medio' },
      { value: '2serie', label: '2ª Série EM', segment: 'medio' },
      { value: '3serie', label: '3ª Série EM', segment: 'medio' },
    ],
  },
];

const SERIES_ESPECIFICAS = SERIES_ESPECIFICAS_GROUPED.flatMap(g => g.items);

export default function AltaPerformance() {
  const { toast } = useToast();

  // Restore persisted state from sessionStorage
  const stored = useMemo(() => {
    try {
      const raw = localStorage.getItem('alta_perf_state');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [rede, setRede] = useState(stored?.rede || '');
  const [serie, setSerie] = useState(stored?.serie || '');
  const [disciplina, setDisciplina] = useState(stored?.disciplina || '');
  const [topicos, setTopicos] = useState(stored?.topicos || '');
  const [totalQuestoes, setTotalQuestoes] = useState(stored?.totalQuestoes || 10);
  const [niveis, setNiveis] = useState(stored?.niveis || { abaixo: 15, basico: 30, proficiente: 35, avancado: 20 });
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]); // Don't restore full array from localStorage to save space
  const [formato, setFormato] = useState(stored?.formato || 'objetiva');
  const [matrizRef, setMatrizRef] = useState(stored?.matrizRef || 'bncc');
  const previewRef = useRef<HTMLDivElement>(null);
  const [savedBankId, setSavedBankId] = useState<string | null>(stored?.savedBankId || null);
  const [savedAccessCode, setSavedAccessCode] = useState<string | null>(stored?.savedAccessCode || null);
  const [qrOpen, setQrOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [generationStep, setGenerationStep] = useState<0 | 1 | 2 | 3>(0);


  // Restore background generation on mount and fetch saved questions if ID exists
  useEffect(() => {
    // 1. Fetch questions if we have a saved ID but no questions in state
    const fetchSavedQuestions = async (id: string) => {
      try {
        const { data, error } = await supabase
          .from('question_banks')
          .select('questions, question_type')
          .eq('id', id)
          .maybeSingle();
        
        if (error) throw error;
        if (data && data.questions) {
          setQuestions(data.questions as any);
          if (data.question_type) {
            setFormato(data.question_type === 'discursiva' ? 'discursiva' : 'objetiva');
          }
        }
      } catch (err) {
        console.error('Erro ao recuperar questões salvas:', err);
      }
    };

    if (savedBankId && questions.length === 0) {
      fetchSavedQuestions(savedBankId);
    }

    // 2. Background generation check
    const bg = getGeneration('alta_performance');
    let interval: any;

    if (bg.status === 'running') {
      setLoading(true);
      interval = setInterval(() => {
        const c = getGeneration('alta_performance');
        if (c.status === 'done') {
          const parsed = Array.isArray(c.result) ? c.result : c.result?.questions || [];
          setQuestions(parsed); setLoading(false); clearGeneration('alta_performance');
          if (parsed.length === 0) toast({ title: 'Nenhuma questão gerada. Tente novamente.' });
          clearInterval(interval);
        } else if (c.status === 'error') {
          setLoading(false); clearGeneration('alta_performance');
          toast({ title: 'Erro ao gerar simulado', description: c.error || '', variant: 'destructive' }); clearInterval(interval);
        }
      }, 500);
    } else if (bg.status === 'done') {
      const parsed = Array.isArray(bg.result) ? bg.result : bg.result?.questions || [];
      setQuestions(parsed); clearGeneration('alta_performance');
    } else if (bg.status === 'error') {
      toast({ title: 'Erro ao gerar simulado', description: bg.error || '', variant: 'destructive' });
      clearGeneration('alta_performance');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [savedBankId]); // Added savedBankId to deps to trigger fetch on reload/restore

  // Persist state to localStorage on changes (excluding heavy question array)
  useEffect(() => {
    const state = { rede, serie, disciplina, topicos, totalQuestoes, niveis, formato, matrizRef, savedBankId, savedAccessCode };
    localStorage.setItem('alta_perf_state', JSON.stringify(state));
  }, [rede, serie, disciplina, topicos, totalQuestoes, niveis, formato, matrizRef, savedBankId, savedAccessCode]);

  // Map specific series to content suggestion segment
  const serieSegment = SERIES_ESPECIFICAS.find(s => s.value === serie)?.segment || '';

  const suggestions = useMemo(() => {
    if (!serieSegment || !disciplina) return [];
    return CONTENT_SUGGESTIONS[serieSegment]?.[disciplina] || [];
  }, [serieSegment, disciplina]);

  const handleChipClick = (label: string) => {
    setTopicos(prev => {
      if (!prev.trim()) return label;
      if (prev.includes(label)) return prev;
      return `${prev}, ${label}`;
    });
  };
  const isDiscursiva = formato === 'discursiva';

  const updateNivel = (key: keyof typeof niveis, value: number) => {
    const remaining = 100 - value;
    const otherKeys = (Object.keys(niveis) as (keyof typeof niveis)[]).filter(k => k !== key);
    const otherTotal = otherKeys.reduce((s: number, k) => s + niveis[k], 0);
    const newNiveis = { ...niveis, [key]: value };
    otherKeys.forEach(k => {
      newNiveis[k] = otherTotal > 0 ? Math.round((niveis[k] / otherTotal) * remaining) : Math.round(remaining / otherKeys.length);
    });
    const sum = (Object.values(newNiveis) as number[]).reduce((a, b) => a + b, 0);
    if (sum !== 100) newNiveis[otherKeys[otherKeys.length - 1]] += (100 - sum);
    setNiveis(newNiveis);
  };

  const redeInfo = redesEnsino.find(r => r.value === rede);

  const sanitizedQuestions = useMemo(() => {
    return questions.map(q => ({
      ...q,
      content: DOMPurify.sanitize(q.content),
      correctionMirror: q.correctionMirror ? DOMPurify.sanitize(q.correctionMirror) : undefined
    }));
  }, [questions]);

  const generationIntervalRef = useRef<any>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (generationIntervalRef.current) clearInterval(generationIntervalRef.current);
    };
  }, []);

  const handleGenerate = async () => {
    const isMulti = disciplina === 'Todos';
    if (!rede || !serie || !disciplina || (!isMulti && !topicos)) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setQuestions([]);
    setGenerationStep(1);

    const matrizInfo = MATRIZ_OPTIONS.find(m => m.value === matrizRef);

    const currentParams = {
      examType: isMulti ? 'simulado_semanal' : 'alta_performance',
      subjectArea: isMulti ? 'Multidisciplinar' : disciplina,
      grade: serie,
      count: isMulti ? 10 : totalQuestoes,
      specificTopic: isMulti ? (topicos || 'Simulado Semanal Integrado: distribua equilibradamente entre Português (3), Matemática (3), Ciências (2) e Humanas (2), cobrindo temas trabalhados na semana para a série selecionada') : topicos,
      isMultidisciplinar: isMulti,
      activeDna: rede,
      activeSpecialty: `alta_performance_${rede}`,
      isDiscursiva,
      difficulty: `Distribuição: ${niveis.abaixo}% Abaixo do Básico, ${niveis.basico}% Básico, ${niveis.proficiente}% Proficiente, ${niveis.avancado}% Avançado (interdisciplinar, raciocínio lógico profundo, nível acadêmico de excelência)`,
      examModel: redeInfo?.label || rede,
      matrizReferencia: matrizRef,
      matrizLabel: matrizInfo?.label || 'Padrão BNCC',
    };

    startGeneration('alta_performance', async () => {
      const { data, error } = await supabase.functions.invoke('generate-simulator-questions', {
        body: currentParams,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    });

    if (generationIntervalRef.current) clearInterval(generationIntervalRef.current);
    
    generationIntervalRef.current = setInterval(() => {
      const c = getGeneration('alta_performance');
      
      // Update generation step based on elapsed time or status
      setGenerationStep(prev => {
        if (c.status === 'done') return 3;
        if (prev === 1) return 2; // Move to step 2 after starting
        return prev;
      });

      if (c.status === 'done') {
        const parsed = Array.isArray(c.result) ? c.result : c.result?.questions || [];
        setQuestions(parsed); 
        setLoading(false); 
        setGenerationStep(3);
        clearGeneration('alta_performance');
        if (parsed.length === 0) toast({ title: 'Nenhuma questão gerada. Tente novamente.' });
        clearInterval(generationIntervalRef.current);
        generationIntervalRef.current = null;
      } else if (c.status === 'error') {
        setLoading(false);
        setGenerationStep(0);
        clearGeneration('alta_performance');
        const msg = c.error || 'Erro ao gerar simulado';
        const isFriendly = msg.includes('processando') || msg.includes('Tente novamente');
        toast({
          title: isFriendly ? '⏳ Processando...' : 'Erro ao gerar simulado',
          description: isFriendly ? msg : 'Estamos processando sua inteligência pedagógica... isso pode levar um momento.',
          variant: 'destructive',
        });
        clearInterval(generationIntervalRef.current);
        generationIntervalRef.current = null;
      }
    }, 500);
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

  const copyToClipboard = () => {
    const text = questions.map((q, i) => {
      if (isDiscursiva) {
        return `Questão ${i + 1}\n${stripHtml(q.content)}\n\n(Espaço para resposta)`;
      }
      const opts = q.options?.map(o => `${o.letter}) ${o.text}`).join('\n') || '';
      return `Questão ${i + 1}\n${stripHtml(q.content)}\n${opts}`;
    }).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  const handleNewSimulado = useCallback(() => {
    setRede('');
    setSerie('');
    setDisciplina('');
    setTopicos('');
    setTotalQuestoes(10);
    setNiveis({ abaixo: 15, basico: 30, proficiente: 35, avancado: 20 });
    setQuestions([]);
    setFormato('objetiva');
    setMatrizRef('bncc');
    setSavedBankId(null);
    setSavedAccessCode(null);
    localStorage.removeItem('alta_perf_state');
    toast({ title: '🆕 Novo simulado iniciado!', description: 'Todos os campos foram limpos.' });
  }, [toast]);

  const handleSaveQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Faça login para salvar', variant: 'destructive' }); return; }
      const questionsOnly = questions.map(q => ({
        content: q.content,
        options: isDiscursiva ? [] : q.options,
        skillCode: q.skillCode,
        descriptor: q.descriptor,
      }));
      const isMulti = disciplina === 'Todos';
      const { data: inserted, error: insertErr } = await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: isMulti ? 'Multidisciplinar' : disciplina,
        topic: topicos || 'Simulado Semanal Integrado',
        grade: serie,
        purpose: isMulti ? 'simulado_semanal' : `alta_performance_${rede}`,
        question_type: isDiscursiva ? 'discursiva' : 'objetiva',
        questions: questionsOnly as any,
        institution_name: redeInfo?.label || rede,
      }).select('id, access_code').single();
      if (insertErr) throw insertErr;
      if (inserted?.id) {
        setSavedBankId(inserted.id);
        setSavedAccessCode((inserted as any).access_code || null);
      }
      toast({ title: 'Questões salvas com sucesso!', description: (inserted as any).access_code ? `Código de acesso: ${(inserted as any).access_code}` : undefined });

      // Ask if user wants to start a new activity
      setTimeout(() => {
        if (window.confirm('✅ Atividade salva na Biblioteca!\n\nDeseja iniciar uma NOVA atividade?')) {
          handleNewSimulado();
        }
      }, 500);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  const handleSaveGabarito = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: 'Faça login para salvar', variant: 'destructive' }); return; }
      const gabaritoData = questions.map((q, i) => ({
        questionNumber: i + 1,
        correctionMirror: q.correctionMirror || '',
        correctOption: isDiscursiva ? null : q.options?.find(o => o.isCorrect)?.letter || '',
        skillCode: q.skillCode,
      }));
      await supabase.from('question_banks').insert({
        user_id: user.id,
        subject: disciplina,
        topic: `[GABARITO] ${topicos}`,
        grade: serie,
        purpose: `gabarito_${rede}`,
        question_type: isDiscursiva ? 'gabarito_discursivo' : 'gabarito_objetiva',
        questions: gabaritoData as any,
        institution_name: redeInfo?.label || rede,
      });
      toast({ title: 'Gabarito salvo com sucesso!' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar gabarito', description: e.message, variant: 'destructive' });
    }
  };

  const exportPDF = async () => {
    const html2pdf = (await import('html2pdf.js')).default;
    const container = document.createElement('div');
    container.style.cssText = 'font-family:Inter,Arial,sans-serif;padding:0;max-width:800px;margin:auto;word-wrap:break-word;overflow-wrap:break-word;';

    // Header
    container.innerHTML = `
      <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #1e3a5f;padding-bottom:16px;">
        <p style="font-size:10px;color:#666;margin:0;">EduCreator Pro | Por Matheus Lima Piffer</p>
        <h1 style="color:#1e3a5f;margin:8px 0 4px;">Simulado Alta Performance — ${redeInfo?.label || rede}</h1>
        <p style="margin:4px 0;font-size:13px;">${disciplina} • ${serie} • ${totalQuestoes} questões${isDiscursiva ? ' • Formato Discursivo' : ''}</p>
      </div>
    `;

    // Questions
    sanitizedQuestions.forEach((q, i) => {
      let qHtml = `<div style="margin-bottom:20px;page-break-inside:avoid;">
        <h3 style="margin:0 0 8px;color:#1e3a5f;">Questão ${i + 1}</h3>
        <div style="word-wrap:break-word;overflow-wrap:break-word;">${q.content}</div>`;

      if (isDiscursiva) {
        const lines = q.answerLines || 10;
        for (let j = 0; j < lines; j++) {
          qHtml += `<div style="border-bottom:1px solid #ccc;height:28px;margin:0 0 2px;"></div>`;
        }
      } else if (q.options?.length) {
        q.options.forEach(o => {
          qHtml += `<p style="margin:4px 0 4px 16px;"><strong>${o.letter})</strong> ${o.text}</p>`;
        });
      }
      qHtml += '</div><hr style="border:none;border-top:1px solid #eee;margin:12px 0;"/>';
      container.innerHTML += qHtml;
    });

    // Gabarito on new page
    container.innerHTML += `<div style="page-break-before:always;"></div>`;
    container.innerHTML += `<h2 style="text-align:center;color:#1e3a5f;margin-bottom:16px;">Gabarito e Critérios de Avaliação</h2>`;

    sanitizedQuestions.forEach((q, i) => {
      if (isDiscursiva) {
        container.innerHTML += `<div style="margin-bottom:16px;page-break-inside:avoid;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
          <p style="font-weight:bold;margin:0 0 4px;">Questão ${i + 1}</p>
          <div style="word-wrap:break-word;overflow-wrap:break-word;font-size:13px;color:#374151;">${q.correctionMirror || 'Critérios de correção não disponíveis.'}</div>
        </div>`;
      } else {
        const correct = q.options?.find(o => o.isCorrect);
        container.innerHTML += `<p style="margin:4px 0;"><strong>${i + 1}.</strong> ${correct?.letter || '—'}</p>`;
      }
    });

    container.innerHTML += `<p style="text-align:center;font-size:10px;color:#999;margin-top:32px;">EduCreator Pro — Por Matheus Lima Piffer</p>`;

    document.body.appendChild(container);
    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `simulado-alta-performance-${rede}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      pagebreak: { mode: ['avoid-all', 'css'] },
    };
    await html2pdf().set(opt).from(container).save();
    document.body.removeChild(container);
  };

  const handleWhatsApp = () => {
    const text = questions.map((q, i) => {
      if (isDiscursiva) {
        return `*Questão ${i + 1}*\n${stripHtml(q.content)}\n_(Espaço para resposta)_`;
      }
      const opts = q.options?.map(o => `${o.letter}) ${o.text}`).join('\n') || '';
      return `*Questão ${i + 1}*\n${stripHtml(q.content)}\n${opts}`;
    }).join('\n\n---\n\n');

    const cacheBuster = `?v=${Date.now()}`;
    const studentLink = savedBankId
      ? `\n\n🔗 Link do Aluno: ${buildPublicAppUrl(`/atividade/${savedBankId}`)}${cacheBuster}`
      : '';

    const msg = `🏫 *EduCreator Pro — Simulado Alta Performance*\n\n👤 Professor: Matheus Lima Piffer\n📚 Disciplina: ${disciplina}\n🎯 Rede: ${redeInfo?.label || rede}\n📝 Formato: ${isDiscursiva ? 'Discursivo' : 'Objetiva'}${studentLink}\n\n${text}\n\n✅ Gerado via EduCreator Pro 📖✒️`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopyStudentLink = () => {
    if (!savedBankId) {
      toast({ title: 'Salve as questões primeiro para gerar o link do aluno.', variant: 'destructive' });
      return;
    }
    const cacheBuster = `?v=${Date.now()}`;
    const url = buildPublicAppUrl(`/atividade/${savedBankId}`) + cacheBuster;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link do Aluno copiado!', description: url });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(220,60%,15%)] to-[hsl(220,50%,25%)] p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(45,90%,60%,0.15),transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Trophy size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">Simulados que impressionam</h1>
            <p className="text-sm text-slate-300 mt-1">Em 2 minutos, crie avaliações no nível das melhores redes de ensino do Brasil</p>
          </div>
          <Button
            onClick={handleNewSimulado}
            size="lg"
            className="gap-2 font-bold text-sm uppercase bg-orange-200 hover:bg-orange-300 text-orange-900 border-0 shadow-lg"
          >
            <PlusCircle size={18} /> Criar Novo Simulado
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 space-y-5 shadow-sm">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Selecione a Rede de Ensino</Label>
              <Select value={rede} onValueChange={setRede}>
                <SelectTrigger><SelectValue placeholder="Escolha a rede..." /></SelectTrigger>
                <SelectContent>
                  {redesEnsino.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{r.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Formato da Questão</Label>
              <ToggleGroup type="single" value={formato} onValueChange={v => { if (v) setFormato(v); }} className="w-full border border-border/50 rounded-lg p-1 bg-muted/30">
                <ToggleGroupItem value="objetiva" className="flex-1 rounded-md text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Objetiva (Múltipla Escolha)
                </ToggleGroupItem>
                <ToggleGroupItem value="discursiva" className="flex-1 rounded-md text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Discursiva (Aberta)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Ano/Série</Label>
                <Select value={serie} onValueChange={setSerie}>
                  <SelectTrigger><SelectValue placeholder="Selecione a série..." /></SelectTrigger>
                  <SelectContent>
                    {SERIES_ESPECIFICAS_GROUPED.map(group => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-xs font-bold text-muted-foreground">{group.label}</SelectLabel>
                        {group.items.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Disciplina</Label>
                <Select value={disciplina} onValueChange={setDisciplina}>
                  <SelectTrigger><SelectValue placeholder="Selecione a disciplina..." /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todos">🌐 Todos (Multidisciplinar)</SelectItem>
                    <SelectItem value="Matemática">📐 Matemática</SelectItem>
                    <SelectItem value="Português">📝 Português</SelectItem>
                    <SelectItem value="Ciências">🧪 Ciências</SelectItem>
                    <SelectItem value="História">📜 História</SelectItem>
                    <SelectItem value="Geografia">🗺️ Geografia</SelectItem>
                    <SelectItem value="Inglês">🌍 Inglês</SelectItem>
                    <SelectItem value="Física">⚛️ Física</SelectItem>
                    <SelectItem value="Química">🧪 Química</SelectItem>
                    <SelectItem value="Biologia">🧬 Biologia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assessment Matrix Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Matriz de Referência</Label>
              <div className="grid grid-cols-3 gap-2">
                {MATRIZ_OPTIONS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMatrizRef(m.value)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all duration-200 ${
                      matrizRef === m.value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                        : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-lg">{m.icon}</span>
                    <span className="text-[10px] font-bold leading-tight">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary" />
                  Sugestões de Conteúdo
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, i) => {
                    const isSelected = topicos.includes(s.label);
                    return (
                      <button
                        key={i}
                        onClick={() => handleChipClick(s.label)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 ring-1 ring-emerald-500/30'
                            : getTagColor(s.tag) + ' hover:scale-105 hover:shadow-sm'
                        }`}
                      >
                        {s.label}
                        <span className={`text-[9px] px-1 py-0.5 rounded ${isSelected ? 'bg-emerald-500/20' : 'bg-background/50'}`}>{s.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">📝 {disciplina === 'Todos' ? 'Tema Transversal (Opcional)' : 'Misturar ou Digitar Tema Próprio'}</Label>
              <Textarea placeholder={disciplina === 'Todos' ? 'Opcional: digite um tema transversal (ex: Meio Ambiente e Frações) ou deixe em branco para um mix geral...' : 'Combine sugestões acima com temas próprios: ex. Frações [BNCC] + Problemas com dinheiro [Realidade Local]...'} value={topicos} onChange={e => setTopicos(e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Quantidade de questões: {totalQuestoes}</Label>
              <Slider min={5} max={30} step={1} value={[totalQuestoes]} onValueChange={v => setTotalQuestoes(v[0])} />
            </div>

            <div className="space-y-3 rounded-xl border border-border/50 bg-muted/30 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Distribuição de Níveis</p>
              {([
                { key: 'abaixo' as const, label: 'Abaixo do Básico', color: 'bg-red-500' },
                { key: 'basico' as const, label: 'Básico', color: 'bg-amber-500' },
                { key: 'proficiente' as const, label: 'Proficiente', color: 'bg-emerald-500' },
                { key: 'avancado' as const, label: 'Avançado (Elite)', color: 'bg-purple-500' },
              ]).map(n => (
                <div key={n.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${n.color}`} />
                      {n.label}
                    </span>
                    <span className="font-bold">{niveis[n.key]}%</span>
                  </div>
                  <Slider min={0} max={100} step={5} value={[niveis[n.key]]} onValueChange={v => updateNivel(n.key, v[0])} />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground italic mt-1">
                🎯 Avançado (Elite): questões interdisciplinares com raciocínio profundo — nível acadêmico de excelência.
              </p>
            </div>

            {disciplina === 'Todos' && (
              <Button onClick={handleGenerate} disabled={loading} size="lg" className="w-full text-base font-bold gap-2 h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20">
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CalendarDays size={20} />}
                {loading ? 'Gerando Simulado Semanal...' : '📅 Gerar Simulado Semanal Integrado'}
              </Button>
            )}
            <Button 
              onClick={handleGenerate} 
              disabled={loading} 
              size="lg" 
              className={`w-full text-base font-bold gap-2 h-14 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 ${disciplina === 'Todos' ? 'hidden' : ''}`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
              {loading ? 'Gerando Simulado...' : '✨ Gerar meu simulado agora'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 min-h-[400px]">
            {!loading && questions.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                  <Trophy size={32} className="text-muted-foreground/40" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-foreground/80">Para começar:</h3>
                  <div className="flex flex-col gap-3 max-w-xs mx-auto text-left">
                    <div className="flex items-center gap-3 bg-card border border-border/40 p-3 rounded-xl shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                      <p className="text-sm font-medium text-muted-foreground">Escolha a rede de ensino</p>
                    </div>
                    <div className="flex items-center gap-3 bg-card border border-border/40 p-3 rounded-xl shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                      <p className="text-sm font-medium text-muted-foreground">Selecione a série e disciplina</p>
                    </div>
                    <div className="flex items-center gap-3 bg-card border border-border/40 p-3 rounded-xl shadow-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
                      <p className="text-sm font-medium text-muted-foreground">Clique em Gerar — pronto!</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="space-y-8 py-4">
                {/* Generation Steps UI */}
                <div className="max-w-md mx-auto space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                    <div className="flex items-center gap-3">
                      {generationStep > 1 ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : generationStep === 1 ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Circle className="text-muted-foreground/30" size={20} />
                      )}
                      <span className={`text-sm font-medium ${generationStep === 1 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        1️⃣ Analisando parâmetros pedagógicos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                    <div className="flex items-center gap-3">
                      {generationStep > 2 ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : generationStep === 2 ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Circle className="text-muted-foreground/30" size={20} />
                      )}
                      <span className={`text-sm font-medium ${generationStep === 2 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        2️⃣ Gerando questões personalizadas
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card shadow-sm">
                    <div className="flex items-center gap-3">
                      {generationStep > 3 ? (
                        <CheckCircle2 className="text-emerald-500" size={20} />
                      ) : generationStep === 3 ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <Circle className="text-muted-foreground/30" size={20} />
                      )}
                      <span className={`text-sm font-medium ${generationStep === 3 ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                        3️⃣ Validando gabarito e critérios de qualidade
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-16 w-full" />
                      {!isDiscursiva && (
                        <div className="grid grid-cols-2 gap-2">
                          <Skeleton className="h-8" /><Skeleton className="h-8" />
                          <Skeleton className="h-8" /><Skeleton className="h-8" />
                        </div>
                      )}
                      {isDiscursiva && <Skeleton className="h-32 w-full" />}
                    </div>
                  ))}
              </div>
            )}

            {!loading && questions.length > 0 && (
              <div className="space-y-4" ref={previewRef}>
                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2 sticky top-0 bg-card/90 backdrop-blur-sm py-2 z-10">
                  <h2 className="text-lg font-bold flex-1">
                    {disciplina === 'Todos' ? '📅 SIMULADO SEMANAL INTEGRADO' : `${questions.length} Questões ${isDiscursiva ? 'Discursivas' : ''} Geradas`}
                  </h2>
                  {disciplina === 'Todos' && (
                    <p className="w-full text-xs text-muted-foreground -mt-1 mb-2">
                      Áreas do Conhecimento: Linguagens, Matemática, Ciências da Natureza e Humanas
                    </p>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSaveQuestions} className="gap-1.5">
                    <Save size={14} /> 💾 Salvar na minha biblioteca
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleSaveGabarito} className="gap-1.5">
                    <Save size={14} /> Salvar Gabarito
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5">
                    <FileDown size={14} /> Exportar PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleWhatsApp} className="gap-1.5">
                    <MessageCircle size={14} /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-1.5">
                    <Copy size={14} /> Copiar
                  </Button>
                   <Button variant="outline" size="sm" onClick={handleCopyStudentLink} className="gap-1.5">
                     <Link2 size={14} /> Link do Aluno
                   </Button>
                   <Button variant="outline" size="sm" onClick={() => {
                     if (!savedBankId) {
                       toast({ title: 'Salve as questões primeiro para gerar o QR Code.', variant: 'destructive' });
                       return;
                     }
                     setQrOpen(true);
                   }} className="gap-1.5">
                     <QrCode size={14} /> QR Code
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!savedBankId || !savedAccessCode) {
                          toast({ title: 'Salve as questões primeiro para lançar o simulado.', variant: 'destructive' });
                          return;
                        }
                        setLaunchOpen(true);
                      }}
                      className="gap-1.5 text-gray-900 font-bold border-0"
                      style={{ background: 'linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7)' }}
                    >
                      <Rocket size={14} /> Lançar Simulado
                    </Button>
                  </div>

                {/* Access Code Display */}
                {savedAccessCode && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
                    <span className="text-sm font-semibold text-foreground">Código de Acesso:</span>
                    <span className="font-mono text-xl font-extrabold tracking-widest text-primary">{savedAccessCode}</span>
                    <Button variant="outline" size="sm" className="gap-1.5 ml-auto" onClick={() => {
                      navigator.clipboard.writeText(savedAccessCode);
                      toast({ title: 'Código copiado!' });
                    }}>
                      <Copy size={14} /> Copiar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                      const shortUrl = buildPublicAppUrl(`/s/${savedAccessCode}`);
                      navigator.clipboard.writeText(shortUrl);
                      toast({ title: 'Link curto copiado!', description: shortUrl });
                    }}>
                      <Link2 size={14} /> Link Curto
                    </Button>
                  </div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-2" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Q{i + 1}</span>
                        {q.skillCode && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{q.skillCode}</span>}
                        {isDiscursiva && <span className="text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">Discursiva</span>}
                      </div>
                      <div className="text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: sanitizedQuestions[i].content }} />
                      {!isDiscursiva && q.options && q.options.length > 0 && (
                        <div className="space-y-1 pl-2">
                          {q.options.map((o, j) => (
                            <div key={j} className={`text-sm py-1.5 px-3 rounded-lg ${o.isCorrect ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium border border-emerald-500/20' : 'text-foreground'}`}>
                              <strong>{o.letter})</strong> {o.text}
                            </div>
                          ))}
                        </div>
                      )}
                      {isDiscursiva && (
                        <div className="mt-2 space-y-1">
                          {Array.from({ length: q.answerLines || 8 }).map((_, j) => (
                            <div key={j} className="border-b border-border/40 h-6" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Gabarito Section */}
                <div className="mt-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-5 space-y-4">
                  <h3 className="text-lg font-bold text-primary text-center">Gabarito e Critérios de Avaliação</h3>
                  {questions.map((q, i) => (
                    <div key={i} className="rounded-lg border border-border/40 bg-card p-3 space-y-1" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                      <p className="text-sm font-bold text-foreground">Questão {i + 1}</p>
                      {isDiscursiva ? (
                        <p className="text-sm text-muted-foreground break-words">{sanitizedQuestions[i].correctionMirror || 'Critérios de correção não disponíveis.'}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Resposta: <strong className="text-emerald-600 dark:text-emerald-400">{q.options?.find(o => o.isCorrect)?.letter || '—'}</strong>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mat Assistant */}
            <div className="mt-6 flex items-start gap-4 rounded-2xl border border-border/50 bg-muted/30 p-4">
              <img src={matAvatar} alt="Mat - Assistente EduCreator" className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/30 shadow-md flex-shrink-0" />
              <div className="relative bg-card rounded-xl p-3 shadow-sm border border-border/40">
                <div className="absolute -left-2 top-4 w-3 h-3 bg-card border-l border-b border-border/40 rotate-45" />
                <p className="text-sm font-bold text-foreground">Mat — Seu Assistente EduCreator</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {disciplina === 'Todos'
                    ? `Para este Simulado Semanal das turmas de ${serie || 'sua série'}, você prefere focar nas competências socioemocionais da BNCC ou quer um reforço nos conteúdos básicos de Português e Matemática? 📅`
                    : 'Oi! Vi que você está preparando uma avaliação. Quer que eu sugira os temas mais cobrados nesta série?'}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-2 italic">EduCreator Pro | Tecnologia de Elite por Matheus Lima Piffer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {savedBankId && (
        <QRCodeModal
          open={qrOpen}
          onOpenChange={setQrOpen}
          url={`/atividade/${savedBankId}`}
          title={disciplina === 'Todos' ? 'Simulado Semanal Integrado' : `${disciplina} — Alta Performance`}
        />
      )}

      {savedBankId && savedAccessCode && (
        <SimuladoLaunchScreen
          open={launchOpen}
          onOpenChange={setLaunchOpen}
          accessCode={savedAccessCode}
          title={disciplina === 'Todos' ? 'Simulado Semanal Integrado' : `${disciplina} — Alta Performance (${SERIES_ESPECIFICAS.find(s => s.value === serie)?.label || serie})`}
          bankId={savedBankId}
        />
      )}
    </div>
  );
}
