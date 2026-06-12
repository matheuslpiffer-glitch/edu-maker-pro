import { useEffect, useState, useRef } from 'react';
import { showAiErrorToast } from '@/lib/ai-utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Save, Printer, Eye, Trash2, BookOpen, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ExportLoadingOverlay } from '@/components/ExportLoadingOverlay';

interface QBQuestion {
  content: string;
  options?: { letter: string; text: string; isCorrect: boolean }[];
  answer?: string;
  justification?: string;
}

interface SavedBank {
  id: string;
  subject: string;
  topic: string;
  grade: string;
  purpose: string;
  question_type: string;
  questions: QBQuestion[];
  institution_name: string;
  created_at: string;
}

const SUBJECTS = [
  'Língua Portuguesa', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas',
  'Geografia', 'História', 'Arte', 'Educação Física', 'Inglês',
  'Projeto de Vida', 'Tecnologia e Inovação', 'Eletiva',
];

const GRADES = [
  '6º Ano EF', '7º Ano EF', '8º Ano EF', '9º Ano EF',
  '1ª Série EM', '2ª Série EM', '3ª Série EM',
];

const PURPOSES = [
  { value: 'regular', label: 'Aula Regular' },
  { value: 'absence', label: 'Plano de Ausência' },
  { value: 'reinforcement', label: 'Reforço Escolar' },
];

const PURPOSE_LABELS: Record<string, string> = {
  regular: 'Aula Regular', absence: 'Plano de Ausência', reinforcement: 'Reforço Escolar',
};

export default function QuestionBankAI() {
  const { user } = useAuth();
  const { toast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('');
  const [purpose, setPurpose] = useState('regular');
  const [questionType, setQuestionType] = useState('multiple-choice');
  const [institutionName, setInstitutionName] = useState('');

  const [easyCount, setEasyCount] = useState(2);
  const [mediumCount, setMediumCount] = useState(3);
  const [hardCount, setHardCount] = useState(1);

  const [questions, setQuestions] = useState<QBQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // History
  const [history, setHistory] = useState<SavedBank[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await supabase.from('question_banks').select('*').order('created_at', { ascending: false });
    setHistory((data as unknown as SavedBank[]) || []);
    setLoadingHistory(false);
  };

  const filteredHistory = history.filter(bank => {
    const matchesSearch = !searchTerm || 
      bank.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bank.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !filterDate || bank.created_at.startsWith(filterDate);
    return matchesSearch && matchesDate;
  });

  const generateQuestions = async () => {
    if (!subject || !topic || !grade) {
      toast({ title: 'Preencha disciplina, tema e série.', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    setQuestions([]);
    const allQuestions: QBQuestion[] = [];

    const batches = [
      { difficulty: 'easy', count: easyCount },
      { difficulty: 'medium', count: mediumCount },
      { difficulty: 'hard', count: hardCount },
    ].filter(b => b.count > 0);

    try {
      for (const batch of batches) {
        const { data, error } = await supabase.functions.invoke('generate-exercise-list', {
          body: { subject, topic, grade, purpose, questionType, difficulty: batch.difficulty, count: batch.count },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.questions) allQuestions.push(...data.questions);
      }
      setQuestions(allQuestions);
      toast({ title: `${allQuestions.length} questões geradas com gabarito comentado!` });
    } catch (e: any) {
      showAiErrorToast(e, toast, 'Erro ao gerar')
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!user || questions.length === 0) return;
    setSaving(true);
    const { error } = await supabase.from('question_banks').insert({
      user_id: user.id,
      subject,
      topic,
      grade,
      purpose,
      question_type: questionType,
      questions: questions as any,
      institution_name: institutionName,
    });
    if (error) {
      showAiErrorToast(error, toast, 'Erro ao salvar')
    } else {
      toast({ title: 'Lista salva com sucesso!' });
      loadHistory();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('question_banks').delete().eq('id', id);
    toast({ title: 'Lista removida.' });
    loadHistory();
  };

  const handleLoadBank = (bank: SavedBank) => {
    setSubject(bank.subject);
    setTopic(bank.topic);
    setGrade(bank.grade);
    setPurpose(bank.purpose);
    setQuestionType(bank.question_type);
    setInstitutionName(bank.institution_name);
    setQuestions(bank.questions);
    setTitle(`${bank.subject} — ${bank.topic}`);
    toast({ title: 'Lista carregada.' });
  };

  const handlePDF = async () => {
    const container = printContainerRef.current;
    if (!container) return;
    setIsExporting(true);
    toast({ title: 'Gerando PDF...' });

    try {
      const sections = container.querySelectorAll<HTMLElement>('[data-pdf-section]');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const MARGIN_H = 20;
      const MARGIN_W = 15;
      const CONTENT_W = 210 - MARGIN_W * 2;
      let firstPage = true;

      for (const section of Array.from(sections)) {
        const canvas = await html2canvas(section, {
          scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 794,
        });
        const imgW = CONTENT_W;
        const imgH = (canvas.height * imgW) / canvas.width;
        const imgData = canvas.toDataURL('image/png');

        if (!firstPage) pdf.addPage();
        firstPage = false;

        const pageH = 297 - MARGIN_H * 2;
        if (imgH <= pageH) {
          pdf.addImage(imgData, 'PNG', MARGIN_W, MARGIN_H, imgW, imgH);
        } else {
          let y = 0;
          let isFirst = true;
          while (y < imgH) {
            if (!isFirst) pdf.addPage();
            isFirst = false;
            pdf.addImage(imgData, 'PNG', MARGIN_W, MARGIN_H - y, imgW, imgH);
            y += pageH;
          }
        }
      }
      pdf.save(`atividade-${topic || 'lista'}.pdf`);
      toast({ title: 'PDF gerado!' });
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const totalQuestions = easyCount + mediumCount + hardCount;
  const displayTitle = title || `${subject} — ${topic}`;
  const hasMC = questions.some(q => q.options);

  return (
    <div className="max-w-5xl mx-auto">
      <ExportLoadingOverlay 
        isOpen={isExporting} 
        message="Processando dados pedagógicos... Por favor, aguarde." 
      />
      <div className="flex items-center gap-3 mb-6 no-print">
        <BookOpen className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">EduBank — Banco de Itens Inteligente</h1>
          <p className="text-sm text-muted-foreground">Gere listas de exercícios alinhadas ao Currículo Paulista com gabarito comentado</p>
        </div>
      </div>

      <Tabs defaultValue="create" className="no-print">
        <TabsList className="mb-4">
          <TabsTrigger value="create">Nova Lista</TabsTrigger>
          <TabsTrigger value="preview" disabled={questions.length === 0}>Visualizar / Imprimir</TabsTrigger>
          <TabsTrigger value="history">Histórico ({history.length})</TabsTrigger>
        </TabsList>

        {/* ─── CREATE TAB ─── */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Configuração da Lista de Exercícios</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título da Atividade</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Atividade de Reforço — Geometria" />
                </div>
                <div className="space-y-2">
                  <Label>Nome da Instituição</Label>
                  <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Polo Educacional..." />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Disciplina *</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Série *</Label>
                  <Select value={grade} onValueChange={setGrade}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-1">
                  <Label>Tema da Aula *</Label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ex: Protagonismo Juvenil: Autocuidado" />
                </div>
                <div className="space-y-2">
                  <Label>Finalidade</Label>
                  <Select value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PURPOSES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Questão</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Múltipla Escolha (A-D)</SelectItem>
                      <SelectItem value="essay">Dissertativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Controle de Proficiência</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 text-center p-3 rounded-lg border border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
                  <Label className="text-cyan-700 dark:text-cyan-400 font-semibold text-xs uppercase">🟢 Fácil (Básico)</Label>
                  <Input type="number" min={0} max={10} value={easyCount} onChange={e => setEasyCount(+e.target.value)} className="text-center text-lg font-bold" />
                </div>
                <div className="space-y-2 text-center p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <Label className="text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase">🟡 Médio (Intermediário)</Label>
                  <Input type="number" min={0} max={10} value={mediumCount} onChange={e => setMediumCount(+e.target.value)} className="text-center text-lg font-bold" />
                </div>
                <div className="space-y-2 text-center p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                  <Label className="text-red-700 dark:text-red-400 font-semibold text-xs uppercase">🔴 Difícil (Avançado)</Label>
                  <Input type="number" min={0} max={10} value={hardCount} onChange={e => setHardCount(+e.target.value)} className="text-center text-lg font-bold" />
                </div>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-3 font-medium">Total: {totalQuestions} questões</p>
              <div className="flex justify-center mt-4">
                <Button onClick={generateQuestions} disabled={generating || totalQuestions === 0} size="lg">
                  {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {generating ? 'Gerando com IA...' : `Gerar ${totalQuestions} Questões`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick preview of generated questions */}
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">Questões Geradas ({questions.length})</CardTitle>
                  <Button variant="outline" size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar Lista
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
                {questions.map((q, i) => (
                  <div key={i} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0">{i + 1}</Badge>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm" dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
                        {q.options && (
                          <div className="mt-2 space-y-0.5">
                            {q.options.map(opt => (
                              <div key={opt.letter} className={`text-xs flex gap-1 ${opt.isCorrect ? 'text-indigo-600 font-semibold' : ''}`}>
                                <span>({opt.letter})</span><span>{opt.text}</span>{opt.isCorrect && <span>✓</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.answer && <p className="text-xs text-muted-foreground mt-1 italic">R: {q.answer}</p>}
                        {q.justification && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                            <strong>💡 Justificativa:</strong> {q.justification}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── PREVIEW / PRINT TAB ─── */}
        <TabsContent value="preview">
          <div className="space-y-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4 flex-wrap">
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2" />Imprimir</Button>
                <Button variant="outline" size="sm" onClick={handlePDF}><Download size={16} className="mr-2" />PDF</Button>
              </CardContent>
            </Card>

            {questions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Gere questões para visualizar.</p>
              </div>
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="p-0" ref={printContainerRef}>
                  {/* ─── SECTION 1: Questions ─── */}
                  <div
                    data-pdf-section="questions"
                    className="bg-white text-black p-8 max-w-[210mm] mx-auto"
                    style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.6, wordBreak: 'break-word' }}
                  >
                    {/* School header */}
                    <div className="text-center mb-4 border-b-2 border-black pb-3">
                      <h1 className="text-base font-bold uppercase">{institutionName || 'Instituição de Ensino'}</h1>
                      <h2 className="text-sm font-semibold mt-1">{displayTitle || 'Lista de Exercícios'}</h2>
                      <p className="text-xs mt-0.5 italic">{PURPOSE_LABELS[purpose] || purpose}</p>
                    </div>

                    {/* Student fields */}
                    <div className="mb-3 space-y-1" style={{ fontSize: '10pt' }}>
                      <p>Estudante: _____________________________________________________ Nº: ______</p>
                      <p>Turma: _________________ Data: ____/____/________</p>
                    </div>

                    {/* Activity metadata */}
                    <div className="mb-5 p-2 border border-black bg-gray-50">
                      <p className="text-xs"><strong>Disciplina:</strong> {subject} &nbsp;|&nbsp; <strong>Série:</strong> {grade}</p>
                      <p className="text-xs"><strong>Tema:</strong> {topic}</p>
                    </div>

                    {/* Questions */}
                    {questions.map((q, i) => (
                      <div key={i} className="mb-5" style={{ pageBreakInside: 'avoid' }}>
                        <div className="flex gap-2">
                          <span className="font-bold whitespace-nowrap">{i + 1})</span>
                          <div className="flex-1" dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
                        </div>
                        {q.options && (
                          <div className="ml-5 mt-2 space-y-1">
                            {q.options.map(opt => (
                              <div key={opt.letter} className="flex gap-2" style={{ fontSize: '11pt' }}>
                                <span className="font-medium">({opt.letter})</span><span>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {questionType === 'essay' && (
                          <div className="ml-5 mt-3 space-y-3">
                            {[...Array(6)].map((_, j) => (
                              <div key={j} className="border-b border-gray-400" style={{ height: '1.5em' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Answer sheet grid for MC */}
                    {hasMC && (
                      <div className="mt-8 border-t-2 border-black pt-4">
                        <h3 className="text-sm font-bold uppercase text-center mb-3">Folha de Respostas</h3>
                        <table className="mx-auto border-collapse" style={{ fontSize: '10pt' }}>
                          <thead>
                            <tr>
                              <th className="border border-black px-3 py-1 text-xs">Questão</th>
                              <th className="border border-black px-4 py-1 text-xs">A</th>
                              <th className="border border-black px-4 py-1 text-xs">B</th>
                              <th className="border border-black px-4 py-1 text-xs">C</th>
                              <th className="border border-black px-4 py-1 text-xs">D</th>
                            </tr>
                          </thead>
                          <tbody>
                            {questions.map((q, i) => {
                              if (!q.options) return null;
                              return (
                                <tr key={i}>
                                  <td className="border border-black px-3 py-1 text-center font-bold text-xs">{String(i + 1).padStart(2, '0')}</td>
                                  {['A', 'B', 'C', 'D'].map(letter => (
                                    <td key={letter} className="border border-black px-4 py-1 text-center">
                                      <div className="w-4 h-4 rounded-full border border-black mx-auto" />
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="mt-6 text-center text-[8pt] text-gray-400 border-t pt-2">
                      <p>Gerado por EduCreator — {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* ─── SECTION 2: Gabarito Comentado do Professor ─── */}
                  <div
                    data-pdf-section="answer-key"
                    className="bg-white text-black p-8 max-w-[210mm] mx-auto"
                    style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: 1.5, pageBreakBefore: 'always' }}
                  >
                    <div className="text-center mb-4 border-b-2 border-black pb-3">
                      <h2 className="text-base font-bold uppercase">📋 Gabarito Comentado — Exclusivo do Professor</h2>
                      <p className="text-xs mt-1">{subject} — {topic} — {grade}</p>
                      <p className="text-[8pt] mt-0.5 italic text-gray-500">Documento destinado exclusivamente ao professor titular ou substituto</p>
                    </div>

                    {/* Quick grid for MC */}
                    {hasMC && (
                      <div className="mb-6">
                        <h3 className="font-bold text-sm mb-2 uppercase">Gabarito Rápido</h3>
                        <div className="grid grid-cols-6 gap-2 border border-black p-3">
                          {questions.map((q, i) => {
                            if (!q.options) return null;
                            const correct = q.options.find(o => o.isCorrect);
                            return (
                              <div key={i} className="text-sm">
                                <span className="font-bold">{String(i + 1).padStart(2, '0')}.</span>{' '}
                                <span className="font-semibold text-indigo-700">({correct?.letter || '—'})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed commented answers */}
                    <h3 className="font-bold text-sm mb-3 uppercase border-b border-black pb-1">Respostas Comentadas</h3>
                    <div className="space-y-4">
                      {questions.map((q, i) => (
                        <div key={i} className="border-b border-gray-300 pb-3" style={{ pageBreakInside: 'avoid' }}>
                          <p className="font-bold text-sm mb-1">Questão {i + 1}</p>
                          {q.options ? (
                            <p className="text-sm ml-3">
                              <strong>Resposta correta:</strong> ({q.options.find(o => o.isCorrect)?.letter}) {q.options.find(o => o.isCorrect)?.text}
                            </p>
                          ) : (
                            <div className="text-sm ml-3">
                              <strong>Resposta esperada:</strong>
                              <p className="italic mt-0.5">{q.answer || 'Resposta aberta — avaliar critérios estabelecidos.'}</p>
                            </div>
                          )}
                          {q.justification && (
                            <div className="ml-3 mt-2 p-2 bg-gray-50 border-l-4 border-black text-xs">
                              <strong>💡 Justificativa Pedagógica:</strong>
                              <p className="mt-1">{q.justification}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 text-center text-[8pt] text-gray-400 border-t pt-2">
                      <p>DOCUMENTO EXCLUSIVO DO PROFESSOR — Gerado por EduCreator — {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ─── HISTORY TAB ─── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listas Salvas</CardTitle>
              <div className="flex gap-3 mt-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por tema ou disciplina..."
                    className="pl-9"
                  />
                </div>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="w-44"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : filteredHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {history.length === 0 ? 'Nenhuma lista salva ainda.' : 'Nenhum resultado para o filtro aplicado.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.map(bank => (
                    <div key={bank.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{bank.subject} — {bank.topic}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{bank.grade}</Badge>
                          <Badge variant="outline" className="text-xs">{PURPOSE_LABELS[bank.purpose] || bank.purpose}</Badge>
                          <span className="text-xs text-muted-foreground">{(bank.questions as any[])?.length || 0} questões</span>
                          <span className="text-xs text-muted-foreground">{new Date(bank.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleLoadBank(bank)}><Eye size={16} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(bank.id)} className="text-destructive"><Trash2 size={16} /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print-only version */}
      <div className="print-only">
        {questions.length > 0 && (
          <>
            <div className="bg-white text-black p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11pt', lineHeight: 1.6 }}>
              <div className="text-center mb-4 border-b-2 border-black pb-3">
                <h1 className="text-base font-bold uppercase">{institutionName || 'Instituição de Ensino'}</h1>
                <h2 className="text-sm font-semibold mt-1">{displayTitle || 'Lista de Exercícios'}</h2>
              </div>
              <div className="mb-3" style={{ fontSize: '10pt' }}>
                <p>Estudante: _____________________________________________________ Nº: ______</p>
                <p>Turma: _________________ Data: ____/____/________</p>
              </div>
              <div className="mb-4 p-2 border border-black">
                <p className="text-xs"><strong>Disciplina:</strong> {subject} | <strong>Série:</strong> {grade} | <strong>Tema:</strong> {topic}</p>
              </div>
              {questions.map((q, i) => (
                <div key={i} className="mb-5">
                  <div className="flex gap-2">
                    <span className="font-bold">{i + 1})</span>
                    <div dangerouslySetInnerHTML={{ __html: (q.content || '').replace(/```html\s*/gi, '').replace(/```\s*/g, '').trim() }} />
                  </div>
                  {q.options && (
                    <div className="ml-5 mt-2 space-y-1">
                      {q.options.map(opt => (
                        <div key={opt.letter} className="flex gap-2"><span>({opt.letter})</span><span>{opt.text}</span></div>
                      ))}
                    </div>
                  )}
                  {questionType === 'essay' && (
                    <div className="ml-5 mt-3 space-y-3">
                      {[...Array(6)].map((_, j) => <div key={j} className="border-b border-gray-400" style={{ height: '1.5em' }} />)}
                    </div>
                  )}
                </div>
              ))}
              {hasMC && (
                <div className="mt-6 border-t-2 border-black pt-3">
                  <h3 className="text-sm font-bold text-center mb-2">Folha de Respostas</h3>
                  <table className="mx-auto border-collapse" style={{ fontSize: '10pt' }}>
                    <thead><tr><th className="border border-black px-3 py-1">Q</th>{['A','B','C','D'].map(l=><th key={l} className="border border-black px-3 py-1">{l}</th>)}</tr></thead>
                    <tbody>{questions.filter(q=>q.options).map((_,i)=><tr key={i}><td className="border border-black px-3 py-1 text-center font-bold">{String(i+1).padStart(2,'0')}</td>{['A','B','C','D'].map(l=><td key={l} className="border border-black px-3 py-1 text-center"><div className="w-3 h-3 rounded-full border border-black mx-auto"/></td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-white text-black p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', pageBreakBefore: 'always' }}>
              <div className="text-center mb-4 border-b-2 border-black pb-3">
                <h2 className="text-base font-bold uppercase">Gabarito Comentado — Professor</h2>
                <p className="text-xs mt-1">{subject} — {topic} — {grade}</p>
              </div>
              {hasMC && (
                <div className="mb-4 grid grid-cols-6 gap-2">
                  {questions.map((q,i)=>{if(!q.options)return null;const c=q.options.find(o=>o.isCorrect);return <div key={i} className="text-sm"><span className="font-bold">{String(i+1).padStart(2,'0')}.</span> ({c?.letter})</div>;})}
                </div>
              )}
              {questions.map((q,i)=>(
                <div key={i} className="mb-3 border-b pb-2">
                  <p className="font-bold text-sm">Questão {i+1}:</p>
                  {q.options?<p className="ml-3 text-sm">Resposta: ({q.options.find(o=>o.isCorrect)?.letter}) {q.options.find(o=>o.isCorrect)?.text}</p>:<p className="ml-3 text-sm italic">{q.answer||'Resposta aberta.'}</p>}
                  {q.justification&&<p className="ml-3 mt-1 text-xs bg-gray-50 p-1 border-l-2 border-black">💡 {q.justification}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
