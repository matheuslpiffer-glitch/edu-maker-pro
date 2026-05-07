import GeradorInfograficoProcesso from "@/components/mindmap/GeradorInfograficoProcesso";
import { Workflow } from "lucide-react";

export default function Infograficos() {
  return (
    <div className="space-y-6 pb-12">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Workflow className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Gerador de Infográficos de Processos
          </h1>
        </div>
        <p className="text-muted-foreground">
          Crie guias visuais estruturados, passo a passo e acessíveis para qualquer disciplina.
        </p>
      </div>

      <GeradorInfograficoProcesso />
    </div>
  );
}
