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

// Simple squarify with mobile optimization
function squarify<T>(
  items: { value: number; data: T }[],
  x: number,
  y: number,
  width: number,
  height: number,
  forceMobileLayout: boolean = false,
): (Rect & { data: T })[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0 || items.length === 0) return [];

  const normalized = items.map((item) => ({
    ...item,
    normalizedValue: (item.value / total) * width * height,
  }));

  return slice(normalized, x, y, width, height, forceMobileLayout);
}

function slice<T>(
  items: { value: number; data: T; normalizedValue: number }[],
  x: number,
  y: number,
  width: number,
  height: number,
  forceMobileLayout: boolean = false,
): (Rect & { data: T })[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ x, y, width, height, data: items[0].data }];
  }

  const total = items.reduce((sum, item) => sum + item.normalizedValue, 0);

  // Mobile layout: group small items horizontally in rows
  if (forceMobileLayout && items.length >= 3) {
    // Find optimal number of items per row (2-4 items)
    // Prefer fewer items per row if they're similar sizes
    let bestRowSize = 2;

    // If items are relatively uniform, use more items per row
    const maxItem = Math.max(...items.map((i) => i.normalizedValue));
    const minItem = Math.min(...items.map((i) => i.normalizedValue));
    const uniformity = minItem / maxItem;

    if (uniformity > 0.5 && items.length >= 4) {
      bestRowSize = 3;
    } else if (uniformity > 0.7 && items.length >= 6) {
      bestRowSize = 4;
    }

    // Create rows
    const rows: (typeof items)[] = [];
    let currentRow: typeof items = [];
    let currentRowSum = 0;
    const targetRowSum = total / Math.ceil(items.length / bestRowSize);

    for (let i = 0; i < items.length; i++) {
      currentRow.push(items[i]);
      currentRowSum += items[i].normalizedValue;

      const shouldEndRow =
        currentRow.length >= bestRowSize ||
        i === items.length - 1 ||
        (currentRowSum >= targetRowSum * 0.8 && currentRow.length >= 2);

      if (shouldEndRow) {
        rows.push([...currentRow]);
        currentRow = [];
        currentRowSum = 0;
      }
    }

    if (rows.length > 1) {
      let currentY = y;
      const results: (Rect & { data: T })[] = [];

      rows.forEach((row) => {
        const rowSum = row.reduce((sum, item) => sum + item.normalizedValue, 0);
        const rowHeight = height * (rowSum / total);

        // Layout items horizontally in this row
        let currentX = x;
        row.forEach((item) => {
          const itemWidth = width * (item.normalizedValue / rowSum);
          results.push({
            x: currentX,
            y: currentY,
            width: itemWidth,
            height: rowHeight,
            data: item.data,
          });
          currentX += itemWidth;
        });

        currentY += rowHeight;
      });

      return results;
    }
  }

  // Standard binary split
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

  // Mobile layout: prefer vertical stacking (horizontal slices)
  if (forceMobileLayout) {
    const leftHeight = height * (leftSum / total);
    return [
      ...slice(leftItems, x, y, width, leftHeight, forceMobileLayout),
      ...slice(
        rightItems,
        x,
        y + leftHeight,
        width,
        height - leftHeight,
        forceMobileLayout,
      ),
    ];
  }

  // Desktop: use aspect ratio-based decision
  const aspectRatio = width / height;
  const shouldSliceHorizontally = aspectRatio > 0.7;

  if (shouldSliceHorizontally) {
    const leftWidth = width * (leftSum / total);
    return [
      ...slice(leftItems, x, y, leftWidth, height, forceMobileLayout),
      ...slice(
        rightItems,
        x + leftWidth,
        y,
        width - leftWidth,
        height,
        forceMobileLayout,
      ),
    ];
  } else {
    const leftHeight = height * (leftSum / total);
    return [
      ...slice(leftItems, x, y, width, leftHeight, forceMobileLayout),
      ...slice(
        rightItems,
        x,
        y + leftHeight,
        width,
        height - leftHeight,
        forceMobileLayout,
      ),
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
  const [isExpanded, setIsExpanded] = useState(false);

  const totalBudget = useMemo(
    () => parts.reduce((sum, p) => sum + p.totalBudget, 0),
    [parts],
  );

  // Calculate part heights with gaps
  const partHeights = useMemo(() => {
    const partGapPercent = (PART_GAP / treemapHeight) * 100;
    const heights: { part: TreemapPart; startY: number; height: number }[] = [];
    let currentY = 0;
    parts.forEach((part, i) => {
      const partHeight = (part.totalBudget / totalBudget) * 100;
      heights.push({ part, startY: currentY, height: partHeight });
      currentY += partHeight + (i < parts.length - 1 ? partGapPercent : 0);
    });
    return heights;
  }, [parts, totalBudget, treemapHeight]);

  // Calculate label positions - keep aligned with boxes, minimal repulsion only if overlapping
  const labelPositions = useMemo(() => {
    const positions = partHeights.map(({ part, startY }) => ({
      part: part.part,
      y: startY,
    }));

    // Get approximate label heights for overlap detection (compact single-line only)
    const getLabelHeight = (partKey: string) => {
      const isCompact = [
        "Part IX",
        "Part X",
        "Part XI",
        "Part XII",
        "Part XIII",
        "Part XIV",
      ].includes(partKey);
      return isCompact ? 1.2 : 0; // Only check compact labels
    };

    // Minimal downward adjustment only if compact labels actually overlap
    for (let i = 1; i < positions.length; i++) {
      const previous = positions[i - 1];
      const current = positions[i];
      
      const previousHeight = getLabelHeight(previous.part);
      if (previousHeight > 0) {
        const previousBottom = previous.y + previousHeight;
        
        // Only push down by the minimum amount needed
        if (current.y < previousBottom) {
          current.y = previousBottom + 0.05; // Tiny gap
        }
      }
    }

    return positions;
  }, [partHeights]);

  // Single effect to handle all client-side initialization
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;
      const mobile = width < 640;
      setIsMobile(mobile);

      let height;
      if (width < 640) {
        // Mobile: shorter height creates wider boxes for better label readability
        // When expanded, significantly increase height for better clickability
        height = isExpanded ? 6000 : 2000;
      } else if (width < 1024) {
        height = 1600;
      } else {
        height = 1200;
      }

      console.log("🔍 Treemap layout update:", {
        width,
        mobile,
        height,
        expanded: isExpanded,
        parts: parts.length,
      });
      setTreemapHeight(height);
    };

    updateLayout();
    setMounted(true);

    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [parts.length, isExpanded]);

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
      <div className="flex h-[1200px] items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-un-blue border-r-transparent"></div>
          <p className="text-sm text-gray-600">Loading treemap...</p>
        </div>
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: `${treemapHeight}px` }}
      >
        <p className="text-lg text-gray-500">No budget data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 lg:flex-row">
      {/* Mobile expand button and legend - always at top on small screens */}
      <div className="block space-y-2 rounded bg-gray-50 px-2 py-3 sm:hidden">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-gray-700">Budget Sections</div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 rounded-md bg-un-blue px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-un-blue/90"
          >
            {isExpanded ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
                Collapse
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Expand
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {partHeights.map(({ part }) => {
            const colors = PART_COLORS[part.part] || PART_COLORS["Part I"];
            const numeral = getNumeral(part.part);
            const name = PART_SHORT_NAMES[part.part] || part.partName;
            return (
              <div
                key={`mobile-${part.part}`}
                className="flex items-center gap-1.5"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded"
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
        className="relative w-full overflow-hidden lg:flex-1"
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
          const sectionRects = squarify<TreemapSection>(
            sectionItems,
            0,
            0,
            100,
            100,
            isMobile,
          );
          
          // Debug: log all section widths for parts with single vs multiple sections
          console.log(`${part.part}: ${sections.length} sections`, sectionRects.map(s => `${s.data.section}: x=${s.x.toFixed(1)}, w=${s.width.toFixed(1)}, end=${(s.x + s.width).toFixed(1)}`));

          return (
            <div
              key={part.part}
              className="absolute right-0 left-0"
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
                const entityRects = squarify<TreemapEntity>(
                  entityItems,
                  0,
                  0,
                  100,
                  100,
                  isMobile,
                );
                
                // Check if this part has multiple sections OR this section has multiple entities
                const needsDividers = sectionRects.length > 1 || entityRects.length > 1;

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
                      
                      // Calculate actual pixel height
                      const sectionPixelHeight = (sectionRect.height / 100) * treemapHeight;
                      const entityPixelHeight = (rect.height / 100) * sectionPixelHeight;
                      
                      // Show budget only when box has enough vertical space for two lines comfortably
                      // UNON=161px, UNOV=215px - set threshold to hide both if too cramped
                      const canShowBudget = entityPixelHeight > 250;
                      
                      const displayText =
                        rect.data.abbreviation || rect.data.name;

                      return (
                        <div
                          key={`${rect.data.id}-${i}`}
                          className="absolute cursor-pointer transition-colors duration-150"
                          style={{
                            left: `${rect.x}%`,
                            top: `${rect.y}%`,
                            width: `${rect.width}%`,
                            height: `${rect.height}%`,
                            backgroundColor: isHovered
                              ? colors.hover
                              : colors.bg,
                            boxShadow: needsDividers ? 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.6)' : 'none',
                          }}
                          onClick={() => handleClick(rect.data)}
                          onMouseEnter={() =>
                            !isMobile && setHoveredEntity(rect.data.id)
                          }
                          onMouseMove={(e) =>
                            !isMobile && handleMouseMove(e, rect.data)
                          }
                          onMouseLeave={handleMouseLeave}
                        >
                          <div className="flex h-full w-full flex-col items-start justify-start overflow-hidden px-0.5 pt-0 gap-0">
                            <div className="w-full truncate text-left text-xs leading-tight font-semibold text-white sm:text-sm">
                              {displayText}
                            </div>
                            {canShowBudget && (
                              <div className="w-full truncate text-left text-[10px] leading-tight text-white/95 sm:text-xs -mt-0.5">
                                {formatBudget(rect.data.budget)}{" "}
                                {formatVariance(
                                  rect.data.budgetItem[
                                    "Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)"
                                  ],
                                )}
                              </div>
                            )}
                          </div>
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
        className="relative hidden w-60 shrink-0 lg:block"
        style={{ height: `${treemapHeight}px` }}
      >
        {labelPositions.map((labelPos) => {
          const part = partHeights.find((p) => p.part.part === labelPos.part)!
            .part;
          const colors = PART_COLORS[part.part] || PART_COLORS["Part I"];
          const isCompact = [
            "Part IX",
            "Part X",
            "Part XI",
            "Part XII",
            "Part XIII",
            "Part XIV",
          ].includes(part.part);
          const numeral = getNumeral(part.part);
          const name = PART_SHORT_NAMES[part.part] || part.partName;

          return isCompact ? (
            <div
              key={`label-${part.part}`}
              className="absolute left-0 flex text-xs leading-none whitespace-nowrap -translate-y-px"
              style={{ top: `${labelPos.y}%`, color: colors.bg }}
            >
              <span className="w-6 font-medium">{numeral}.</span>
              <span className="font-medium">{name}</span>
              <span className="ml-3">
                {formatBudget(part.totalBudget)}{" "}
                {formatVariance(part.varianceVs2025)}
              </span>
            </div>
          ) : (
            <div
              key={`label-${part.part}`}
              className="absolute left-0 flex text-xs leading-none -translate-y-px"
              style={{ top: `${labelPos.y}%`, color: colors.bg }}
            >
              <span className="w-6 font-medium">{numeral}.</span>
              <div className="leading-tight">
                <div className="font-medium">{name}</div>
                <div className="mt-0.5">
                  {formatBudget(part.totalBudget)}{" "}
                  {formatVariance(part.varianceVs2025)}
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
            className="absolute top-2 right-2 rounded-full p-1.5 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="pr-8">
            <p className="text-sm leading-tight font-medium text-gray-900">
              {tooltip.entity.entityName || tooltip.entity.name}
            </p>
            {tooltip.entity.abbreviation && (
              <p className="mt-0.5 text-xs text-gray-600">
                {tooltip.entity.abbreviation}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {tooltip.entity.partName}
            </p>
            <p className="text-xs text-gray-500">
              Section {tooltip.entity.section}: {tooltip.entity.sectionName}
            </p>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {formatBudget(tooltip.entity.budget)}
            </p>
            <button
              onClick={() => onEntityClick(tooltip.entity)}
              className="mt-3 w-full rounded bg-un-blue px-4 py-2 text-sm font-medium text-white hover:bg-un-blue/90"
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
          <p className="text-sm leading-tight font-medium text-gray-900">
            {tooltip.entity.entityName || tooltip.entity.name}
          </p>
          {tooltip.entity.abbreviation && (
            <p className="mt-0.5 text-xs text-gray-600">
              {tooltip.entity.abbreviation}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {tooltip.entity.partName}
          </p>
          <p className="text-xs text-gray-500">
            Section {tooltip.entity.section}: {tooltip.entity.sectionName}
          </p>
          <p className="mt-1 text-xs font-medium text-gray-700">
            {formatBudget(tooltip.entity.budget)}
          </p>
        </div>
      )}
    </div>
  );
}
