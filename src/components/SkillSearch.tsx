import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CurriculumSkill {
  id: string;
  code: string;
  description: string;
  subject_area: string;
  grade: string;
  stage: string;
  bimester: number;
  knowledge_object: string;
}

interface Props {
  subjectName?: string;
  onSelectSkill: (skill: CurriculumSkill) => void;
}

const STAGES = [
  { value: 'all', label: 'Todas as Etapas' },
  { value: 'fundamental_ii', label: 'Ensino Fundamental II' },
  { value: 'medio', label: 'Ensino Médio' },
];

const BIMESTERS = [
  { value: 'all', label: 'Todos os Bimestres' },
  { value: '1', label: '1º Bimestre' },
  { value: '2', label: '2º Bimestre' },
  { value: '3', label: '3º Bimestre' },
  { value: '4', label: '4º Bimestre' },
];

export default function SkillSearch({ subjectName, onSelectSkill }: Props) {
  const [skills, setSkills] = useState<CurriculumSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('all');
  const [bimester, setBimester] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, [subjectName, stage, bimester]);

  const loadSkills = async () => {
    setLoading(true);
    let query = supabase.from('curriculum_skills').select('*').order('code');

    if (subjectName) {
      query = query.eq('subject_area', subjectName);
    }
    if (stage !== 'all') {
      query = query.eq('stage', stage);
    }
    if (bimester !== 'all') {
      query = query.eq('bimester', parseInt(bimester));
    }

    const { data } = await query;
    setSkills((data as CurriculumSkill[]) || []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return skills;
    const q = search.toLowerCase();
    return skills.filter(s =>
      s.code.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.knowledge_object.toLowerCase().includes(q)
    );
  }, [skills, search]);

  const selectedSkill = skills.find(s => s.id === selectedId);

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Buscar Habilidade / Objeto de Aprendizagem
      </Label>

      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código (EF09MA01), palavra-chave ou tema..."
            className="min-h-[44px]"
          />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-48 min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={bimester} onValueChange={setBimester}>
          <SelectTrigger className="w-44 min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {BIMESTERS.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {skills.length === 0 ? 'Nenhuma habilidade cadastrada para esta disciplina.' : 'Nenhuma habilidade encontrada para esta busca.'}
        </p>
      ) : (
        <ScrollArea className="h-[240px] rounded-md border">
          <div className="p-2 space-y-1.5">
            {filtered.map(skill => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setSelectedId(skill.id === selectedId ? null : skill.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                  skill.id === selectedId
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                    {skill.code}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {skill.grade} • {skill.bimester}º Bim
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80 line-clamp-2">
                  {skill.description}
                </p>
                {skill.knowledge_object && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    📘 {skill.knowledge_object}
                  </p>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {selectedSkill && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">{selectedSkill.code}</span>
              <span className="text-xs text-muted-foreground">{selectedSkill.grade} • {selectedSkill.bimester}º Bimestre</span>
            </div>
            <p className="text-sm text-foreground">{selectedSkill.description}</p>
            {selectedSkill.knowledge_object && (
              <p className="text-xs text-muted-foreground">📘 Objeto: {selectedSkill.knowledge_object}</p>
            )}
            <Button
              size="sm"
              className="w-full mt-2"
              onClick={() => onSelectSkill(selectedSkill)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Atividade com esta Habilidade
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
