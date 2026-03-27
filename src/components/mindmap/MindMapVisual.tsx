import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';

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
  memory_trick?: string;
  aee_hint?: string;
  cross_link?: string;
  children?: MindMapChild[];
}

export interface MindMapData {
  center: { label: string; emoji: string };
  branches: MindMapBranch[];
}

/* ─── Layout engine: place branches in a grid-like vertical list to avoid all overlaps ─── */
interface PlacedBranch {
  branch: MindMapBranch;
  col: 'left' | 'right';
  row: number;
}

function computeLayout(branches: MindMapBranch[]): PlacedBranch[] {
  const placed: PlacedBranch[] = [];
  let leftRow = 0;
  let rightRow = 0;
  branches.forEach((branch, i) => {
    // Alternate left/right columns
    if (i % 2 === 0) {
      placed.push({ branch, col: 'left', row: leftRow });
      leftRow++;
    } else {
      placed.push({ branch, col: 'right', row: rightRow });
      rightRow++;
    }
  });
  return placed;
}

/* ─── Branch Card ─── */
function BranchCard({ branch, mode, aee }: { branch: MindMapBranch; mode: string; aee: boolean }) {
  const [hovered, setHovered] = useState(false);
  const isInfantil = mode === 'infantil';
  const isMedio = mode === 'medio';

  const borderColor = hovered ? branch.color : `${branch.color}66`;
  const bgGrad = aee
    ? `linear-gradient(135deg, ${branch.color}28 0%, ${branch.color}40 100%)`
    : `linear-gradient(135deg, ${branch.color}12 0%, ${branch.color}22 100%)`;

  return (
    <div
      className="rounded-xl border-2 backdrop-blur-sm transition-all duration-300 cursor-default"
      style={{
        background: bgGrad,
        borderColor,
        borderWidth: aee ? 3 : 2,
        boxShadow: hovered
          ? `0 6px 24px ${branch.color}35`
          : `0 2px 8px ${branch.color}15`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        padding: isInfantil ? '16px' : '12px 14px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Connector badge */}
      {branch.connector && !isInfantil && (
        <Badge
          variant="outline"
          className="mb-2 text-[10px] font-bold tracking-wider uppercase"
          style={{
            borderColor: `${branch.color}55`,
            color: `${branch.color}cc`,
            background: `${branch.color}10`,
          }}
        >
          {branch.connector}
        </Badge>
      )}

      {/* Header: emoji + label */}
      <div className="flex items-start gap-2">
        <span className={aee ? 'text-3xl' : isInfantil ? 'text-3xl' : 'text-xl'} style={{ lineHeight: 1 }}>
          {branch.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold leading-tight"
            style={{
              color: aee ? '#ffffff' : '#e2e8f0',
              fontSize: aee ? '15px' : isInfantil ? '14px' : '13px',
              letterSpacing: aee ? '0.5px' : undefined,
            }}
          >
            {branch.label}
          </p>
          {!isInfantil && branch.summary && (
            <p className="mt-1 leading-snug" style={{
              color: aee ? '#cbd5e1' : '#94a3b8',
              fontSize: aee ? '12px' : '11px',
              lineHeight: '1.5',
            }}>
              {branch.summary}
            </p>
          )}
        </div>
      </div>

      {/* Memory trick */}
      {branch.memory_trick && (
        <p className="mt-2 italic text-amber-400" style={{ fontSize: '10px', lineHeight: '1.4' }}>
          💡 {branch.memory_trick}
        </p>
      )}

      {/* AEE hint */}
      {aee && branch.aee_hint && (
        <p className="mt-1 font-semibold text-blue-400" style={{ fontSize: '10px' }}>
          👁 {branch.aee_hint}
        </p>
      )}

      {/* Children sub-concepts */}
      {branch.children && branch.children.length > 0 && (isMedio || mode === 'fundamental') && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {branch.children.slice(0, isMedio ? 4 : 3).map((child, ci) => (
            <div
              key={ci}
              className="rounded-md px-2 py-1 text-xs border"
              style={{
                background: `${branch.color}0a`,
                borderColor: `${branch.color}20`,
                color: aee ? '#e2e8f0' : '#cbd5e1',
              }}
            >
              {child.label}
              {child.detail && isMedio && (
                <span className="block mt-0.5" style={{ color: '#64748b', fontSize: '9px' }}>
                  {child.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cross-link */}
      {branch.cross_link && isMedio && (
        <p className="mt-1.5 text-purple-400" style={{ fontSize: '9px' }}>
          🔗 {branch.cross_link}
        </p>
      )}
    </div>
  );
}

/* ─── SVG connector lines ─── */
function ConnectorLines({
  layout,
  centerX,
  centerY,
  cardWidth,
  rowHeight,
  startY,
  aee,
  mode,
}: {
  layout: PlacedBranch[];
  centerX: number;
  centerY: number;
  cardWidth: number;
  rowHeight: number;
  startY: number;
  aee: boolean;
  mode: string;
}) {
  const gap = 24;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      <defs>
        {layout.map((item, i) => (
          <linearGradient key={`lg-${i}`} id={`mg-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={aee ? '#fbbf24' : '#6366f1'} stopOpacity="0.5" />
            <stop offset="100%" stopColor={item.branch.color} stopOpacity="0.7" />
          </linearGradient>
        ))}
      </defs>
      {layout.map((item, i) => {
        const cardY = startY + item.row * rowHeight + rowHeight / 2;
        const isLeft = item.col === 'left';
        const cardEdgeX = isLeft
          ? centerX - gap - cardWidth + cardWidth  // right edge of left card = centerX - gap
          : centerX + gap; // left edge of right card
        const endX = isLeft ? centerX - gap : centerX + gap;
        const cx1 = centerX + (isLeft ? -gap * 0.3 : gap * 0.3);
        const cy1 = centerY;
        const cx2 = endX + (isLeft ? gap * 0.3 : -gap * 0.3);
        const cy2 = cardY;

        return (
          <path
            key={i}
            d={`M ${centerX},${centerY} C ${cx1},${cy1} ${cx2},${cy2} ${endX},${cardY}`}
            stroke={`url(#mg-${i})`}
            strokeWidth={aee ? 4 : mode === 'infantil' ? 3 : 2}
            fill="none"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/* ─── Main component ─── */
export default function MindMapVisual({ data, mode, aee = false }: { data: MindMapData; mode: string; aee?: boolean }) {
  const branches = data.branches || [];
  const layout = useMemo(() => computeLayout(branches), [branches]);

  const isInfantil = mode === 'infantil';
  const cardWidth = isInfantil ? 200 : 260;
  const rowHeight = isInfantil ? 130 : mode === 'medio' ? 170 : 150;
  const gap = 24;
  const centerNodeSize = isInfantil ? 140 : 150;

  const leftCount = layout.filter(l => l.col === 'left').length;
  const rightCount = layout.filter(l => l.col === 'right').length;
  const maxRows = Math.max(leftCount, rightCount, 1);

  const totalWidth = cardWidth * 2 + centerNodeSize + gap * 4;
  const totalHeight = Math.max(maxRows * rowHeight + 40, centerNodeSize + 80);
  const centerX = totalWidth / 2;
  const centerY = totalHeight / 2;
  const startY = (totalHeight - maxRows * rowHeight) / 2;

  return (
    <div className="relative mx-auto" style={{ width: totalWidth, minHeight: totalHeight }}>
      {/* Connector lines */}
      <ConnectorLines
        layout={layout}
        centerX={centerX}
        centerY={centerY}
        cardWidth={cardWidth}
        rowHeight={rowHeight}
        startY={startY}
        aee={aee}
        mode={mode}
      />

      {/* Center node */}
      <div
        className="absolute z-20 flex flex-col items-center justify-center rounded-full"
        style={{
          width: centerNodeSize,
          height: centerNodeSize,
          left: centerX - centerNodeSize / 2,
          top: centerY - centerNodeSize / 2,
          background: aee
            ? 'radial-gradient(circle at 30% 30%, #f59e0b 0%, #d97706 60%, #92400e 100%)'
            : 'radial-gradient(circle at 30% 30%, #818cf8 0%, #4f46e5 60%, #3730a3 100%)',
          border: aee ? '4px solid #fbbf24' : '3px solid rgba(255,255,255,0.15)',
          boxShadow: aee
            ? '0 0 40px rgba(245,158,11,0.5)'
            : '0 0 40px rgba(99,102,241,0.4), inset 0 -4px 12px rgba(0,0,0,0.2)',
        }}
      >
        <span className="text-3xl">{data.center.emoji}</span>
        <span
          className="text-white font-extrabold text-center px-3 leading-tight mt-1"
          style={{
            fontSize: '12px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {data.center.label}
        </span>
      </div>

      {/* Branch cards */}
      {layout.map((item, i) => {
        const isLeft = item.col === 'left';
        const x = isLeft
          ? centerX - gap - centerNodeSize / 2 - cardWidth
          : centerX + gap + centerNodeSize / 2;
        const y = startY + item.row * rowHeight;

        return (
          <div
            key={i}
            className="absolute z-10"
            style={{
              left: x,
              top: y,
              width: cardWidth,
            }}
          >
            <BranchCard branch={item.branch} mode={mode} aee={aee} />
          </div>
        );
      })}
    </div>
  );
}
