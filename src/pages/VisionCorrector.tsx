import { useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ScanEye, Upload, Loader2, CheckCircle2, XCircle, Camera, FileImage, Sparkles, RotateCcw } from 'lucide-react';

interface CorrectionResult {
  extractedAnswers: { question: number; answer: string }[];
  comparison: { question: number; studentAnswer: string; correctAnswer: string; isCorrect: boolean }[];
  score: number;
  total: number;
  observations: string;
}

export default function VisionCorrector() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gabarito, setGabarito] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Formato inválido', description: 'Envie uma foto (JPG, PNG, etc.)', variant: 'destructive' });
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const onDragLeave = () => setIsDragOver(false);

  const processCorrection = async () => {
    if (!image || !gabarito.trim()) {
      toast({ title: 'Preencha todos os campos', description: 'Envie a foto e informe o gabarito.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Upload image to storage
      const fileName = `vision-corrections/${user?.id}/${Date.now()}-${image.name}`;
      const { error: uploadError } = await supabase.storage.from('essay-images').upload(fileName, image);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('essay-images').getPublicUrl(fileName);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('correct-vision', {
        body: { imageUrl: publicUrl, gabarito: gabarito.trim() },
      });

      if (error) throw error;
      setResult(data as CorrectionResult);
      toast({ title: 'Correção concluída!', description: `Nota: ${data.score}/${data.total}` });
    } catch (err: any) {
      toast({ title: 'Erro na correção', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImagePreview(null);
    setGabarito('');
    setResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-xl shadow-indigo-500/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wOCkiLz48L3N2Zz4=')] opacity-50" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <ScanEye size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Corretor de Visão IA</h1>
            <p className="text-white/70 text-sm mt-1">OCR inteligente — fotografe a prova e corrija automaticamente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload */}
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 text-center ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 scale-[1.02]'
                : imagePreview
                  ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-border bg-card hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />

            {imagePreview ? (
              <div className="space-y-3">
                <img src={imagePreview} alt="Prova" className="max-h-64 mx-auto rounded-xl shadow-lg object-contain" />
                <div className="flex items-center justify-center gap-2 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-sm font-medium">Foto carregada — clique para trocar</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-8">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                  <Camera size={32} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-foreground font-semibold text-lg">Arraste a foto da prova aqui</p>
                  <p className="text-muted-foreground text-sm mt-1">ou clique para selecionar / tirar foto</p>
                </div>
                <div className="flex justify-center gap-2">
                  <Badge variant="secondary" className="text-xs"><FileImage size={12} className="mr-1" /> JPG</Badge>
                  <Badge variant="secondary" className="text-xs"><FileImage size={12} className="mr-1" /> PNG</Badge>
                  <Badge variant="secondary" className="text-xs"><Camera size={12} className="mr-1" /> Câmera</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Gabarito */}
          <Card className="rounded-2xl shadow-lg shadow-indigo-500/5">
            <CardContent className="pt-6 space-y-3">
              <Label className="text-sm font-bold text-foreground">Gabarito Oficial</Label>
              <p className="text-xs text-muted-foreground">Informe as respostas corretas (1 por linha: "1-A", "2-C", etc.)</p>
              <Textarea
                value={gabarito}
                onChange={(e) => setGabarito(e.target.value)}
                placeholder={`1-A\n2-C\n3-B\n4-D\n5-A\n6-E\n7-B\n8-C\n9-A\n10-D`}
                rows={8}
                className="font-mono text-sm rounded-xl"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              onClick={processCorrection}
              disabled={loading || !image || !gabarito.trim()}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20"
            >
              {loading ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Sparkles className="mr-2" size={18} />}
              {loading ? 'Analisando com IA...' : 'Corrigir com Visão IA'}
            </Button>
            {result && (
              <Button onClick={reset} variant="outline" className="rounded-2xl">
                <RotateCcw size={16} />
              </Button>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="rounded-2xl border-dashed h-full flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center py-12">
                <ScanEye size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">Envie uma foto e o gabarito</p>
                <p className="text-xs text-muted-foreground mt-1">A IA fará o OCR da caligrafia e comparará com as respostas</p>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="rounded-2xl h-full flex items-center justify-center min-h-[300px]">
              <CardContent className="text-center py-12">
                <Loader2 size={40} className="mx-auto animate-spin text-indigo-500 mb-4" />
                <p className="text-foreground font-semibold">Processando OCR...</p>
                <p className="text-xs text-muted-foreground mt-1">Reconhecendo caligrafia e comparando respostas</p>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score */}
              <Card className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-500/10">
                <CardContent className="pt-6 text-center">
                  <div className="text-5xl font-black text-indigo-700 dark:text-indigo-300">{result.score}/{result.total}</div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                    {Math.round((result.score / result.total) * 100)}% de acerto
                  </p>
                </CardContent>
              </Card>

              {/* Answer comparison */}
              <Card className="rounded-2xl shadow-lg shadow-indigo-500/5">
                <CardContent className="pt-6">
                  <h3 className="font-bold text-foreground mb-3 text-sm">Comparação Questão a Questão</h3>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto">
                    {result.comparison.map((item: any) => (
                      <div key={item.question} className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                        item.isCorrect
                          ? 'bg-emerald-50 dark:bg-emerald-950/20'
                          : 'bg-red-50 dark:bg-red-950/20'
                      }`}>
                        <span className="font-medium text-foreground">Q{item.question}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs">Aluno: <strong>{item.studentAnswer}</strong></span>
                          <span className="text-muted-foreground text-xs">Gabarito: <strong>{item.correctAnswer}</strong></span>
                          {item.isCorrect
                            ? <CheckCircle2 size={16} className="text-emerald-500" />
                            : <XCircle size={16} className="text-red-500" />
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Observations */}
              {result.observations && (
                <Card className="rounded-2xl shadow-lg shadow-indigo-500/5">
                  <CardContent className="pt-6">
                    <h3 className="font-bold text-foreground mb-2 text-sm">Observações da IA</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.observations}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
