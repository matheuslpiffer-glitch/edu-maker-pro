import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Inbox, type LucideIcon } from 'lucide-react';

export interface HubItem {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  color?: string;
}

interface HubGridProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: HubItem[];
}

export default function HubGrid({ title, subtitle, icon: HeaderIcon, items }: HubGridProps) {
  const navigate = useNavigate();
  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <HeaderIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        </div>
        <p className="text-muted-foreground text-lg">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.length === 0 ? (
          <div
            role="status"
            className="col-span-full flex flex-col items-center justify-center text-center py-16 px-6 rounded-lg border border-dashed border-border bg-muted/30"
          >
            <Inbox className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-lg mb-1">Nada por aqui ainda</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Nenhum item disponível neste hub no momento. Volte em breve — novas ferramentas aparecerão aqui assim que forem liberadas.
            </p>
          </div>
        ) : (
          items.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.to}
              onClick={() => navigate(f.to)}
              className="text-left group"
            >
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2.5 rounded-lg bg-primary/10 ${f.color || 'text-primary'}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </button>
          );
          })
        )}
      </div>
    </div>
  );
}
