import { useMemo } from 'react';
import type { MindMapData } from './MindMapVisual';

interface MindMapBranch {
  id: string;
  label: string;
  summary: string;
  children?: { label: string }[];
}

export default function MindMapVisual({ data }: { data: MindMapData | null }) {
  const branches = useMemo(() => data?.branches || [], [data]);
  
  if (!data) return null;

  return (
    <div className="relative p-8 bg-white min-h-[600px] flex items-center justify-center overflow-auto">
      <div className="relative flex items-center justify-center">
        {/* Center Node */}
        <div className="z-10 bg-primary text-primary-foreground px-8 py-4 rounded-full shadow-xl font-bold text-xl border-4 border-primary/20 animate-in zoom-in duration-500">
          {data.center?.label || 'TEMA CENTRAL'}
        </div>

        {/* Branches */}
        {(data.branches || []).map((branch, idx) => {
          const angle = (idx * 360) / (data.branches?.length || 1);
          const radius = 240;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius;

          return (
            <div
              key={branch.id || idx}
              className="absolute transition-all duration-700 delay-150 animate-in fade-in zoom-in"
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
            >
              {/* Connector line could go here with SVG */}
              <div className="bg-white border-2 border-primary/30 p-4 rounded-2xl shadow-lg max-w-[200px] hover:border-primary transition-colors group">
                <h3 className="font-bold text-primary text-sm mb-1 uppercase tracking-tight">
                  {branch.label || 'TÓPICO'}
                </h3>
                <p className="text-[10px] text-muted-foreground leading-tight line-clamp-3 group-hover:line-clamp-none transition-all">
                  {branch.summary || 'Resumo não disponível.'}
                </p>
                
                {(branch.children || []).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {(branch.children || []).map((child, cIdx) => (
                      <span key={cIdx} className="bg-slate-50 text-[8px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                        {child.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* SVG Connections (Basic straight lines for now) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: 0 }}>
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 Z" fill="currentColor" className="text-primary/30" />
          </marker>
        </defs>
        {(data.branches || []).map((branch, idx) => {
          const angle = (idx * 360) / (data.branches?.length || 1);
          const radius = 240;
          const x2 = 400 + Math.cos((angle * Math.PI) / 180) * radius;
          const y2 = 300 + Math.sin((angle * Math.PI) / 180) * radius;
          return (
            <line
              key={`line-${idx}`}
              x1="50%" y1="50%"
              x2={`${50 + (Math.cos((angle * Math.PI) / 180) * 30)}%`}
              y2={`${50 + (Math.sin((angle * Math.PI) / 180) * 30)}%`}
              stroke="currentColor"
              className="text-primary"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          );
        })}
      </svg>
    </div>
  );
}

export interface MindMapData {
  center: { label: string };
  branches: MindMapBranch[];
}

export interface MindMapQuestion {
  number: number;
  question: string;
  answer: string;
}
