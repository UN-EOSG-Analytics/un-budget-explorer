"use client";

import SectionHeading from "@/components/SectionHeading";
import { BudgetItem, TreemapEntity } from "@/types";
import { useState, useRef, useEffect } from "react";

interface LollipopRow {
  id: string;
  label: string;
  numeral: string; // Roman numeral or section number for alignment
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

const PART_ORDER = [
  "Part I",
  "Part II",
  "Part III",
  "Part IV",
  "Part V",
  "Part VI",
  "Part VII",
  "Part VIII",
  "Part IX",
  "Part X",
  "Part XI",
  "Part XII",
  "Part XIII",
  "Part XIV",
];

const formatMoney = (val: number): string => {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(1)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(0)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

const formatPercent = (val: number): string => {
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
};

const getNumeral = (partKey: string) => partKey.replace("Part ", "");

// Generate nice round tick values
const generateTicks = (maxValue: number): number[] => {
  const targets = [
    100_000_000, 250_000_000, 500_000_000, 750_000_000, 1_000_000_000,
  ];
  const ticks = [0];
  for (const t of targets) {
    if (t <= maxValue) ticks.push(t);
  }
  if (ticks[ticks.length - 1] < maxValue * 0.9) {
    ticks.push(Math.ceil(maxValue / 100_000_000) * 100_000_000);
  }
  return ticks;
};

export default function BudgetLollipop({
  budgetData,
  onEntityClick,
}: BudgetLollipopProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    row: LollipopRow;
  } | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<{
    id: string;
    isTruncated: boolean;
  } | null>(null);
  const labelRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Build maps
  const partTotals = new Map<string, BudgetItem>();
  const sectionTotals = new Map<string, BudgetItem>();
  const entities = new Map<string, BudgetItem[]>();
  const sectionsPerPart = new Map<string, string[]>();

  budgetData.forEach((b) => {
    if (b.row_type === "part_total") partTotals.set(b.Part, b);
    if (b.row_type === "section_total") {
      sectionTotals.set(`${b.Part}-${b.Section}`, b);
      if (!sectionsPerPart.has(b.Part)) sectionsPerPart.set(b.Part, []);
      sectionsPerPart.get(b.Part)!.push(b.Section || "");
    }
    if (b.row_type === "entity_total") {
      const key = `${b.Part}-${b.Section}`;
      if (!entities.has(key)) entities.set(key, []);
      entities.get(key)!.push(b);
    }
  });

  // Build rows
  const rows: LollipopRow[] = [];

  PART_ORDER.forEach((partKey) => {
    const partData = partTotals.get(partKey);
    if (!partData) return;

    const partSections = sectionsPerPart.get(partKey) || [];
    const partNum = getNumeral(partKey);
    rows.push({
      id: partKey,
      label: partData["Part name"],
      numeral: partNum,
      level: 0,
      approved2025: partData["2025 approved"] || 0,
      proposed2026: partData["2026 proposed programme budget"] || 0,
      revised2026: partData["2026 revised estimate"] || 0,
      partKey,
      partNumber: partNum,
      hasChildren: partSections.length > 0,
      budgetItem: partData,
    });

    if (expanded.has(partKey)) {
      const sectionsForPart: BudgetItem[] = [];
      sectionTotals.forEach((s, key) => {
        if (key.startsWith(partKey + "-")) sectionsForPart.push(s);
      });
      sectionsForPart.sort((a, b) =>
        (a.Section || "").localeCompare(b.Section || ""),
      );

      sectionsForPart.forEach((sectionData) => {
        const sectionKey = `${partKey}-${sectionData.Section}`;
        const sectionEntities = entities.get(sectionKey) || [];
        const hasChildren = sectionEntities.length > 0;

        rows.push({
          id: sectionKey,
          label: hasChildren
            ? sectionData["Section name"] || ""
            : sectionData.entity_name || sectionData["Section name"] || "",
          numeral: sectionData.Section || "",
          level: 1,
          approved2025: sectionData["2025 approved"] || 0,
          proposed2026: sectionData["2026 proposed programme budget"] || 0,
          revised2026: sectionData["2026 revised estimate"] || 0,
          partKey,
          partNumber: partNum,
          sectionKey: sectionData.Section || undefined,
          hasChildren,
          budgetItem: sectionData,
        });

        if (expanded.has(sectionKey)) {
          sectionEntities.sort(
            (a, b) =>
              (b["2026 revised estimate"] || 0) -
              (a["2026 revised estimate"] || 0),
          );

          sectionEntities.forEach((entityData) => {
            rows.push({
              id: `${sectionKey}-${entityData["Entity name"]}`,
              label:
                entityData.entity_name ||
                entityData["Entity name"] ||
                "Unknown",
              numeral: "",
              level: 2,
              approved2025: entityData["2025 approved"] || 0,
              proposed2026: entityData["2026 proposed programme budget"] || 0,
              revised2026: entityData["2026 revised estimate"] || 0,
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

  const maxValue = Math.max(
    ...rows.map((r) => Math.max(r.approved2025, r.proposed2026, r.revised2026)),
  );
  const ticks = generateTicks(maxValue);
  const scaleMax = ticks[ticks.length - 1];
  const scale = (val: number) => (val / scaleMax) * 100;

  const toggleExpand = (id: string, hasChildren: boolean) => {
    if (!hasChildren) return;
    setExpanded((prev) => {
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
        name: b["Entity name"] || b["Section name"] || "Unknown",
        abbreviation: b.abbreviation,
        entityName: b.entity_name,
        part: row.partKey,
        partName: b["Part name"],
        section: row.sectionKey || "",
        sectionName: b["Section name"] || "",
        budget: row.revised2026,
        budgetItem: b,
      };
      onEntityClick(entity);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, row: LollipopRow) => {
    const x = e.clientX;
    const y = e.clientY;
    // Position tooltip to avoid overflow on small screens
    const viewportWidth = window.innerWidth;
    const tooltipWidth = 288; // w-72 = 288px
    const adjustedX =
      x + tooltipWidth + 24 > viewportWidth ? x - tooltipWidth - 12 : x + 12;
    setTooltip({ x: adjustedX, y, row });
  };

  const handleLabelMouseEnter = (
    rowId: string,
    labelEl: HTMLSpanElement | null,
  ) => {
    if (!labelEl) return;

    // Check if text is truncated by comparing scroll width with client width
    const isTruncated = labelEl.scrollWidth > labelEl.clientWidth;

    if (isTruncated) {
      const timeoutId = setTimeout(() => {
        setHoveredLabel({ id: rowId, isTruncated: true });
      }, 500); // 500ms delay

      labelEl.dataset.timeoutId = String(timeoutId);
    }
  };

  const handleLabelMouseLeave = (labelEl: HTMLSpanElement | null) => {
    if (!labelEl) return;

    if (labelEl.dataset.timeoutId) {
      clearTimeout(Number(labelEl.dataset.timeoutId));
      delete labelEl.dataset.timeoutId;
    }
    setHoveredLabel(null);
  };

  const ROW_HEIGHT = 28;
  const LABEL_WIDTH = 500;

  // Render a single lollipop chart for a row (mobile version)
  const renderMobileLollipop = (row: LollipopRow) => {
    const minX = Math.min(row.approved2025, row.revised2026);
    const maxX = Math.max(row.approved2025, row.revised2026);
    const variance =
      row.approved2025 > 0
        ? ((row.revised2026 - row.approved2025) / row.approved2025) * 100
        : null;

    return (
      <div className="relative h-10 w-full">
        {/* Tick lines */}
        {ticks.map((tick) => (
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
            transform: "translateY(-50%)",
          }}
        />

        {/* Arrow */}
        {variance !== null && variance !== 0 && (
          <div
            className="absolute top-1/2"
            style={{
              left: `${(scale(row.approved2025) + scale(row.revised2026)) / 2}%`,
              transform:
                variance < 0
                  ? "translate(-50%, -50%)"
                  : "translate(-50%, -50%) rotate(180deg)",
            }}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className="text-gray-300"
            >
              <path d="M 0 5 L 9 1 L 9 9 Z" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* 2026 proposed (small dot) */}
        <div
          className="absolute top-1/2 h-2 w-2 rounded-full border border-white bg-un-blue/50"
          style={{
            left: `${scale(row.proposed2026)}%`,
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* 2025 approved (large dot) */}
        <div
          className="absolute top-1/2 h-4 w-4 rounded-full border-2 border-white bg-gray-600 shadow"
          style={{
            left: `${scale(row.approved2025)}%`,
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* 2026 revised (large dot, UN blue) */}
        <div
          className="absolute top-1/2 h-4 w-4 rounded-full border-2 border-white bg-un-blue shadow"
          style={{
            left: `${scale(row.revised2026)}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    );
  };

  // Mobile vertical layout
  const renderMobileLayout = () => {
    const partRows = rows.filter((r) => r.level === 0);

    return (
      <div className="space-y-3">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 border-b pb-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-gray-600 shadow" />
            <span className="whitespace-nowrap">2025 Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 shrink-0 rounded-full bg-un-blue/50" />
            <span className="whitespace-nowrap">2026 Proposed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-un-blue shadow" />
            <span className="whitespace-nowrap">2026 Revised</span>
          </div>
        </div>

        {/* Part sections */}
        {partRows.map((row) => {
          const isExpanded = expanded.has(row.id);
          const variance =
            row.approved2025 > 0
              ? ((row.revised2026 - row.approved2025) / row.approved2025) * 100
              : null;

          return (
            <div key={row.id} className="border-b pb-3">
              {/* Part header with expand button */}
              <button
                onClick={() => handleRowClick(row)}
                className="w-full text-left"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 w-4 shrink-0 text-gray-400">
                      {row.hasChildren && (isExpanded ? "▼" : "▶")}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {row.numeral}. {row.label}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-600">
                        <span>2025: {formatMoney(row.approved2025)}</span>
                        <span>→</span>
                        <span className="font-medium text-un-blue">
                          2026: {formatMoney(row.revised2026)}
                        </span>
                        {variance !== null && (
                          <span className="font-medium">
                            {formatPercent(variance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Lollipop chart for this part */}
              {renderMobileLollipop(row)}

              {/* Expanded sections */}
              {isExpanded && (
                <div className="mt-3 space-y-3 pl-6">
                  {rows
                    .filter((r) => r.level === 1 && r.partKey === row.partKey)
                    .map((sectionRow) => {
                      const sectionExpanded = expanded.has(sectionRow.id);
                      const sectionVariance =
                        sectionRow.approved2025 > 0
                          ? ((sectionRow.revised2026 -
                              sectionRow.approved2025) /
                              sectionRow.approved2025) *
                            100
                          : null;

                      return (
                        <div
                          key={sectionRow.id}
                          className="rounded-r border-l-2 border-gray-300 bg-gray-50/50 py-2 pl-4"
                        >
                          <button
                            onClick={() => handleRowClick(sectionRow)}
                            className="w-full text-left"
                          >
                            <div className="mb-1 flex items-start gap-2">
                              <span className="mt-0.5 w-4 shrink-0 text-sm text-gray-400">
                                {sectionRow.hasChildren &&
                                  (sectionExpanded ? "▼" : "▶")}
                              </span>
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">
                                  {sectionRow.numeral}. {sectionRow.label}
                                </h4>
                                <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-600">
                                  <span>
                                    {formatMoney(sectionRow.approved2025)}
                                  </span>
                                  <span>→</span>
                                  <span className="font-medium text-un-blue">
                                    {formatMoney(sectionRow.revised2026)}
                                  </span>
                                  {sectionVariance !== null && (
                                    <span className="font-medium">
                                      {formatPercent(sectionVariance)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>

                          {/* Lollipop for section */}
                          {renderMobileLollipop(sectionRow)}

                          {/* Expanded entities */}
                          {sectionExpanded && (
                            <div className="mt-2 space-y-2 pl-4">
                              {rows
                                .filter(
                                  (r) =>
                                    r.level === 2 &&
                                    r.partKey === row.partKey &&
                                    r.sectionKey === sectionRow.sectionKey,
                                )
                                .map((entityRow) => {
                                  const entityVariance =
                                    entityRow.approved2025 > 0
                                      ? ((entityRow.revised2026 -
                                          entityRow.approved2025) /
                                          entityRow.approved2025) *
                                        100
                                      : null;

                                  return (
                                    <div
                                      key={entityRow.id}
                                      className="border-l border-gray-300 py-1 pl-3"
                                    >
                                      <button
                                        onClick={() =>
                                          handleRowClick(entityRow)
                                        }
                                        className="w-full text-left"
                                      >
                                        <div className="mb-1">
                                          <h5 className="text-sm font-normal text-gray-600">
                                            {entityRow.label}
                                          </h5>
                                          <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-gray-600">
                                            <span>
                                              {formatMoney(
                                                entityRow.approved2025,
                                              )}
                                            </span>
                                            <span>→</span>
                                            <span className="font-medium text-un-blue">
                                              {formatMoney(
                                                entityRow.revised2026,
                                              )}
                                            </span>
                                            {entityVariance !== null && (
                                              <span className="font-medium">
                                                {formatPercent(entityVariance)}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </button>
                                      {renderMobileLollipop(entityRow)}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}

        {/* X-axis labels */}
        <div className="relative h-4 text-xs text-gray-500">
          {ticks.map((tick, idx) => (
            <span
              key={tick}
              className={`absolute -translate-x-1/2 transform whitespace-nowrap ${
                idx % 2 === 1 ? "hidden" : ""
              }`}
              style={{ left: `${scale(tick)}%` }}
            >
              {formatMoney(tick)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-12">
      <SectionHeading
        title="Budget Comparison: Revised Estimates 2026 vs. Approved 2025"
        description="Click on parts or sections to expand breakdown. Hover for details."
      />

      {/* Mobile Layout */}
      <div className="block lg:hidden">{renderMobileLayout()}</div>

      {/* Desktop Layout */}
      <div className="relative hidden lg:block">
        {/* Header with legend on the right */}
        <div className="mb-2 flex flex-col gap-2 border-b pb-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden sm:block" style={{ width: LABEL_WIDTH }} />
          <div className="flex flex-wrap items-center gap-3 text-gray-600 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-gray-600 shadow" />
              <span className="whitespace-nowrap">2025 Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 shrink-0 rounded-full bg-un-blue/50" />
              <span className="whitespace-nowrap">2026 Proposed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 shrink-0 rounded-full border-2 border-white bg-un-blue shadow" />
              <span className="whitespace-nowrap">2026 Revised</span>
            </div>
          </div>
        </div>

        {/* Rows */}
        {rows.map((row) => {
          const isExpanded = expanded.has(row.id);
          const minX = Math.min(row.approved2025, row.revised2026);
          const maxX = Math.max(row.approved2025, row.revised2026);
          const variance =
            row.approved2025 > 0
              ? ((row.revised2026 - row.approved2025) / row.approved2025) * 100
              : null;
          const isClickable = row.hasChildren || row.level > 0;

          return (
            <div
              key={row.id}
              className={`flex items-center ${isClickable ? "cursor-pointer hover:bg-gray-50" : ""}`}
              style={{ height: ROW_HEIGHT }}
              onClick={() => handleRowClick(row)}
            >
              {/* Label */}
              <div
                className={`group flex shrink-0 items-center pr-2 text-xs ${isClickable ? "hover:text-un-blue" : ""} ${row.level === 0 ? "font-medium" : ""} ${row.level === 2 ? "text-gray-500" : ""}`}
                style={{
                  width: LABEL_WIDTH,
                  paddingLeft: row.level === 2 ? 30 : row.level * 16,
                }}
              >
                {row.hasChildren ? (
                  <span className="inline-block w-4 shrink-0 text-gray-400">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                ) : (
                  <span className="inline-block w-4 shrink-0" />
                )}
                {row.numeral && (
                  <span className="mr-1 shrink-0">{row.numeral}.</span>
                )}
                <span className="relative min-w-0 flex-1">
                  <span
                    ref={(el) => {
                      if (el) labelRefs.current.set(row.id, el);
                    }}
                    className="block truncate"
                    onMouseEnter={(e) =>
                      handleLabelMouseEnter(row.id, e.currentTarget)
                    }
                    onMouseLeave={(e) => handleLabelMouseLeave(e.currentTarget)}
                  >
                    {row.label}
                  </span>

                  {/* Tooltip for truncated text */}
                  {hoveredLabel?.id === row.id && hoveredLabel.isTruncated && (
                    <span className="pointer-events-none absolute top-full left-0 z-50 mt-1 max-w-md rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-normal whitespace-normal text-gray-900 shadow-lg">
                      {row.label}
                    </span>
                  )}
                </span>
              </div>

              {/* Chart area */}
              <div
                className="relative h-full flex-1"
                onMouseMove={(e) => handleMouseMove(e, row)}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Horizontal grid line */}
                <div className="absolute top-1/2 right-0 left-0 h-px bg-gray-100" />

                {/* Tick lines */}
                {ticks.map((tick) => (
                  <div
                    key={tick}
                    className={`absolute top-0 bottom-0 w-px ${tick === 0 ? "bg-gray-300" : "bg-gray-100"}`}
                    style={{ left: `${scale(tick)}%` }}
                  />
                ))}

                {/* Connecting line */}
                <div
                  className="absolute top-1/2 h-0.5 bg-gray-300"
                  style={{
                    left: `${scale(minX)}%`,
                    width: `${scale(maxX) - scale(minX)}%`,
                    transform: "translateY(-50%)",
                  }}
                />

                {/* Subtle arrow centered within the connecting line */}
                {variance !== null && variance !== 0 && (
                  <div
                    className="absolute top-1/2"
                    style={{
                      left: `${(scale(row.approved2025) + scale(row.revised2026)) / 2}%`,
                      transform:
                        variance < 0
                          ? "translate(-50%, -50%)"
                          : "translate(-50%, -50%) rotate(180deg)",
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      className="text-gray-300"
                    >
                      <path d="M 0 5 L 9 1 L 9 9 Z" fill="currentColor" />
                    </svg>
                  </div>
                )}

                {/* 2026 proposed (small dot) */}
                <div
                  className="absolute top-1/2 h-2 w-2 rounded-full border border-white bg-un-blue/50"
                  style={{
                    left: `${scale(row.proposed2026)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />

                {/* 2025 approved (large dot) */}
                <div
                  className="absolute top-1/2 h-3 w-3 rounded-full border-2 border-white bg-gray-600 shadow"
                  style={{
                    left: `${scale(row.approved2025)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />

                {/* 2026 revised (large dot, UN blue) */}
                <div
                  className="absolute top-1/2 h-3 w-3 rounded-full border-2 border-white bg-un-blue shadow"
                  style={{
                    left: `${scale(row.revised2026)}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                />

                {/* Percentage label next to revised dot */}
                {variance !== null && (
                  <div
                    className="absolute top-1/2 text-xs font-medium text-gray-600"
                    style={{
                      left: `${Math.max(scale(row.revised2026), scale(row.approved2025))}%`,
                      transform: "translateY(-50%)",
                      marginLeft: "12px",
                    }}
                  >
                    {formatPercent(variance)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* X-axis labels */}
        <div className="mt-2 flex items-center text-xs text-gray-500">
          <div style={{ width: LABEL_WIDTH }} className="shrink-0" />
          <div className="relative h-4 flex-1">
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute -translate-x-1/2 transform"
                style={{ left: `${scale(tick)}%` }}
              >
                {formatMoney(tick)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip with SVG budget flow (DRY - same style as EntityModal) - Desktop only */}
      {tooltip &&
        (() => {
          const varianceVs2025 =
            tooltip.row.approved2025 > 0
              ? ((tooltip.row.revised2026 - tooltip.row.approved2025) /
                  tooltip.row.approved2025) *
                100
              : null;
          const varianceVsProposed =
            tooltip.row.proposed2026 > 0
              ? ((tooltip.row.revised2026 - tooltip.row.proposed2026) /
                  tooltip.row.proposed2026) *
                100
              : null;
          return (
            <div
              className="pointer-events-none fixed z-50 w-64 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm shadow-lg sm:w-72"
              style={{ left: tooltip.x, top: tooltip.y + 12 }}
            >
              <p className="mb-3 font-medium text-gray-900">
                {tooltip.row.numeral
                  ? `${tooltip.row.numeral}. ${tooltip.row.label}`
                  : tooltip.row.label}
              </p>

              {/* Three boxes in a row */}
              <div className="flex items-center gap-1 text-center">
                <div className="flex-1 rounded bg-gray-100 px-2 py-1">
                  <p className="text-[10px] text-gray-500">2025</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {formatMoney(tooltip.row.approved2025)}
                  </p>
                </div>
                <span className="text-xs text-gray-400">→</span>
                <div className="flex-1 rounded bg-gray-100 px-2 py-1">
                  <p className="text-[10px] text-gray-500">Proposed</p>
                  <p className="text-xs font-semibold text-gray-900">
                    {formatMoney(tooltip.row.proposed2026)}
                  </p>
                </div>
                <span className="text-xs text-gray-400">→</span>
                <div className="flex-1 rounded border border-un-blue/20 bg-un-blue/10 px-2 py-1">
                  <p className="text-[10px] text-un-blue">Revised</p>
                  <p className="text-xs font-bold text-un-blue">
                    {formatMoney(tooltip.row.revised2026)}
                  </p>
                </div>
              </div>

              {/* Variance arrows using SVG */}
              <div className="relative mt-1 h-10">
                <svg
                  className="absolute inset-0 h-full w-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <marker
                      id="arrow-lollipop"
                      markerWidth="6"
                      markerHeight="6"
                      refX="5"
                      refY="3"
                      orient="auto"
                    >
                      <path
                        d="M0,0 L6,3 L0,6"
                        fill="none"
                        stroke="#9ca3af"
                        strokeWidth="1.5"
                      />
                    </marker>
                  </defs>
                  {/* Line 1: 2025 approved → 2026 revised */}
                  <line
                    x1="16.67%"
                    y1="30%"
                    x2="83.33%"
                    y2="30%"
                    stroke="#d1d5db"
                    strokeWidth="1"
                    markerEnd="url(#arrow-lollipop)"
                  />
                  {/* Line 2: 2026 proposed → 2026 revised */}
                  <line
                    x1="50%"
                    y1="70%"
                    x2="83.33%"
                    y2="70%"
                    stroke="#d1d5db"
                    strokeWidth="1"
                    markerEnd="url(#arrow-lollipop)"
                  />
                  {/* Start dots */}
                  <circle cx="16.67%" cy="30%" r="2" fill="#9ca3af" />
                  <circle cx="50%" cy="70%" r="2" fill="#9ca3af" />
                </svg>
                {/* Variance badges */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-around text-[10px]">
                  <div
                    className="flex justify-center"
                    style={{ paddingLeft: "16.67%", paddingRight: "16.67%" }}
                  >
                    <span className="rounded bg-gray-100 px-1 text-gray-700">
                      {formatPercent(varianceVs2025 ?? 0)}
                    </span>
                  </div>
                  <div
                    className="flex justify-center"
                    style={{ paddingLeft: "50%", paddingRight: "16.67%" }}
                  >
                    <span className="rounded bg-gray-100 px-1 text-gray-700">
                      {formatPercent(varianceVsProposed ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
