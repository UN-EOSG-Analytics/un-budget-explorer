'use client';

import { TreemapPart, TreemapSection, TreemapEntity } from '@/types';
import { useState, useMemo } from 'react';

const PART_COLORS: Record<string, { bg: string; hover: string }> = {
  'Part I': { bg: '#009edb', hover: '#007ab8' },
  'Part II': { bg: '#4a7c7e', hover: '#3d6668' },
  'Part III': { bg: '#7d8471', hover: '#666d5d' },
  'Part IV': { bg: '#9b8b7a', hover: '#7f7264' },
  'Part V': { bg: '#a0665c', hover: '#84544c' },
  'Part VI': { bg: '#6c5b7b', hover: '#594b66' },
  'Part VII': { bg: '#5a6c7d', hover: '#4a5967' },
  'Part VIII': { bg: '#495057', hover: '#3a4045' },
  'Part IX': { bg: '#969696', hover: '#7a7a7a' },
  'Part X': { bg: '#33b8e8', hover: '#009edb' },
  'Part XI': { bg: '#6a9a9c', hover: '#4a7c7e' },
  'Part XII': { bg: '#9aa390', hover: '#7d8471' },
  'Part XIII': { bg: '#b8a899', hover: '#9b8b7a' },
  'Part XIV': { bg: '#c08579', hover: '#a0665c' },
};

const getNumeral = (partKey: string) => partKey.replace('Part ', '');

const PART_SHORT_NAMES: Record<string, string> = {
  'Part I': 'Policymaking & Coordination',
  'Part II': 'Political Affairs',
  'Part III': 'Justice & Law',
  'Part IV': 'International Development',
  'Part V': 'Regional Development',
  'Part VI': 'Human Rights & Humanitarian',
  'Part VII': 'Global Communications',
  'Part VIII': 'Support Services',
  'Part IX': 'Internal Oversight',
  'Part X': 'Joint Activities & Special',
  'Part XI': 'Capital Expenditure',
  'Part XII': 'Safety & Security',
  'Part XIII': 'Development Account',
  'Part XIV': 'Staff Assessment',
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PART_GAP = 2;       // Gap between parts in pixels
const TREEMAP_HEIGHT = 1200;

// Format variance with arrow
const formatVariance = (value: number | null): string => {
  if (value === null || value === undefined) return '';
  const arrow = value > 0 ? '↗' : value < 0 ? '↘' : '→';
  return `${arrow}${Math.abs(value).toFixed(1)}%`;
};

// Simple squarify without gap handling - gaps applied via CSS
function squarify<T>(items: { value: number; data: T }[], x: number, y: number, width: number, height: number): (Rect & { data: T })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map(item => ({
    ...item,
    normalizedValue: (item.value / total) * width * height
  }));

  return slice(normalized, x, y, width, height);
}

function slice<T>(items: { value: number; data: T; normalizedValue: number }[], x: number, y: number, width: number, height: number): (Rect & { data: T })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }];
  }

  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);
  
  let sum = 0;
  let splitIndex = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].normalizedValue;
    if (sum >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  splitIndex = Math.max(1, Math.min(splitIndex, items.length - 1));

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);
  const leftSum = leftItems.reduce((sum, item) => sum + item.normalizedValue, 0);

  if (width >= height) {
    const leftWidth = width * (leftSum / total);
    return [
      ...slice(leftItems, x, y, leftWidth, height),
      ...slice(rightItems, x + leftWidth, y, width - leftWidth, height)
    ];
  } else {
    const leftHeight = height * (leftSum / total);
    return [
      ...slice(leftItems, x, y, width, leftHeight),
      ...slice(rightItems, x, y + leftHeight, width, height - leftHeight)
    ];
  }
}

interface BudgetTreemapProps {
  parts: TreemapPart[];
  onEntityClick: (entity: TreemapEntity) => void;
}

export default function BudgetTreemap({ parts, onEntityClick }: BudgetTreemapProps) {
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; entity: TreemapEntity } | null>(null);

  const totalBudget = useMemo(() => parts.reduce((sum, p) => sum + p.totalBudget, 0), [parts]);

  const formatBudget = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const handleMouseMove = (e: React.MouseEvent, entity: TreemapEntity) => {
    setTooltip({ x: e.clientX, y: e.clientY, entity });
  };

  const handleMouseLeave = () => {
    setHoveredEntity(null);
    setTooltip(null);
  };

  if (parts.length === 0) {
    return (
      <div className="h-[1200px] flex items-center justify-center">
        <p className="text-gray-500 text-lg">No budget data available</p>
      </div>
    );
  }

  // Calculate part heights with gaps
  const partGapPercent = (PART_GAP / TREEMAP_HEIGHT) * 100;
  const partHeights: { part: TreemapPart; startY: number; height: number }[] = [];
  let currentY = 0;
  parts.forEach((part, i) => {
    const partHeight = (part.totalBudget / totalBudget) * 100;
    partHeights.push({ part, startY: currentY, height: partHeight });
    currentY += partHeight + (i < parts.length - 1 ? partGapPercent : 0);
  });

  return (
    <div className="flex gap-2">
      {/* Treemap */}
      <div className="relative bg-gray-100 flex-1" style={{ height: `${TREEMAP_HEIGHT}px` }}>
        {partHeights.map(({ part, startY, height }) => {
          const colors = PART_COLORS[part.part] || PART_COLORS['Part I'];
          const sections = part.sections.filter(s => s.entities.length > 0);
          
          if (sections.length === 0) return null;

          // Layout sections within the part (no gaps in algorithm)
          const sectionItems = sections.map(s => ({ value: s.totalBudget, data: s }));
          const sectionRects = squarify<TreemapSection>(sectionItems, 0, 0, 100, 100);

          return (
            <div
              key={part.part}
              className="absolute left-0 right-0"
              style={{
                top: `${startY}%`,
                height: `${height}%`,
              }}
            >
              {sectionRects.map((sectionRect, si) => {
                const section = sectionRect.data;
                
                // Layout entities within this section (no gaps in algorithm)
                const entityItems = section.entities
                  .sort((a, b) => b.budget - a.budget)
                  .map(e => ({ value: e.budget, data: e }));
                
                const entityRects = squarify<TreemapEntity>(entityItems, 0, 0, 100, 100);

                return (
                  <div
                    key={`section-${section.section}-${si}`}
                    className="absolute"
                    style={{
                      left: `${sectionRect.x}%`,
                      top: `${sectionRect.y}%`,
                      width: `${sectionRect.width}%`,
                      height: `${sectionRect.height}%`,
                    }}
                  >
                    {entityRects.map((rect, i) => {
                      const isHovered = hoveredEntity === rect.data.id;
                      const showLabel = rect.width > 15 && rect.height > 20;
                      const showBudget = rect.width > 20 && rect.height > 28;

                      return (
                        <div
                          key={`${rect.data.id}-${i}`}
                          className="absolute cursor-pointer transition-colors duration-100 box-border border border-gray-100"
                          style={{
                            left: `${rect.x}%`,
                            top: `${rect.y}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                            backgroundColor: isHovered ? colors.hover : colors.bg,
                          }}
                          onClick={() => onEntityClick(rect.data)}
                          onMouseEnter={() => setHoveredEntity(rect.data.id)}
                          onMouseMove={(e) => handleMouseMove(e, rect.data)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {showLabel && (
                            <div className="p-2 h-full overflow-hidden">
                              <div className="text-xs font-medium leading-tight truncate text-white">
                                {rect.data.abbreviation || rect.data.name}
                              </div>
                              {showBudget && (
                                <div className="text-xs text-white/80 leading-tight truncate mt-0.5">
                                  {formatBudget(rect.data.budget)} {formatVariance(rect.data.budgetItem['Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)'])}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Part Labels */}
      <div className="w-60 flex-shrink-0 relative" style={{ height: `${TREEMAP_HEIGHT}px` }}>
        {partHeights.map(({ part, startY }) => {
          const colors = PART_COLORS[part.part] || PART_COLORS['Part I'];
          const isCompact = ['Part IX', 'Part X', 'Part XI', 'Part XII', 'Part XIII', 'Part XIV'].includes(part.part);
          const numeral = getNumeral(part.part);
          const name = PART_SHORT_NAMES[part.part] || part.partName;
          
          return isCompact ? (
            <div
              key={`label-${part.part}`}
              className="absolute left-0 text-xs whitespace-nowrap flex"
              style={{ top: `${startY}%`, color: colors.bg }}
            >
              <span className="w-6 font-medium">{numeral}.</span>
              <span className="font-medium">{name}</span>
              <span className="ml-3">{formatBudget(part.totalBudget)} {formatVariance(part.varianceVs2025)}</span>
            </div>
          ) : (
            <div
              key={`label-${part.part}`}
              className="absolute left-0 text-xs leading-tight flex"
              style={{ top: `${startY}%`, color: colors.bg }}
            >
              <span className="w-6 font-medium">{numeral}.</span>
              <div>
                <div className="font-medium">{name}</div>
                <div className="mt-0.5">{formatBudget(part.totalBudget)} {formatVariance(part.varianceVs2025)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 max-w-xs"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y + 12,
          }}
        >
          <p className="font-medium text-sm text-gray-900 leading-tight">{tooltip.entity.entityName || tooltip.entity.name}</p>
          {tooltip.entity.abbreviation && (
            <p className="text-xs text-gray-500">{tooltip.entity.abbreviation}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{tooltip.entity.partName}</p>
          <p className="text-xs text-gray-600">
            Section {tooltip.entity.section}: {tooltip.entity.sectionName}
          </p>
          <p className="text-xs font-medium text-gray-700 mt-1">{formatBudget(tooltip.entity.budget)}</p>
        </div>
      )}
    </div>
  );
}
