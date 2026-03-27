import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export interface MindMapChild {
  label: string;
  detail?: string;
}

export interface MindMapBranch {
  label: string;
  emoji: string;
  color: string;
  summary: string;
  connector: string;
  children?: MindMapChild[];
}

export interface MindMapData {
  center: { label: string; emoji: string };
  branches: MindMapBranch[];
}

function BranchNode({ branch, x, y, mode }: { branch: MindMapBranch; x: number; y: number; mode: string }) {
  const [hovered, setHovered] = useState(false);
  const isInfantil = mode === 'infantil';
  const isMedio = mode === 'medio';

  const cardStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${branch.color}18 0%, ${branch.color}30 100%)`,
    borderColor: hovered ? `${branch.color}` : `${branch.color}44`,
    boxShadow: hovered
      ? `0 8px 32px ${branch.color}40, 0 0 0 1px ${branch.color}60`
      : `0 4px 16px ${branch.color}20`,
    transform: hovered ? 'scale(1.05)' : 'scale(1)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div
      className="absolute z-20 flex flex-col items-center"
      style={{
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        maxWidth: isInfantil ? 160 : isMedio ? 220 : 200,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Connector verb */}
      {branch.connector && !isInfantil && (
        <Badge
          variant="outline"
          className="mb-1.5 text-[10px] font-semibold tracking-wide uppercase"
          style={{
            borderColor: `${branch.color}55`,
            color: `${branch.color}cc`,
            background: `${branch.color}10`,
          }}
        >
          {branch.connector}
        </Badge>
      )}

      {/* Node card */}
      <div
        className="rounded-2xl border-2 backdrop-blur-sm cursor-default"
        style={{
          ...cardStyle,
          padding: isInfantil ? '16px 14px' : isMedio ? '14px 16px' : '12px 14px',
        }}
      >
        <div className="text-center">
          <span className={isInfantil ? 'text-4xl' : 'text-2xl'}>{branch.emoji}</span>
          <p
            className="font-bold mt-1.5 leading-tight"
            style={{
              color: '#f1f5f9',
              fontSize: isInfantil ? '15px' : '14px',
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            {branch.label}
          </p>
          {!isInfantil && branch.summary && (
            <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#94a3b8' }}>
              {branch.summary}
            </p>
          )}
        </div>
      </div>

      {/* Children */}
      {branch.children && branch.children.length > 0 && (isMedio || mode === 'fundamental') && (
        <div className="mt-2 space-y-1 w-full">
          {branch.children.slice(0, isMedio ? 4 : 3).map((child, ci) => (
            <div
              key={ci}
              className="rounded-lg px-2.5 py-1.5 text-center border"
              style={{
                background: `${branch.color}0d`,
                borderColor: `${branch.color}22`,
              }}
            >
              <span className="text-[11px] font-medium" style={{ color: '#cbd5e1' }}>
                {child.label}
              </span>
              {child.detail && isMedio && (
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: '#64748b' }}>
                  {child.detail}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MindMapVisual({ data, mode }: { data: MindMapData; mode: string }) {
  const branches = data.branches || [];
  const total = branches.length;
  const isInfantil = mode === 'infantil';
  const radius = isInfantil ? 230 : mode === 'medio' ? 300 : 270;

  return (
    <div className="relative flex items-center justify-center" style={{ minHeight: isInfantil ? 520 : 600 }}>
      {/* Center node */}
      <div
        className="absolute z-30 flex flex-col items-center justify-center rounded-full border-[3px]"
        style={{
          width: isInfantil ? 150 : 170,
          height: isInfantil ? 150 : 170,
          background: 'radial-gradient(circle at 30% 30%, #818cf8 0%, #4f46e5 60%, #3730a3 100%)',
          borderColor: 'rgba(255,255,255,0.15)',
          boxShadow: '0 0 60px rgba(99,102,241,0.4), 0 0 120px rgba(99,102,241,0.15), inset 0 -4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <span className={isInfantil ? 'text-4xl' : 'text-3xl'}>{data.center.emoji}</span>
        <span
          className="text-white font-extrabold text-center px-4 leading-tight mt-1"
          style={{ fontSize: isInfantil ? '14px' : '13px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
        >
          {data.center.label}
        </span>
      </div>

      {/* SVG connectors */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {branches.map((branch, i) => (
            <linearGradient key={`grad-${i}`} id={`line-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
              <stop offset="100%" stopColor={branch.color || '#6366f1'} stopOpacity="0.8" />
            </linearGradient>
          ))}
        </defs>
        <g style={{ transform: 'translate(50%, 50%)' }}>
          {branches.map((branch, i) => {
            const angle = (360 / total) * i - 90;
            const rad = (angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            // Curved path
            const cx = x * 0.5 + y * 0.15;
            const cy = y * 0.5 - x * 0.15;
            return (
              <path
                key={i}
                d={`M 0,0 Q ${cx},${cy} ${x},${y}`}
                stroke={`url(#line-grad-${i})`}
                strokeWidth={isInfantil ? 3 : 2}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>

      {/* Branches */}
      {branches.map((branch, i) => {
        const angle = (360 / total) * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        return <BranchNode key={i} branch={branch} x={x} y={y} mode={mode} />;
      })}
    </div>
  );
}
