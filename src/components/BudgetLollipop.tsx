'use client';

import { BudgetItem, TreemapEntity } from '@/types';
import { useState } from 'react';

interface LollipopRow {
  id: string;
  label: string;
  level: number;
  approved2025: number;
  proposed2026: number;
  revised2026: number;
  partKey: string;
  partNumber: string;
  sectionKey?: string;
  hasChildren: boolean;
  budgetItem: BudgetItem;
}

interface BudgetLollipopProps {
  budgetData: BudgetItem[];
  onEntityClick?: (entity: TreemapEntity) => void;
}

const PART_ORDER = ['Part I', 'Part II', 'Part III', 'Part IV', 'Part V', 'Part VI', 'Part VII', 'Part VIII', 'Part IX', 'Part X', 'Part XI', 'Part XII', 'Part XIII', 'Part XIV'];

const formatMoney = (val: number): string => {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

const formatPercent = (val: number): string => {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`;
};

// Get arrow for variance
const getVarianceArrow = (value: number | null): string => {
  if (value === null || value === undefined) return '';
  return value > 0 ? '↗' : value < 0 ? '↘' : '→';
};

// Format just the percentage (no arrow)
const formatVarianceNum = (value: number | null): string => {
  if (value === null || value === undefined) return '';
  return `${Math.abs(value).toFixed(1)}%`;
};

const PART_NUMBERS: Record<string, string> = {
  'Part I': 'I', 'Part II': 'II', 'Part III': 'III', 'Part IV': 'IV',
  'Part V': 'V', 'Part VI': 'VI', 'Part VII': 'VII', 'Part VIII': 'VIII',
  'Part IX': 'IX', 'Part X': 'X', 'Part XI': 'XI', 'Part XII': 'XII',
  'Part XIII': 'XIII', 'Part XIV': 'XIV',
};

// Generate nice round tick values
const generateTicks = (maxValue: number): number[] => {
  const targets = [100_000_000, 250_000_000, 500_000_000, 750_000_000, 1_000_000_000];
  const ticks = [0];
  for (const t of targets) {
    if (t <= maxValue) ticks.push(t);
  }
  if (ticks[ticks.length - 1] < maxValue * 0.9) {
    ticks.push(Math.ceil(maxValue / 100_000_000) * 100_000_000);
  }
  return ticks;
};

export default function BudgetLollipop({ budgetData, onEntityClick }: BudgetLollipopProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{ x: number; y: number; row: LollipopRow } | null>(null);

  // Build maps
  const partTotals = new Map<string, BudgetItem>();
  const sectionTotals = new Map<string, BudgetItem>();
  const entities = new Map<string, BudgetItem[]>();
  const sectionsPerPart = new Map<string, string[]>();

  budgetData.forEach(b => {
    if (b.row_type === 'part_total') partTotals.set(b.Part, b);
    if (b.row_type === 'section_total') {
      sectionTotals.set(`${b.Part}-${b.Section}`, b);
      if (!sectionsPerPart.has(b.Part)) sectionsPerPart.set(b.Part, []);
      sectionsPerPart.get(b.Part)!.push(b.Section || '');
    }
    if (b.row_type === 'entity_total') {
      const key = `${b.Part}-${b.Section}`;
      if (!entities.has(key)) entities.set(key, []);
      entities.get(key)!.push(b);
    }
  });

  // Build rows
  const rows: LollipopRow[] = [];

  PART_ORDER.forEach(partKey => {
    const partData = partTotals.get(partKey);
    if (!partData) return;

    const partSections = sectionsPerPart.get(partKey) || [];
    const partNum = PART_NUMBERS[partKey] || '';
    rows.push({
      id: partKey,
      label: `${partNum}. ${partData['Part name']}`,
      level: 0,
      approved2025: partData['2025 approved'] || 0,
      proposed2026: partData['2026 proposed programme budget'] || 0,
      revised2026: partData['2026 revised estimate'] || 0,
      partKey,
      partNumber: partNum,
      hasChildren: partSections.length > 0,
      budgetItem: partData,
    });

    if (expanded.has(partKey)) {
      const sectionsForPart: BudgetItem[] = [];
      sectionTotals.forEach((s, key) => {
        if (key.startsWith(partKey + '-')) sectionsForPart.push(s);
      });
      sectionsForPart.sort((a, b) => (a.Section || '').localeCompare(b.Section || ''));

      sectionsForPart.forEach(sectionData => {
        const sectionKey = `${partKey}-${sectionData.Section}`;
        const sectionEntities = entities.get(sectionKey) || [];
        
        rows.push({
          id: sectionKey,
          label: `${sectionData.Section}. ${sectionData['Section name']}`,
          level: 1,
          approved2025: sectionData['2025 approved'] || 0,
          proposed2026: sectionData['2026 proposed programme budget'] || 0,
          revised2026: sectionData['2026 revised estimate'] || 0,
          partKey,
          partNumber: partNum,
          sectionKey: sectionData.Section || undefined,
          hasChildren: sectionEntities.length > 0,
          budgetItem: sectionData,
        });

        if (expanded.has(sectionKey)) {
          sectionEntities.sort((a, b) => (b['2026 revised estimate'] || 0) - (a['2026 revised estimate'] || 0));

          sectionEntities.forEach(entityData => {
            rows.push({
              id: `${sectionKey}-${entityData['Entity name']}`,
              label: entityData['Entity name'] || 'Unknown',
              level: 2,
              approved2025: entityData['2025 approved'] || 0,
              proposed2026: entityData['2026 proposed programme budget'] || 0,
              revised2026: entityData['2026 revised estimate'] || 0,
              partKey,
              partNumber: partNum,
              sectionKey: sectionData.Section || undefined,
              hasChildren: false,
              budgetItem: entityData,
            });
          });
        }
      });
    }
  });

  const maxValue = Math.max(...rows.map(r => Math.max(r.approved2025, r.proposed2026, r.revised2026)));
  const ticks = generateTicks(maxValue);
  const scaleMax = ticks[ticks.length - 1];
  const scale = (val: number) => (val / scaleMax) * 100;

  const toggleExpand = (id: string, hasChildren: boolean) => {
    if (!hasChildren) return;
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRowClick = (row: LollipopRow) => {
    if (row.hasChildren) {
      toggleExpand(row.id, true);
    } else if (onEntityClick && (row.level === 1 || row.level === 2)) {
      const b = row.budgetItem;
      const entity: TreemapEntity = {
        id: row.id,
        name: b['Entity name'] || b['Section name'] || 'Unknown',
        part: row.partKey,
        partName: b['Part name'],
        section: row.sectionKey || '',
        sectionName: b['Section name'] || '',
        budget: row.revised2026,
        budgetItem: b,
      };
      onEntityClick(entity);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, row: LollipopRow) => {
    setTooltip({ x: e.clientX, y: e.clientY, row });
  };

  const ROW_HEIGHT = 28;
  const LABEL_WIDTH = 300;
  const VARIANCE_WIDTH = 70;

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Comparison: Revised Estimates 2026 vs Approved 2025</h2>
      <p className="text-sm text-gray-600 mb-6">Click on parts or sections to expand breakdown. Hover for details.</p>
      
      <div className="relative">
        {/* Header with ticks */}
        <div className="flex items-center text-xs text-gray-500 mb-2 border-b pb-2">
          <div style={{ width: LABEL_WIDTH }} className="flex-shrink-0" />
          <div style={{ width: VARIANCE_WIDTH }} className="flex-shrink-0 text-center">Δ 2025</div>
          <div className="flex-1 relative h-4">
            {ticks.map(tick => (
              <span
                key={tick}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${scale(tick)}%` }}
              >
                {formatMoney(tick)}
              </span>
            ))}
          </div>
        </div>

        {/* Rows */}
        {rows.map(row => {
          const indent = row.level * 20;
          const isExpanded = expanded.has(row.id);
          const minX = Math.min(row.approved2025, row.revised2026);
          const maxX = Math.max(row.approved2025, row.revised2026);
          const variance = row.approved2025 > 0 ? ((row.revised2026 - row.approved2025) / row.approved2025) * 100 : null;
          const isClickable = row.hasChildren || row.level > 0;

          return (
            <div
              key={row.id}
              className={`flex items-center ${isClickable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              style={{ height: ROW_HEIGHT }}
              onMouseMove={(e) => handleMouseMove(e, row)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleRowClick(row)}
            >
              {/* Label */}
              <div
                className={`flex-shrink-0 truncate text-xs pr-2 ${isClickable ? 'hover:text-un-blue' : ''} ${row.level === 0 ? 'font-medium' : ''}`}
                style={{ width: LABEL_WIDTH, paddingLeft: indent + 8 }}
              >
                {row.hasChildren ? (
                  <span className="inline-block w-4 text-gray-400">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                ) : (
                  <span className="inline-block w-4" />
                )}
                {row.label}
              </div>

              {/* Variance column - arrow and percentage in separate columns */}
              <div className="flex-shrink-0 flex text-xs text-gray-900" style={{ width: VARIANCE_WIDTH }}>
                <span className="w-4 text-center">{getVarianceArrow(variance)}</span>
                <span className="flex-1 text-right pr-2">{formatVarianceNum(variance)}</span>
              </div>

              {/* Chart area */}
              <div className="flex-1 relative h-full">
                {/* Tick lines */}
                {ticks.map(tick => (
                  <div
                    key={tick}
                    className="absolute top-0 bottom-0 w-px bg-gray-100"
                    style={{ left: `${scale(tick)}%` }}
                  />
                ))}

                {/* Connecting line */}
                <div
                  className="absolute top-1/2 h-0.5 bg-gray-300"
                  style={{
                    left: `${scale(minX)}%`,
                    width: `${scale(maxX) - scale(minX)}%`,
                    transform: 'translateY(-50%)',
                  }}
                />

                {/* 2026 proposed (small dot) */}
                <div
                  className="absolute top-1/2 w-2 h-2 rounded-full bg-un-blue/50 border border-white"
                  style={{
                    left: `${scale(row.proposed2026)}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />

                {/* 2025 approved (large dot) */}
                <div
                  className="absolute top-1/2 w-3 h-3 rounded-full bg-gray-600 border-2 border-white shadow"
                  style={{
                    left: `${scale(row.approved2025)}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />

                {/* 2026 revised (large dot, UN blue) */}
                <div
                  className="absolute top-1/2 w-3 h-3 rounded-full bg-un-blue border-2 border-white shadow"
                  style={{
                    left: `${scale(row.revised2026)}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-600 border-2 border-white shadow" />
            <span>2025 Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-un-blue/50" />
            <span>2026 Proposed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-un-blue border-2 border-white shadow" />
            <span>2026 Revised</span>
          </div>
        </div>
      </div>

      {/* Tooltip with SVG budget flow (DRY - same style as EntityModal) */}
      {tooltip && (() => {
        const varianceVs2025 = tooltip.row.approved2025 > 0 
          ? ((tooltip.row.revised2026 - tooltip.row.approved2025) / tooltip.row.approved2025) * 100 
          : null;
        const varianceVsProposed = tooltip.row.proposed2026 > 0 
          ? ((tooltip.row.revised2026 - tooltip.row.proposed2026) / tooltip.row.proposed2026) * 100 
          : null;
        return (
          <div
            className="fixed z-50 pointer-events-none bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-3 text-sm w-72"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <p className="font-medium text-gray-900 mb-3">{tooltip.row.label}</p>
            
            {/* Three boxes in a row */}
            <div className="flex items-center gap-1 text-center">
              <div className="bg-gray-100 rounded px-2 py-1 flex-1">
                <p className="text-[10px] text-gray-500">2025</p>
                <p className="text-xs font-semibold text-gray-900">{formatMoney(tooltip.row.approved2025)}</p>
              </div>
              <span className="text-gray-400 text-xs">→</span>
              <div className="bg-gray-100 rounded px-2 py-1 flex-1">
                <p className="text-[10px] text-gray-500">Proposed</p>
                <p className="text-xs font-semibold text-gray-900">{formatMoney(tooltip.row.proposed2026)}</p>
              </div>
              <span className="text-gray-400 text-xs">→</span>
              <div className="bg-un-blue/10 rounded px-2 py-1 flex-1 border border-un-blue/20">
                <p className="text-[10px] text-un-blue">Revised</p>
                <p className="text-xs font-bold text-un-blue">{formatMoney(tooltip.row.revised2026)}</p>
              </div>
            </div>

            {/* Variance arrows using SVG */}
            <div className="relative h-10 mt-1">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <marker id="arrow-lollipop" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
                  </marker>
                </defs>
                {/* Line 1: 2025 approved → 2026 revised */}
                <line x1="16.67%" y1="30%" x2="83.33%" y2="30%" stroke="#d1d5db" strokeWidth="1" markerEnd="url(#arrow-lollipop)" />
                {/* Line 2: 2026 proposed → 2026 revised */}
                <line x1="50%" y1="70%" x2="83.33%" y2="70%" stroke="#d1d5db" strokeWidth="1" markerEnd="url(#arrow-lollipop)" />
                {/* Start dots */}
                <circle cx="16.67%" cy="30%" r="2" fill="#9ca3af" />
                <circle cx="50%" cy="70%" r="2" fill="#9ca3af" />
              </svg>
              {/* Variance badges */}
              <div className="absolute inset-0 flex flex-col justify-around pointer-events-none text-[10px]">
                <div className="flex justify-center" style={{ paddingLeft: '16.67%', paddingRight: '16.67%' }}>
                  <span className="bg-gray-100 text-gray-700 px-1 rounded">{formatPercent(varianceVs2025 ?? 0)}</span>
                </div>
                <div className="flex justify-center" style={{ paddingLeft: '50%', paddingRight: '16.67%' }}>
                  <span className="bg-gray-100 text-gray-700 px-1 rounded">{formatPercent(varianceVsProposed ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
