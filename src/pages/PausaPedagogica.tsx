import { useState } from 'react';
import { showAiErrorToast } from '@/lib/ai-utils';
import { Coffee, Loader2, RefreshCw, Music, Brain, Flame, Sparkles, BookHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SERIES_CATEGORIAS } from '@/lib/series-data';

const CATEGORIES = [
  { id: 'foco', label: 'Foco & Atenção', icon: Brain, color: 'text-blue-500' },
  { id: 'musica', label: 'Musical', icon: Music, color: 'text-pink-500' },
  { id: 'reflexao', label: 'Reflexão & Valores', icon: BookHeart, color: 'text-amber-500' },
  { id: 'energizante', label: 'Energizante', icon: Flame, color: 'text-orange-500' },
  { id: 'criatividade', label: 'Criatividade', icon: Sparkles, color: 'text-purple-500' },
];

interface Dynamic {
  title: string;
  category: string;
  duration: string;
  objective: string;
  instructions: string[];
  variation: string;
  teacherTip: string;
  emoji: string;
}

export default function PausaPedagogica() {
  const [category, setCategory] = useState('foco');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [dynamics, setDynamics] = useState<Dynamic[]>([]);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pausa-pedagogica', {
        body: { category, grade }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDynamics(prev => [data.result, ...prev]);
      toast({ title: '✅ Dinâmica gerada!' });
    } catch (err: any) {
      showAiErrorToast(err, toast, 'Erro')
    } finally {
      setLoading(false);
    }
  };

  const catInfo = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center justify-center gap-3">
          <Coffee className="text-emerald-500" /> Pausa Pedagógica
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Dinâmicas rápidas de 2 minutos para início de aula: foco, música, reflexão e energia.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Category chips */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Categoria:</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                    category === cat.id
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <cat.icon size={16} className={cat.color} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger><SelectValue placeholder="Série/Ano (opcional)" /></SelectTrigger>
            <SelectContent>
              {SERIES_CATEGORIAS.map(cat => (
                <div key={cat.label}>
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground">{cat.label}</div>
                  {cat.series.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </div>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={generate} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <catInfo.icon size={18} />}
            {loading ? 'Criando dinâmica...' : `Gerar Dinâmica de ${catInfo.label}`}
          </Button>
        </CardContent>
      </Card>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground animate-pulse">Criando uma dinâmica criativa...</p>
        </div>
      )}

      {dynamics.map((d, idx) => (
        <Card key={idx} className="border-emerald-500/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{d.emoji}</span>
              <CardTitle className="text-lg">{d.title}</CardTitle>
            </div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary">{d.category}</Badge>
              <Badge variant="outline">⏱ {d.duration}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm"><strong>🎯 Objetivo:</strong> {d.objective}</p>

            <div>
              <p className="text-sm font-semibold mb-1">📋 Instruções:</p>
              <ol className="list-decimal pl-5 space-y-1">
                {d.instructions.map((inst, i) => <li key={i} className="text-sm text-muted-foreground">{inst}</li>)}
              </ol>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-semibold mb-1">🔄 Variação:</p>
              <p className="text-xs text-muted-foreground">{d.variation}</p>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold mb-1">💡 Dica do Professor:</p>
              <p className="text-xs text-muted-foreground">{d.teacherTip}</p>
            </div>

            <Button variant="outline" size="sm" onClick={() => { setCategory(d.category || 'foco'); generate(); }} className="gap-2">
              <RefreshCw size={14} /> Gerar outra
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
