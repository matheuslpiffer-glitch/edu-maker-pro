import { useState } from 'react';
import { showAiErrorToast } from '@/lib/ai-utils';
import { Heart, Send, FileText, Loader2, MessageCircle, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SERIES_CATEGORIAS } from '@/lib/series-data';

export default function EscutaAtiva() {
  const [mode, setMode] = useState<'mediacao' | 'comunicado'>('mediacao');
  const [context, setContext] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const generate = async () => {
    if (!context.trim()) { toast({ title: 'Descreva a situação', variant: 'destructive' }); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('escuta-ativa', {
        body: { mode, context: context.trim(), grade }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data.result);
      toast({ title: '✅ Orientação gerada!' });
    } catch (err: any) {
      showAiErrorToast(err, toast, 'Erro')
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '📋 Copiado!' });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-black text-foreground flex items-center justify-center gap-3">
          <Heart className="text-emerald-500" /> Escuta Ativa
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Assistente de Comunicação Não-Violenta para mediação de conflitos e comunicados escolares.
        </p>
      </div>

      <Tabs value={mode} onValueChange={v => { setMode(v as any); setResult(null); }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mediacao" className="gap-2"><MessageCircle size={16} /> Mediação de Conflitos</TabsTrigger>
          <TabsTrigger value="comunicado" className="gap-2"><FileText size={16} /> Comunicado Escolar</TabsTrigger>
        </TabsList>

        <TabsContent value="mediacao" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Descreva a situação de conflito:</label>
                <Textarea
                  placeholder="Ex: Dois alunos do 7º ano estão em conflito após um desentendimento durante o intervalo sobre um jogo de futebol..."
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger><SelectValue placeholder="Série (opcional)" /></SelectTrigger>
                <SelectContent>
                  {SERIES_CATEGORIAS.map(cat => (
                    <div key={cat.label}>
                      <div className="px-2 py-1 text-xs font-bold text-muted-foreground">{cat.label}</div>
                      {cat.series.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={generate} disabled={loading || !context.trim()} className="w-full gap-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                {loading ? 'Analisando...' : 'Gerar Orientação CNV'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comunicado" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Descreva o que precisa comunicar:</label>
                <Textarea
                  placeholder="Ex: Preciso enviar um comunicado aos pais sobre a mudança no horário de saída na próxima semana devido à semana de provas..."
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              <Button onClick={generate} disabled={loading || !context.trim()} className="w-full gap-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                {loading ? 'Redigindo...' : 'Gerar Comunicado CNV'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground animate-pulse">Aplicando princípios da CNV...</p>
        </div>
      )}

      {result && mode === 'mediacao' && (
        <div className="space-y-4">
          <Card className="border-emerald-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{result.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{result.analysis}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.cnvApproach && Object.entries(result.cnvApproach).map(([key, val]) => {
                  const labels: Record<string, string> = { observation: '👁️ Observação', feeling: '💚 Sentimento', need: '🎯 Necessidade', request: '🤝 Pedido' };
                  return (
                    <div key={key} className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs font-bold mb-1">{labels[key] || key}</p>
                      <p className="text-sm text-muted-foreground">{val as string}</p>
                    </div>
                  );
                })}
              </div>

              {result.dialogScript?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">💬 Roteiro de Diálogo Sugerido:</p>
                  <div className="space-y-2">
                    {result.dialogScript.map((line: string, i: number) => (
                      <div key={i} className="flex gap-2 items-start bg-muted/30 rounded-lg p-3">
                        <Badge variant="outline" className="shrink-0 text-xs">{i + 1}</Badge>
                        <p className="text-sm text-muted-foreground">{line}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.preventionTips?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-1">🛡️ Prevenção:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.preventionTips.map((t: string, i: number) => <li key={i} className="text-sm text-muted-foreground">{t}</li>)}
                  </ul>
                </div>
              )}

              {result.followUp && <p className="text-sm"><strong>📋 Acompanhamento:</strong> {result.followUp}</p>}

              <Button variant="outline" onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} className="gap-2">
                <Copy size={14} /> Copiar orientação
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {result && mode === 'comunicado' && (
        <Card className="border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{result.title}</CardTitle>
            <Badge variant="outline" className="w-fit">{result.tone}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-wrap text-sm">{result.body}</div>

            {result.cnvElements && (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(result.cnvElements).map(([key, val]) => {
                  const labels: Record<string, string> = { observation: '👁️ Observação', feeling: '💚 Sentimento', need: '🎯 Necessidade', request: '🤝 Pedido' };
                  return (
                    <div key={key} className="bg-muted/50 rounded-lg p-2">
                      <p className="text-[10px] font-bold">{labels[key] || key}</p>
                      <p className="text-xs text-muted-foreground">{val as string}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {result.tips?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">💡 Dicas:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {result.tips.map((t: string, i: number) => <li key={i} className="text-sm text-muted-foreground">{t}</li>)}
                </ul>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => copyToClipboard(result.body)} className="gap-2">
                <Copy size={14} /> Copiar comunicado
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); generate(); }} className="gap-2">
                <RefreshCw size={14} /> Gerar outro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
