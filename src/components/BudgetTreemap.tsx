"use client";

import { TreemapPart, TreemapSection, TreemapEntity } from "@/types";
import { useState, useMemo, useEffect } from "react";

const PART_COLORS: Record<string, { bg: string; hover: string }> = {
  "Part I": { bg: "#009edb", hover: "#007ab8" },
  "Part II": { bg: "#4a7c7e", hover: "#3d6668" },
  "Part III": { bg: "#7d8471", hover: "#666d5d" },
  "Part IV": { bg: "#9b8b7a", hover: "#7f7264" },
  "Part V": { bg: "#a0665c", hover: "#84544c" },
  "Part VI": { bg: "#6c5b7b", hover: "#594b66" },
  "Part VII": { bg: "#5a6c7d", hover: "#4a5967" },
  "Part VIII": { bg: "#495057", hover: "#3a4045" },
  "Part IX": { bg: "#969696", hover: "#7a7a7a" },
  "Part X": { bg: "#33b8e8", hover: "#009edb" },
  "Part XI": { bg: "#6a9a9c", hover: "#4a7c7e" },
  "Part XII": { bg: "#9aa390", hover: "#7d8471" },
  "Part XIII": { bg: "#b8a899", hover: "#9b8b7a" },
  "Part XIV": { bg: "#c08579", hover: "#a0665c" },
};

const getNumeral = (partKey: string) => partKey.replace("Part ", "");

const PART_SHORT_NAMES: Record<string, string> = {
  "Part I": "Policymaking & Coordination",
  "Part II": "Political Affairs",
  "Part III": "Justice & Law",
  "Part IV": "International Development",
  "Part V": "Regional Development",
  "Part VI": "Human Rights & Humanitarian",
  "Part VII": "Global Communications",
  "Part VIII": "Support Services",
  "Part IX": "Internal Oversight",
  "Part X": "Joint Activities & Special",
  "Part XI": "Capital Expenditure",
  "Part XII": "Safety & Security",
  "Part XIII": "Development Account",
  "Part XIV": "Staff Assessment",
};

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PART_GAP = 2;

// Format variance with arrow
const formatVariance = (value: number | null): string => {
  if (value === null || value === undefined) return "";
  const arrow = value > 0 ? "↗" : value < 0 ? "↘" : "→";
  return `${arrow}${Math.abs(value).toFixed(1)}%`;
};

// Simple squarify
function squarify<T>(
  items: { value: number; data: T }[],
  x: number,
  y: number,
  width: number,
  height: number,
): (Rect & { data: T })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  return slice(normalized, x, y, width, height);
}

function slice<T>(
  items: { value: number; data: T; normalizedValue: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
): (Rect & { data: T })[] {
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
  const leftSum = leftItems.reduce(
    (sum, item) => sum + item.normalizedValue,
    0,
  );

  if (width >= height) {
    const leftWidth = width * (leftSum / total);
    return [
      ...slice(leftItems, x, y, leftWidth, height),
      ...slice(rightItems, x + leftWidth, y, width - leftWidth, height),
    ];
  } else {
    const leftHeight = height * (leftSum / total);
    return [
      ...slice(leftItems, x, y, width, leftHeight),
      ...slice(rightItems, x, y + leftHeight, width, height - leftHeight),
    ];
  }
}

interface BudgetTreemapProps {
  parts: TreemapPart[];
  onEntityClick: (entity: TreemapEntity) => void;
}

export default function BudgetTreemap({
  parts,
  onEntityClick,
}: BudgetTreemapProps) {
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    entity: TreemapEntity;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [treemapHeight, setTreemapHeight] = useState(1200);

  const totalBudget = useMemo(
    () => parts.reduce((sum, p) => sum + p.totalBudget, 0),
    [parts],
  );

  // Single effect to handle all client-side initialization
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const mobile = width < 640;
      setIsMobile(mobile);
      
      let height;
      if (width < 640) {
        // Mobile: use a more reasonable multiplier
        height = 3000;
      } else if (width < 1024) {
        height = 1600;
      } else {
        height = 1200;
      }
      
      console.log('🔍 Treemap layout update:', { width, mobile, height, parts: parts.length });
      setTreemapHeight(height);
    };
    
    updateLayout();
    setMounted(true);
    
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [parts.length]);

  const formatBudget = (amount: number): string => {
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    } else if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const handleMouseMove = (e: React.MouseEvent, entity: TreemapEntity) => {
    if (!isMobile) {
      setTooltip({ x: e.clientX, y: e.clientY, entity });
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setHoveredEntity(null);
      setTooltip(null);
    }
  };

  const handleClick = (entity: TreemapEntity) => {
    if (isMobile) {
      // Toggle tooltip on mobile
      if (tooltip?.entity.id === entity.id) {
        setTooltip(null);
        setHoveredEntity(null);
      } else {
        setTooltip({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          entity,
        });
        setHoveredEntity(entity.id);
      }
    } else {
      // Open modal on desktop
      onEntityClick(entity);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[1200px] bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-un-blue border-r-transparent mb-2"></div>
          <p className="text-sm text-gray-600">Loading treemap...</p>
        </div>
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${treemapHeight}px` }}>
        <p className="text-lg text-gray-500">No budget data available</p>
      </div>
    );
  }

  // Calculate part heights with gaps
  const partGapPercent = (PART_GAP / treemapHeight) * 100;
  const partHeights: { part: TreemapPart; startY: number; height: number }[] = [];
  let currentY = 0;
  parts.forEach((part, i) => {
    const partHeight = (part.totalBudget / totalBudget) * 100;
    partHeights.push({ part, startY: currentY, height: partHeight });
    currentY += partHeight + (i < parts.length - 1 ? partGapPercent : 0);
  });

  // Responsive thresholds for label display - with expanded mobile height, we can be more generous
  const getThresholds = () => {
    if (typeof window === 'undefined') return { showAbbr: 15, showBudget: 20, minHeight: 20 };
    const width = window.innerWidth;
    // With 3x height on mobile, boxes are bigger so we can use lower % thresholds
    if (width < 640) return { showAbbr: 1.5, showBudget: 5, minHeight: 4 };
    if (width < 1024) return { showAbbr: 6, showBudget: 12, minHeight: 12 };
    return { showAbbr: 15, showBudget: 20, minHeight: 20 };
  };

  const thresholds = getThresholds();

  return (
    <div className="flex flex-col gap-2 lg:flex-row">
      {/* Mobile legend - always at top on small screens */}
      <div className="block sm:hidden space-y-2 px-2 py-3 bg-gray-50 rounded">
        <div className="text-xs font-medium text-gray-700">Budget Sections</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {partHeights.map(({ part }) => {
            const colors = PART_COLORS[part.part] || PART_COLORS["Part I"];
            const numeral = getNumeral(part.part);
            const name = PART_SHORT_NAMES[part.part] || part.partName;
            return (
              <div key={`mobile-${part.part}`} className="flex items-center gap-1.5">
                <div
                  className="h-3 w-3 rounded shrink-0"
                  style={{ backgroundColor: colors.bg }}
                />
                <span className="text-xs" style={{ color: colors.bg }}>
                  {numeral}. {name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Treemap */}
      <div
        className="relative w-full lg:flex-1 bg-gray-100 rounded overflow-hidden"
        style={{ height: `${treemapHeight}px` }}
      >
        {partHeights.map(({ part, startY, height }) => {
          const colors = PART_COLORS[part.part] || PART_COLORS["Part I"];
          const sections = part.sections.filter((s) => s.entities.length > 0);

          if (sections.length === 0) return null;

          const sectionItems = sections.map((s) => ({
            value: s.totalBudget,
            data: s,
          }));
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
                const entityItems = section.entities
                  .sort((a, b) => b.budget - a.budget)
                  .map((e) => ({ value: e.budget, data: e }));
                const entityRects = squarify<TreemapEntity>(entityItems, 0, 0, 100, 100);

                return (
                  <div
                    key={`${section.section}-${si}`}
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
                      const canShowLabel = rect.width > thresholds.showAbbr && rect.height > thresholds.minHeight;
                      const canShowBudget = rect.width > thresholds.showBudget;
                      const displayText = rect.data.abbreviation || rect.data.name;

                      return (
                        <div
                          key={`${rect.data.id}-${i}`}
                          className="absolute cursor-pointer border border-white/30 transition-all duration-150 hover:z-10"
                          style={{
                            left: `${rect.x}%`,
                            top: `${rect.y}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                            backgroundColor: isHovered ? colors.hover : colors.bg,
                          }}
                          onClick={() => handleClick(rect.data)}
                          onMouseEnter={() => !isMobile && setHoveredEntity(rect.data.id)}
                          onMouseMove={(e) => !isMobile && handleMouseMove(e, rect.data)}
                          onMouseLeave={handleMouseLeave}
                        >
                          {canShowLabel && (
                            <div className="h-full w-full overflow-hidden p-1.5 sm:p-2 flex flex-col justify-start items-start">
                              <div className="text-xs sm:text-sm leading-snug font-semibold text-white truncate w-full text-left">
                                {displayText}
                              </div>
                              {canShowBudget && (
                                <div className="text-[11px] sm:text-xs leading-snug text-white/95 truncate w-full text-left mt-1">
                                  {formatBudget(rect.data.budget)}{" "}
                                  {formatVariance(
                                    rect.data.budgetItem[
                                      "Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)"
                                    ],
                                  )}
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

      {/* Desktop labels */}
      <div
        className="relative w-60 shrink-0 hidden lg:block"
        style={{ height: `${treemapHeight}px` }}
      >
        {partHeights.map(({ part, startY }) => {
          const colors = PART_COLORS[part.part] || PART_COLORS["Part I"];
          const isCompact = [
            "Part IX", "Part X", "Part XI", "Part XII", "Part XIII", "Part XIV",
          ].includes(part.part);
          const numeral = getNumeral(part.part);
          const name = PART_SHORT_NAMES[part.part] || part.partName;

          return isCompact ? (
            <div
              key={`label-${part.part}`}
              className="absolute left-0 flex text-xs whitespace-nowrap"
              style={{ top: `${startY}%`, color: colors.bg }}
            >
              <span className="w-6 font-medium">{numeral}.</span>
              <span className="font-medium">{name}</span>
              <span className="ml-3">
                {formatBudget(part.totalBudget)} {formatVariance(part.varianceVs2025)}
              </span>
            </div>
          ) : (
            <div
              key={`label-${part.part}`}
              className="absolute left-0 flex text-xs leading-tight"
              style={{ top: `${startY}%`, color: colors.bg }}
            >
              <span className="w-6 font-medium">{numeral}.</span>
              <div>
                <div className="font-medium">{name}</div>
                <div className="mt-0.5">
                  {formatBudget(part.totalBudget)} {formatVariance(part.varianceVs2025)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile tooltip */}
      {tooltip && isMobile && (
        <div className="fixed inset-x-4 bottom-4 z-50 rounded-lg border border-gray-200 bg-white p-4 shadow-2xl">
          <button
            onClick={() => {
              setTooltip(null);
              setHoveredEntity(null);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="pr-8">
            <p className="text-sm font-medium text-gray-900 leading-tight">
              {tooltip.entity.entityName || tooltip.entity.name}
            </p>
            {tooltip.entity.abbreviation && (
              <p className="text-xs text-gray-600 mt-0.5">{tooltip.entity.abbreviation}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">{tooltip.entity.partName}</p>
            <p className="text-xs text-gray-500">
              Section {tooltip.entity.section}: {tooltip.entity.sectionName}
            </p>
            <p className="text-sm font-medium text-gray-900 mt-2">
              {formatBudget(tooltip.entity.budget)}
            </p>
            <button
              onClick={() => onEntityClick(tooltip.entity)}
              className="mt-3 w-full py-2 px-4 bg-un-blue text-white text-sm font-medium rounded hover:bg-un-blue/90"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Desktop tooltip */}
      {tooltip && !isMobile && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: Math.min(tooltip.x + 12, window.innerWidth - 320),
            top: Math.min(tooltip.y + 12, window.innerHeight - 200),
          }}
        >
          <p className="text-sm font-medium text-gray-900 leading-tight">
            {tooltip.entity.entityName || tooltip.entity.name}
          </p>
          {tooltip.entity.abbreviation && (
            <p className="text-xs text-gray-600 mt-0.5">{tooltip.entity.abbreviation}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">{tooltip.entity.partName}</p>
          <p className="text-xs text-gray-500">
            Section {tooltip.entity.section}: {tooltip.entity.sectionName}
          </p>
          <p className="text-xs font-medium text-gray-700 mt-1">
            {formatBudget(tooltip.entity.budget)}
          </p>
        </div>
      )}
    </div>
  );
}
