import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Camera, Loader2, Printer, RotateCw, Lightbulb, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CorrectionResult {
  extracted_text: string;
  comp1_score: number;
  comp2_score: number;
  comp3_score: number;
  comp4_score: number;
  comp5_score: number;
  total_score: number;
  comp1_justification: string;
  comp2_justification: string;
  comp3_justification: string;
  comp4_justification: string;
  comp5_justification: string;
  golden_tips: string[];
}

const COMPETENCIES = [
  { key: 'comp1', label: 'Competência I', desc: 'Domínio da norma culta' },
  { key: 'comp2', label: 'Competência II', desc: 'Compreensão do tema e estrutura' },
  { key: 'comp3', label: 'Competência III', desc: 'Organização e interpretação de informações' },
  { key: 'comp4', label: 'Competência IV', desc: 'Mecanismos linguísticos (coesão)' },
  { key: 'comp5', label: 'Competência V', desc: 'Proposta de intervenção' },
];

function ScoreGauge({ score, max = 1000 }: { score: number; max?: number }) {
  const pct = Math.min(score / max, 1);
  const angle = pct * 180;
  const color = pct >= 0.8 ? '#10b981' : pct >= 0.6 ? '#f59e0b' : pct >= 0.4 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-48 h-28">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${angle * (Math.PI * 80 / 180)} 999`}
        />
        <text x="100" y="90" textAnchor="middle" className="text-3xl font-bold" fill="currentColor" fontSize="36">
          {score}
        </text>
        <text x="100" y="112" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">
          de {max} pontos
        </text>
      </svg>
    </div>
  );
}

function CompetencyBar({ score, max = 200 }: { score: number; max?: number }) {
  const pct = (score / (max || 200)) * 100;
  const color = pct >= 80 ? 'bg-cyan-500' : pct >= 60 ? 'bg-amber-500' : pct >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-bold text-sm w-12 text-right">{score}/200</span>
    </div>
  );
}

export default function EssayCorrector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorrectionResult | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setRotation(0);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  };

  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const handleCorrect = async () => {
    if (!imageFile || !user) return;
    setLoading(true);
    try {
      // Convert to base64
      const buffer = await imageFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke('correct-essay', {
        body: { imageBase64: base64, mimeType: imageFile.type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const correctionResult = data as CorrectionResult;
      setResult(correctionResult);

      // Upload image to storage
      const filePath = `${user.id}/${Date.now()}_${imageFile.name}`;
      const { data: uploadData } = await supabase.storage.from('essay-images').upload(filePath, imageFile);
      const imageUrl = uploadData?.path
        ? supabase.storage.from('essay-images').getPublicUrl(uploadData.path).data.publicUrl
        : '';

      // Save correction to database
      await supabase.from('essay_corrections').insert({
        user_id: user.id,
        image_url: imageUrl,
        extracted_text: correctionResult.extracted_text,
        comp1_score: correctionResult.comp1_score,
        comp2_score: correctionResult.comp2_score,
        comp3_score: correctionResult.comp3_score,
        comp4_score: correctionResult.comp4_score,
        comp5_score: correctionResult.comp5_score,
        total_score: correctionResult.total_score,
        comp1_justification: correctionResult.comp1_justification,
        comp2_justification: correctionResult.comp2_justification,
        comp3_justification: correctionResult.comp3_justification,
        comp4_justification: correctionResult.comp4_justification,
        comp5_justification: correctionResult.comp5_justification,
        golden_tips: correctionResult.golden_tips as any,
        student_name: studentName,
      });

      toast({ title: 'Correção concluída e salva!' });
    } catch (e: any) {
      toast({ title: 'Erro na correção', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6 no-print">
        <Button variant="ghost" size="sm" onClick={() => navigate('/redacao')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold">Corretor Instantâneo</h1>
      </div>

      {/* Upload Section */}
      <div className="space-y-4 no-print">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📸 Escanear Redação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Aluno (opcional)</Label>
              <Input
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full h-32 border-dashed border-2 flex flex-col gap-2"
            >
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span>📸 Escanear Redação (Foto)</span>
              <span className="text-xs text-muted-foreground">Clique para tirar foto ou selecionar imagem</span>
            </Button>

            {imagePreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Pré-visualização</p>
                  <Button variant="outline" size="sm" onClick={handleRotate}>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Girar 90°
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center p-2 max-h-80">
                  <img
                    src={imagePreview}
                    alt="Preview da redação"
                    className="max-h-72 object-contain transition-transform duration-300"
                    style={{ transform: `rotate(${rotation}deg)` }}
                  />
                </div>
                <Button onClick={handleCorrect} disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando redação com IA...
                    </>
                  ) : (
                    '🤖 Corrigir com IA'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results Dashboard */}
      {result && (
        <>
          <div className="mt-6 no-print">
            <div className="flex justify-end mb-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                🖨️ Imprimir Laudo de Correção
              </Button>
            </div>
          </div>

          <div ref={printRef}>
            <CorrectionDashboard result={result} studentName={studentName} />
          </div>

          {/* Print version */}
          <div className="print-only">
            <CorrectionDashboard result={result} studentName={studentName} />
          </div>
        </>
      )}
    </div>
  );
}

function CorrectionDashboard({ result, studentName }: { result: CorrectionResult; studentName: string }) {
  return (
    <div className="space-y-6">
      {/* Header with student name */}
      {studentName && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Aluno(a)</p>
          <p className="text-lg font-bold">{studentName}</p>
        </div>
      )}

      {/* Gauge */}
      <Card>
        <CardContent className="pt-6 flex flex-col items-center">
          <h3 className="font-bold text-lg mb-2">Nota Final ENEM</h3>
          <ScoreGauge score={result.total_score} />
          <Badge
            className={`mt-2 text-sm ${
              result.total_score >= 800 ? 'bg-cyan-500' :
              result.total_score >= 600 ? 'bg-amber-500' :
              result.total_score >= 400 ? 'bg-orange-500' : 'bg-red-500'
            } text-white`}
          >
            {result.total_score >= 800 ? 'Excelente' :
             result.total_score >= 600 ? 'Bom' :
             result.total_score >= 400 ? 'Regular' : 'Precisa melhorar'}
          </Badge>
        </CardContent>
      </Card>

      {/* Competencies */}
      <div className="grid grid-cols-1 gap-4">
        {COMPETENCIES.map((comp, i) => {
          const score = result[`comp${i + 1}_score` as keyof CorrectionResult] as number;
          const justification = result[`comp${i + 1}_justification` as keyof CorrectionResult] as string;
          return (
            <Card key={comp.key}>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{comp.label}</p>
                    <p className="text-xs text-muted-foreground">{comp.desc}</p>
                  </div>
                  <Star className="h-4 w-4 text-accent" />
                </div>
                <CompetencyBar score={score} />
                <p className="text-sm text-muted-foreground leading-relaxed">{justification}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Golden Tips */}
      {result.golden_tips && result.golden_tips.length > 0 && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent" />
              Dicas de Ouro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.golden_tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-accent shrink-0">💡</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Extracted text */}
      {result.extracted_text && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Texto Extraído (OCR)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {result.extracted_text}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
