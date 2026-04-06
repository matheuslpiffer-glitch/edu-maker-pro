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

/* ─── Color palette for branches (print-friendly, high contrast on white) ─── */
const BRANCH_PALETTE = [
  { bg: '#EEF2FF', border: '#6366F1', text: '#312E81' },
  { bg: '#FEF3C7', border: '#F59E0B', text: '#78350F' },
  { bg: '#ECFDF5', border: '#10B981', text: '#064E3B' },
  { bg: '#FFF1F2', border: '#F43F5E', text: '#881337' },
  { bg: '#F0F9FF', border: '#0EA5E9', text: '#0C4A6E' },
  { bg: '#FDF4FF', border: '#A855F7', text: '#581C87' },
  { bg: '#FFF7ED', border: '#F97316', text: '#7C2D12' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#14532D' },
];

function getPalette(i: number) {
  return BRANCH_PALETTE[i % BRANCH_PALETTE.length];
}

/* ─── Layout engine ─── */
interface PlacedBranch {
  branch: MindMapBranch;
  col: 'left' | 'right';
  row: number;
  palette: typeof BRANCH_PALETTE[number];
}

function computeLayout(branches: MindMapBranch[]): PlacedBranch[] {
  const placed: PlacedBranch[] = [];
  let leftRow = 0;
  let rightRow = 0;
  branches.forEach((branch, i) => {
    if (i % 2 === 0) {
      placed.push({ branch, col: 'left', row: leftRow, palette: getPalette(i) });
      leftRow++;
    } else {
      placed.push({ branch, col: 'right', row: rightRow, palette: getPalette(i) });
      rightRow++;
    }
  });
  return placed;
}

/* ─── Infographic Branch Card ─── */
function BranchCard({ branch, mode, aee, palette }: {
  branch: MindMapBranch; mode: string; aee: boolean;
  palette: typeof BRANCH_PALETTE[number];
}) {
  const [hovered, setHovered] = useState(false);
  const isInfantil = mode === 'infantil';
  const isMedio = mode === 'medio';

  return (
    <div
      className="rounded-xl transition-all duration-300 cursor-default"
      style={{
        background: '#FFFFFF',
        border: `2px solid ${palette.border}`,
        borderLeft: `6px solid ${palette.border}`,
        boxShadow: hovered
          ? `0 8px 24px ${palette.border}30`
          : `0 2px 8px rgba(0,0,0,0.06)`,
        transform: hovered ? 'translateY(-2px)' : 'none',
        padding: isInfantil ? '14px 16px' : '10px 14px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Connector badge */}
      {branch.connector && !isInfantil && (
        <Badge
          variant="outline"
          className="mb-2 font-bold tracking-wider"
          style={{
            borderColor: palette.border,
            color: palette.text,
            background: palette.bg,
            fontSize: '9px',
            textTransform: 'uppercase',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          {branch.connector}
        </Badge>
      )}

      {/* Header */}
      <div className="flex items-start gap-2">
        <span className={aee ? 'text-3xl' : isInfantil ? 'text-3xl' : 'text-xl'} style={{ lineHeight: 1 }}>
          {branch.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <p style={{
            color: palette.text,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: aee ? '14px' : isInfantil ? '13px' : '11pt',
            fontWeight: 700,
            textTransform: 'uppercase',
            lineHeight: '1.15',
            letterSpacing: aee ? '0.5px' : undefined,
          }}>
            {branch.label}
          </p>
          {!isInfantil && branch.summary && (
            <p style={{
              color: '#374151',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '10px',
              lineHeight: '1.4',
              marginTop: '4px',
              textTransform: 'uppercase',
            }}>
              {branch.summary}
            </p>
          )}
        </div>
      </div>

      {/* Memory trick */}
      {branch.memory_trick && (
        <p style={{
          color: '#92400E',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9px',
          fontStyle: 'italic',
          marginTop: '6px',
          lineHeight: '1.3',
        }}>
          💡 {branch.memory_trick}
        </p>
      )}

      {/* AEE hint */}
      {aee && branch.aee_hint && (
        <p style={{
          color: '#1E40AF',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '10px',
          fontWeight: 600,
          marginTop: '4px',
        }}>
          👁 {branch.aee_hint}
        </p>
      )}

      {/* Children sub-concepts */}
      {branch.children && branch.children.length > 0 && (isMedio || mode === 'fundamental') && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {branch.children.slice(0, isMedio ? 4 : 3).map((child, ci) => (
            <div
              key={ci}
              className="rounded-md px-2 py-1 border"
              style={{
                background: palette.bg,
                borderColor: `${palette.border}40`,
                color: palette.text,
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '9px',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {child.label}
              {child.detail && isMedio && (
                <span className="block mt-0.5" style={{ color: '#6B7280', fontSize: '8px', fontWeight: 400 }}>
                  {child.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cross-link */}
      {branch.cross_link && isMedio && (
        <p style={{
          color: '#7C3AED',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '9px',
          marginTop: '6px',
        }}>
          🔗 {branch.cross_link}
        </p>
      )}
    </div>
  );
}

/* ─── SVG connector lines ─── */
function ConnectorLines({
  layout, centerX, centerY, cardWidth, rowHeight, startY, aee, mode,
}: {
  layout: PlacedBranch[]; centerX: number; centerY: number;
  cardWidth: number; rowHeight: number; startY: number; aee: boolean; mode: string;
}) {
  const gap = 24;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
      {layout.map((item, i) => {
        const cardY = startY + item.row * rowHeight + rowHeight / 2;
        const isLeft = item.col === 'left';
        const endX = isLeft ? centerX - gap : centerX + gap;
        const cx1 = centerX + (isLeft ? -gap * 0.3 : gap * 0.3);
        const cx2 = endX + (isLeft ? gap * 0.3 : -gap * 0.3);

        return (
          <path
            key={i}
            d={`M ${centerX},${centerY} C ${cx1},${centerY} ${cx2},${cardY} ${endX},${cardY}`}
            stroke={item.palette.border}
            strokeWidth={aee ? 4 : mode === 'infantil' ? 3 : 2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={mode === 'infantil' ? '6 4' : 'none'}
            opacity={0.6}
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
    <div
      className="relative mx-auto infographic-mindmap"
      style={{ width: totalWidth, minHeight: totalHeight, background: '#FFFFFF' }}
    >
      {/* Connector lines */}
      <ConnectorLines
        layout={layout} centerX={centerX} centerY={centerY}
        cardWidth={cardWidth} rowHeight={rowHeight} startY={startY}
        aee={aee} mode={mode}
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
            ? '#F59E0B'
            : '#6366F1',
          border: `4px solid ${aee ? '#D97706' : '#4F46E5'}`,
          boxShadow: `0 4px 20px ${aee ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
        }}
      >
        <span className="text-3xl">{data.center.emoji}</span>
        <span style={{
          color: '#FFFFFF',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 800,
          fontSize: '11px',
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '0 10px',
          lineHeight: '1.15',
        }}>
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
          <div key={i} className="absolute z-10" style={{ left: x, top: y, width: cardWidth }}>
            <BranchCard branch={item.branch} mode={mode} aee={aee} palette={item.palette} />
          </div>
        );
      })}

      {/* Footer watermark — print only */}
      <div className="hidden print:block" style={{
        position: 'absolute',
        bottom: 4,
        right: 8,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '7pt',
        color: '#9CA3AF',
        textTransform: 'uppercase',
      }}>
        INFOGRÁFICO PEDAGÓGICO — EDUCREATOR PRO
      </div>
    </div>
  );
}
