import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Printer, Download, FileText, ArrowLeft, ListChecks, AlignLeft, Eye, Columns2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import AssessmentPreview from '@/components/AssessmentPreview';
import { exportToPDF, exportToDocx } from '@/lib/export';

const COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700', indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700', cyan: 'bg-cyan-100 text-cyan-700',
  orange: 'bg-orange-100 text-orange-700', pink: 'bg-pink-100 text-pink-700',
};

interface QuestionOption { id: string; text: string; isCorrect: boolean; }
interface Question {
  id: string; subject_id: string; type: string; content: string; difficulty: string;
  topic: string; options: QuestionOption[]; answer: string;
}
interface Subject { id: string; name: string; color: string; }

function stripHtml(html: string) {
  return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
}

export default function CreateAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const previewRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [assessmentDate, setAssessmentDate] = useState('');
  const [className, setClassName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showGabarito, setShowGabarito] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterSubject, setFilterSubject] = useState('all');
  const [twoColumns, setTwoColumns] = useState(false);

  useEffect(() => {
    async function load() {
      const [qRes, sRes] = await Promise.all([
        supabase.from('questions').select('*').order('created_at', { ascending: false }),
        supabase.from('subjects').select('*').order('name'),
      ]);
      setQuestions((qRes.data as unknown as Question[]) || []);
      setSubjects((sRes.data as Subject[]) || []);

      if (id) {
        const { data: a } = await supabase.from('assessments').select('*').eq('id', id).maybeSingle();
        if (a) {
          setTitle(a.title); setInstitutionName(a.institution_name);
          setLogoUrl(a.logo_url); setTeacherName(a.teacher_name);
          setAssessmentDate(a.assessment_date); setClassName(a.class_name);
          setSelectedIds(a.question_ids as string[]);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const toggleQuestion = (qid: string) => {
    setSelectedIds(prev => prev.includes(qid) ? prev.filter(x => x !== qid) : [...prev, qid]);
  };

  const selectedQuestions = selectedIds.map(qid => questions.find(q => q.id === qid)).filter(Boolean) as Question[];

  const filteredQuestions = questions.filter(q => filterSubject === 'all' || q.subject_id === filterSubject);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id, title, institution_name: institutionName, logo_url: logoUrl,
      teacher_name: teacherName, assessment_date: assessmentDate, class_name: className,
      question_ids: selectedIds,
    };
    if (id) {
      await supabase.from('assessments').update(payload).eq('id', id);
    } else {
      await supabase.from('assessments').insert(payload);
    }
    setSaving(false);
    toast({ title: 'Prova salva!' });
    navigate('/provas');
  };

  const handlePrint = () => window.print();

  const handlePDF = async () => {
    if (!previewRef.current) return;
    await exportToPDF(previewRef.current, title || 'avaliacao');
    toast({ title: 'PDF gerado!' });
  };

  const handleDocx = async () => {
    await exportToDocx(
      { institutionName, teacherName, date: assessmentDate, className, title },
      selectedQuestions, subjects, showGabarito,
    );
    toast({ title: 'DOCX gerado!' });
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const header = { institutionName, logoUrl, teacherName, date: assessmentDate, className, title };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/provas')}><ArrowLeft size={18} /></Button>
        <h1 className="text-2xl font-bold">{id ? 'Editar Prova' : 'Nova Prova'}</h1>
      </div>

      <Tabs defaultValue="header" className="no-print">
        <TabsList className="mb-4">
          <TabsTrigger value="header">Cabeçalho</TabsTrigger>
          <TabsTrigger value="questions">Questões ({selectedIds.length})</TabsTrigger>
          <TabsTrigger value="preview">Pré-visualização</TabsTrigger>
        </TabsList>

        <TabsContent value="header">
          <Card>
            <CardHeader><CardTitle className="text-lg">Cabeçalho da Prova</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Instituição</Label>
                  <Input value={institutionName} onChange={e => setInstitutionName(e.target.value)} placeholder="Escola Municipal..." />
                </div>
                <div className="space-y-2">
                  <Label>Título da Avaliação</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Prova de Matemática" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Professor(a)</Label>
                  <Input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Nome do professor" />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Input value={className} onChange={e => setClassName(e.target.value)} placeholder="8º Ano A" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL do Logo (opcional)</Label>
                <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg">Selecionar Questões</CardTitle>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredQuestions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma questão disponível. Crie questões primeiro.</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                  {filteredQuestions.map(q => {
                    const subject = subjects.find(s => s.id === q.subject_id);
                    const isSelected = selectedIds.includes(q.id);
                    return (
                      <div
                        key={q.id}
                        onClick={() => toggleQuestion(q.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox checked={isSelected} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {subject && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_CLASSES[subject.color] || COLOR_CLASSES.blue}`}>
                                {subject.name}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs gap-1">
                              {q.type === 'multiple-choice' ? <ListChecks size={10} /> : <AlignLeft size={10} />}
                              {q.type === 'multiple-choice' ? 'ME' : 'Diss.'}
                            </Badge>
                          </div>
                          <p className="text-sm line-clamp-2">{stripHtml(q.content)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <div className="space-y-4">
            {/* Export buttons */}
            <Card>
              <CardContent className="flex items-center gap-3 p-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox id="gabarito" checked={showGabarito} onCheckedChange={(v) => setShowGabarito(!!v)} />
                  <Label htmlFor="gabarito" className="text-sm cursor-pointer">Incluir Gabarito</Label>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Switch id="twocol" checked={twoColumns} onCheckedChange={setTwoColumns} />
                  <Label htmlFor="twocol" className="text-sm cursor-pointer flex items-center gap-1">
                    <Columns2 size={14} /> Duas Colunas
                  </Label>
                </div>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={handlePrint}><Printer size={16} className="mr-2" />Imprimir</Button>
                <Button variant="outline" size="sm" onClick={handlePDF}><Download size={16} className="mr-2" />PDF</Button>
                <Button variant="outline" size="sm" onClick={handleDocx}><FileText size={16} className="mr-2" />DOCX</Button>
              </CardContent>
            </Card>

            {selectedQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Selecione questões na aba "Questões" para ver a pré-visualização.</p>
              </div>
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <AssessmentPreview
                    ref={previewRef}
                    header={header}
                    questions={selectedQuestions}
                    subjects={subjects}
                    showGabarito={showGabarito}
                    twoColumns={twoColumns}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Print view */}
      <div className="print-only">
        <AssessmentPreview
          header={header}
          questions={selectedQuestions}
          subjects={subjects}
          showGabarito={showGabarito}
          twoColumns={twoColumns}
        />
      </div>

      <div className="flex justify-end gap-3 mt-6 no-print">
        <Button variant="outline" onClick={() => navigate('/provas')}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Prova
        </Button>
      </div>
    </div>
  );
}
