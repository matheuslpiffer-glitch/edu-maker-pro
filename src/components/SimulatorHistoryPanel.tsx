import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Eye, Trash2 } from 'lucide-react';

interface SimOption { letter: string; text: string; isCorrect: boolean; }
interface SimQuestion { content: string; options: SimOption[]; skillCode?: string; descriptor?: string; answerLines?: number; correctionMirror?: string; explanation?: string; }
interface SavedSimulator { id: string; title: string; exam_type: string; subject_area: string; grade: string; questions: SimQuestion[]; created_at: string; }

interface SimulatorHistoryPanelProps {
  history: SavedSimulator[];
  loadingHistory: boolean;
  handleLoadSimulator: (sim: SavedSimulator) => void;
  handleDelete: (id: string) => Promise<void>;
  examTypes: { value: string; label: string; }[];
}

const SimulatorHistoryPanel = ({
  history,
  loadingHistory,
  handleLoadSimulator,
  handleDelete,
  examTypes
}: SimulatorHistoryPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Simulados Salvos</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum simulado salvo ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map(sim => (
              <div key={sim.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{sim.title}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {examTypes.find(e => e.value === sim.exam_type)?.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{sim.subject_area} · {sim.grade}</span>
                    <span className="text-xs text-muted-foreground">{(sim.questions || []).length} questões</span>
                    <span className="text-xs font-mono text-muted-foreground">ID: {sim.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleLoadSimulator(sim)}>
                    <Eye size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(sim.id)} className="text-destructive">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SimulatorHistoryPanel;
