import { useState } from 'react';
import { Video, Mic, ImageIcon, FileText, Sparkles, Coins, FolderOpen, Download, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface LabConfig {
  id: string;
  title: string;
  desc: string;
  icon: React.ElementType;
  gradient: string;
  glow: string;
  placeholder: string;
}

const labs: LabConfig[] = [
  { id: 'video', title: 'VideoLab', desc: 'Geração de vídeos educativos com IA', icon: Video, gradient: 'from-violet-600 to-fuchsia-600', glow: 'shadow-violet-500/30', placeholder: 'Descreva o vídeo educativo que deseja criar...' },
  { id: 'audio', title: 'AudioLab', desc: 'Podcasts, narrações e efeitos sonoros', icon: Mic, gradient: 'from-cyan-500 to-blue-600', glow: 'shadow-cyan-500/30', placeholder: 'Descreva o áudio ou narração que deseja gerar...' },
  { id: 'photo', title: 'PhotoLab', desc: 'Ilustrações, infográficos e imagens', icon: ImageIcon, gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/30', placeholder: 'Descreva a imagem ou ilustração que deseja criar...' },
  { id: 'script', title: 'ScriptLab', desc: 'Roteiros, legendas e textos criativos', icon: FileText, gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/30', placeholder: 'Descreva o roteiro ou texto criativo que deseja gerar...' },
];

interface Creation {
  id: string;
  labId: string;
  prompt: string;
  createdAt: string;
}

export default function EduStudio() {
  const [activeLab, setActiveLab] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [credits] = useState(50);
  const [gallery, setGallery] = useState<Creation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('edustudio_gallery') || '[]');
    } catch { return []; }
  });
  const { toast } = useToast();

  const activeConfig = labs.find(l => l.id === activeLab);

  const handleGenerate = () => {
    if (!prompt.trim() || !activeLab) return;
    const creation: Creation = {
      id: crypto.randomUUID(),
      labId: activeLab,
      prompt: prompt.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = [creation, ...gallery];
    setGallery(updated);
    localStorage.setItem('edustudio_gallery', JSON.stringify(updated));
    toast({ title: '✨ Criação registrada!', description: 'Integração com IA em breve. Prompt salvo na galeria.' });
    setPrompt('');
  };

  const handleDelete = (id: string) => {
    const updated = gallery.filter(g => g.id !== id);
    setGallery(updated);
    localStorage.setItem('edustudio_gallery', JSON.stringify(updated));
  };

  const labIcon = (labId: string) => {
    const l = labs.find(x => x.id === labId);
    return l ? l.icon : FileText;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#0c0a1d] via-[#1a1145] to-[#0d1a2e] p-8 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_60%)]" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px] uppercase tracking-widest font-bold mb-3">
              Creative IA
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              EduStudio
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-md">
              Hub criativo multimídia do ecossistema EduSuite. Crie vídeos, áudios, imagens e roteiros com inteligência artificial.
            </p>
          </div>
          {/* Credits Widget */}
          <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-3">
            <Coins size={18} className="text-amber-400" />
            <div>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Créditos</p>
              <p className="text-lg font-black text-white tabular-nums">{credits}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lab Cards */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4">Laboratórios</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {labs.map(lab => {
            const isActive = activeLab === lab.id;
            return (
              <button
                key={lab.id}
                onClick={() => setActiveLab(isActive ? null : lab.id)}
                className={`text-left rounded-2xl border p-5 transition-all duration-300 group ${
                  isActive
                    ? 'bg-white/10 border-violet-500/40 shadow-lg shadow-violet-500/10 scale-[1.02]'
                    : 'bg-white/[0.03] border-slate-700/50 hover:bg-white/[0.06] hover:border-slate-600/50 hover:shadow-md'
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${lab.gradient} shadow-lg ${lab.glow} group-hover:scale-110 transition-transform`}>
                  <lab.icon size={22} className="text-white" />
                </div>
                <p className="font-bold text-white mt-3 text-sm">{lab.title}</p>
                <p className="text-xs text-slate-400 mt-1">{lab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Lab Prompt Area */}
      {activeConfig && (
        <div className="rounded-2xl border border-slate-700/50 bg-white/[0.03] p-6 space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${activeConfig.gradient}`}>
              <activeConfig.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{activeConfig.title}</p>
              <p className="text-[11px] text-slate-400">{activeConfig.desc}</p>
            </div>
          </div>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={activeConfig.placeholder}
            className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 min-h-[100px] rounded-xl resize-none focus:border-violet-500/50"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-slate-500">1 crédito por geração</p>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-violet-500/20 rounded-xl gap-2"
            >
              <Sparkles size={16} />
              Gerar com IA
            </Button>
          </div>
        </div>
      )}

      {/* Gallery */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen size={16} className="text-slate-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Galeria de Criações</p>
          <Badge variant="secondary" className="text-[10px] ml-auto">{gallery.length} itens</Badge>
        </div>
        {gallery.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/50 bg-white/[0.02] p-10 text-center">
            <Plus size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Nenhuma criação ainda</p>
            <p className="text-xs text-slate-500 mt-1">Selecione um Lab acima e gere seu primeiro conteúdo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gallery.map(item => {
              const Icon = labIcon(item.labId);
              const lab = labs.find(l => l.id === item.labId);
              return (
                <div key={item.id} className="rounded-2xl border border-slate-700/50 bg-white/[0.03] p-4 group hover:bg-white/[0.06] transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${lab?.gradient || 'from-slate-600 to-slate-700'}`}>
                      <Icon size={14} className="text-white" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{lab?.title}</span>
                    <span className="text-[10px] text-slate-600 ml-auto">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-3">{item.prompt}</p>
                  <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-slate-400 hover:text-white">
                      <Download size={12} className="mr-1" /> Baixar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-red-400 hover:text-red-300 ml-auto" onClick={() => handleDelete(item.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-slate-800/50">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
          Plataforma Multimídia Autoral | Desenvolvido por <span className="text-slate-400">Matheus Lima Piffer</span>
        </p>
      </div>
    </div>
  );
}
