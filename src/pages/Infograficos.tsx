import GeradorInfograficoProcesso from "@/components/mindmap/GeradorInfograficoProcesso";
import { Workflow } from "lucide-react";

export default function Infograficos() {
  return (
    <div className="relative max-w-[1600px] mx-auto overflow-x-hidden bg-slate-50 min-h-screen -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 no-print">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
          <Workflow className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Gerador de Processos</p>
          <h1 className="text-2xl font-bold text-slate-900">Gerador de Infográficos de Processos</h1>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-4 sm:p-6 no-print mb-8">
        <p className="text-muted-foreground text-sm mb-2">
          Crie guias visuais estruturados, passo a passo e acessíveis para qualquer disciplina.
        </p>
      </div>

      <GeradorInfograficoProcesso />
    </div>
  );
}
