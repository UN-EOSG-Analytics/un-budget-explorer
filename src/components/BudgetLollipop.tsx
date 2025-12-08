"use client";

import { BudgetItem, TreemapEntity } from "@/types";
import { useState } from "react";
import SectionHeading from "@/components/SectionHeading";

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

// Get arrow for variance
const getVarianceArrow = (value: number | null): string => {
  if (value === null || value === undefined) return "";
  return value > 0 ? "↗" : value < 0 ? "↘" : "→";
};

// Format just the percentage (no arrow)
const formatVarianceNum = (value: number | null): string => {
  if (value === null || value === undefined) return "";
  return `${Math.abs(value).toFixed(1)}%`;
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
    setTooltip({ x: e.clientX, y: e.clientY, row });
  };

  const ROW_HEIGHT = 28;
  const LABEL_WIDTH = 300;
  const VARIANCE_WIDTH = 70;

  return (
    <div className="mt-12">
      <SectionHeading
        title="Budget Comparison: Revised Estimates 2026 vs Approved 2025"
        description="Click on parts or sections to expand breakdown. Hover for details."
      />

      <div className="relative">
        {/* Header with ticks */}
        <div className="mb-2 flex items-center border-b pb-2 text-xs text-gray-500">
          <div style={{ width: LABEL_WIDTH }} className="flex-shrink-0" />
          <div
            style={{ width: VARIANCE_WIDTH }}
            className="flex-shrink-0 text-center"
          >
            Δ 2025
          </div>
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

        {/* Rows */}
        {rows.map((row) => {
          const indent = row.level * 20;
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
              onMouseMove={(e) => handleMouseMove(e, row)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleRowClick(row)}
            >
              {/* Label */}
              <div
                className={`flex flex-shrink-0 items-center pr-2 text-xs ${isClickable ? "hover:text-un-blue" : ""} ${row.level === 0 ? "font-medium" : ""}`}
                style={{ width: LABEL_WIDTH, paddingLeft: indent + 8 }}
              >
                {row.hasChildren ? (
                  <span className="inline-block w-4 flex-shrink-0 text-gray-400">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                ) : (
                  <span className="inline-block w-4 flex-shrink-0" />
                )}
                {row.numeral && (
                  <span className="w-7 flex-shrink-0">{row.numeral}.</span>
                )}
                <span className="truncate">{row.label}</span>
              </div>

              {/* Variance column - arrow and percentage in separate columns */}
              <div
                className="flex flex-shrink-0 text-xs text-gray-900"
                style={{ width: VARIANCE_WIDTH }}
              >
                <span className="w-4 text-center">
                  {getVarianceArrow(variance)}
                </span>
                <span className="flex-1 pr-2 text-right">
                  {formatVarianceNum(variance)}
                </span>
              </div>

              {/* Chart area */}
              <div className="relative h-full flex-1">
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
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-white bg-gray-600 shadow" />
            <span>2025 Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-un-blue/50" />
            <span>2026 Proposed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-white bg-un-blue shadow" />
            <span>2026 Revised</span>
          </div>
        </div>
      </div>

      {/* Tooltip with SVG budget flow (DRY - same style as EntityModal) */}
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
              className="pointer-events-none fixed z-50 w-72 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm shadow-lg"
              style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
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
