import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accessibility, Sparkles, RefreshCw, BookMarked, CheckCircle2, Loader2 } from 'lucide-react';

interface SimulatorInclusaoPanelProps {
  aeeMode: 'gerar_novas' | 'adaptar_antigas' | 'texto_resumo';
  setAeeMode: (mode: 'gerar_novas' | 'adaptar_antigas' | 'texto_resumo') => void;
  aeeTopic: string;
  setAeeTopic: (topic: string) => void;
  aeeQuestionCount: number;
  setAeeQuestionCount: (count: number) => void;
  aeeQuestionType: string;
  setAeeQuestionType: (type: string) => void;
  aeeContent: string;
  setAeeContent: (content: string) => void;
  generating: boolean;
  onGenerate: () => Promise<void>;
}

const SimulatorInclusaoPanel = ({
  aeeMode,
  setAeeMode,
  aeeTopic,
  setAeeTopic,
  aeeQuestionCount,
  setAeeQuestionCount,
  aeeQuestionType,
  setAeeQuestionType,
  aeeContent,
  setAeeContent,
  generating,
  onGenerate
}: SimulatorInclusaoPanelProps) => {
  return (
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
          onClick={onGenerate}
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
  );
};

export default SimulatorInclusaoPanel;
