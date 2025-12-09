"use client";

import { TreemapEntity, DetailItem, Narrative, ResourceTable } from "@/types";
import { formatMoney, formatVariance, getArrow } from "@/lib/format";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

interface EntityModalProps {
  entity: TreemapEntity | null;
  onClose: () => void;
}

// Extract part number from "Part I", "Part II", etc.
const getPartNumber = (part: string): string => {
  const match = part.match(/Part\s+(\S+)/);
  return match ? match[1] : part;
};

// VarianceBadge component
const VarianceBadge = ({
  value,
  small,
}: {
  value: number | null;
  small?: boolean;
}) => (
  <span
    className={`rounded font-medium whitespace-nowrap ${small ? "px-1.5 py-0.5 text-xs" : "px-2 py-1 text-xs"} ${
      (value ?? 0) < 0
        ? "bg-red-100 text-red-700"
        : (value ?? 0) > 0
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600"
    }`}
  >
    {formatVariance(value)}
  </span>
);

export default function EntityModal({ entity, onClose }: EntityModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [resourceTable, setResourceTable] = useState<ResourceTable | null>(
    null,
  );
  const [loadingNarratives, setLoadingNarratives] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!entity) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingNarratives(true);
    setDetailsError(null);

    fetch(`${basePath}/details.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to load details: ${res.status} ${res.statusText}`,
          );
        }
        return res.json();
      })
      .then((data: DetailItem[]) => {
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received");
        }
        const match = data.find(
          (d) =>
            d.entity === entity.name ||
            d.entity === entity.budgetItem.chapter_title ||
            d.entity === entity.budgetItem["Entity name"],
        );
        setNarratives(match?.narratives || []);
        setResourceTable(match?.resource_table || null);
        setDetailsError(null);
      })
      .catch((error) => {
        console.error("Error loading entity details:", error);
        setNarratives([]);
        setResourceTable(null);
        setDetailsError(
          error instanceof Error
            ? error.message
            : "Failed to load details. Please try again.",
        );
      })
      .finally(() => setLoadingNarratives(false));
  }, [entity]);

  const handleRetry = () => {
    setLoadingNarratives(true);
    setDetailsError(null);

    fetch(`${basePath}/details.json`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to load details: ${res.status} ${res.statusText}`,
          );
        }
        return res.json();
      })
      .then((data: DetailItem[]) => {
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format received");
        }
        const match = data.find(
          (d) =>
            d.entity === entity?.name ||
            d.entity === entity?.budgetItem.chapter_title ||
            d.entity === entity?.budgetItem["Entity name"],
        );
        setNarratives(match?.narratives || []);
        setResourceTable(match?.resource_table || null);
        setDetailsError(null);
      })
      .catch((error) => {
        console.error("Error loading entity details:", error);
        setNarratives([]);
        setResourceTable(null);
        setDetailsError(
          error instanceof Error
            ? error.message
            : "Failed to load details. Please try again.",
        );
      })
      .finally(() => setLoadingNarratives(false));
  };

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) =>
    setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) handleClose();
  };

  useEffect(() => {
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = original;
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!entity) return null;

  const b = entity.budgetItem;

  const varianceVsProposed =
    b[
      "Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)"
    ];
  const varianceVs2025 =
    b[
      "Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)"
    ];

  const formatNarrativeText = (text: string) => {
    const colonIndex = text.indexOf(":");
    if (colonIndex > 0 && colonIndex < 60) {
      const beforeColon = text.substring(0, colonIndex);
      if (!beforeColon.includes(".")) {
        return (
          <>
            <span className="font-semibold">{beforeColon}:</span>
            {text.substring(colonIndex + 1)}
          </>
        );
      }
    }
    return text;
  };

  const renderNarrative = (n: Narrative, i: number) => {
    const indent = n.level * 24;
    return (
      <div
        key={i}
        className="rounded-lg bg-gray-50 p-3"
        style={{ marginLeft: indent }}
      >
        <div className="flex gap-3">
          <div className="shrink-0">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-un-blue text-xs font-medium text-white">
              {n.prefix}
            </span>
          </div>
          <p className="flex-1 text-sm leading-relaxed text-gray-700">
            {formatNarrativeText(n.text)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${isVisible && !isClosing ? "opacity-100" : "opacity-0"}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-2/3 sm:min-w-[400px] md:w-1/2 lg:w-2/5 lg:min-w-[500px] xl:w-1/3 ${isVisible && !isClosing ? "translate-x-0" : "translate-x-full"}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl leading-tight font-bold text-gray-900">
                {entity.entityName || entity.name}
              </h2>
              {entity.abbreviation && (
                <p className="text-sm text-gray-500">{entity.abbreviation}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Part {getPartNumber(entity.part)}: {entity.partName}
              </p>
              <p className="text-xs text-gray-400">
                Section {entity.section}: {entity.sectionName}
              </p>
              {/* Hidden for now - System Chart link */}
              {/* {entity.abbreviation && (
                <a
                  href={`https://systemchart.un.org/?entity=${entity.abbreviation.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-un-blue hover:underline"
                >
                  View on System Chart →
                </a>
              )} */}
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-6 py-5 pb-12">
          {/* Budget Flow */}
          <section>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Budget
            </h3>

            {/* Three boxes in a row */}
            <div className="flex items-center gap-1 text-center">
              <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2">
                <p className="text-xs text-gray-500">2025 Approved</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatMoney(b["2025 approved"])}
                </p>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2">
                <p className="text-xs text-gray-500">2026 Proposed</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatMoney(b["2026 proposed programme budget"])}
                </p>
              </div>
              <span className="text-gray-400">→</span>
              <div className="flex-1 rounded-lg border border-un-blue/20 bg-un-blue/10 px-3 py-2">
                <p className="text-xs text-un-blue">2026 Revised</p>
                <p className="text-sm font-bold text-un-blue">
                  {formatMoney(b["2026 revised estimate"])}
                </p>
              </div>
            </div>

            {/* Variance arrows using SVG */}
            <div className="relative mt-2 h-16">
              <svg
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker
                    id="arrowhead"
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
                {/* Line 1: 2025 approved (16.67%) → 2026 revised (83.33%) */}
                <line
                  x1="16.67%"
                  y1="25%"
                  x2="83.33%"
                  y2="25%"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  markerEnd="url(#arrowhead)"
                />
                {/* Line 2: 2026 proposed (50%) → 2026 revised (83.33%) */}
                <line
                  x1="50%"
                  y1="75%"
                  x2="83.33%"
                  y2="75%"
                  stroke="#d1d5db"
                  strokeWidth="1"
                  markerEnd="url(#arrowhead)"
                />
                {/* Start dots */}
                <circle cx="16.67%" cy="25%" r="3" fill="#9ca3af" />
                <circle cx="50%" cy="75%" r="3" fill="#9ca3af" />
              </svg>
              {/* Variance badges positioned over the lines */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-around">
                <div
                  className="flex justify-center"
                  style={{ paddingLeft: "16.67%", paddingRight: "16.67%" }}
                >
                  <VarianceBadge value={varianceVs2025} small />
                </div>
                <div
                  className="flex justify-center"
                  style={{ paddingLeft: "50%", paddingRight: "16.67%" }}
                >
                  <VarianceBadge value={varianceVsProposed} small />
                </div>
              </div>
            </div>
          </section>

          {/* Resource Changes Lollipop Chart */}
          {resourceTable &&
            resourceTable.rows.length > 0 &&
            (() => {
              const parseNum = (s: string) => parseFloat(s) || 0;
              const rows = resourceTable.rows
                .filter(
                  (r) =>
                    !r[0].toLowerCase().includes("variance") &&
                    !r[0].toLowerCase().includes("total"),
                )
                .map((r) => ({
                  label: r[0].replace(/^[IVX]+\.\t/, ""),
                  approved: parseNum(r[1]) * 1000,
                  proposed: parseNum(r[2]) * 1000,
                  consolidation: parseNum(r[3]) * 1000,
                  other: parseNum(r[4]) * 1000,
                  revised: parseNum(r[5]) * 1000,
                }));
              const maxVal = Math.max(
                ...rows.flatMap((r) => [r.approved, r.proposed, r.revised]),
              );
              const scale = (v: number) =>
                maxVal > 0 ? (v / maxVal) * 100 : 0;
              const ROW_H = 24;
              const LABEL_W = 140;

              return (
                <section>
                  <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
                    Resource Changes by Object
                  </h3>
                  <div className="space-y-0.5">
                    {rows.map((row, i) => {
                      const minX = Math.min(row.approved, row.revised);
                      const maxX = Math.max(row.approved, row.revised);

                      return (
                        <div
                          key={i}
                          className="group relative flex items-center"
                          style={{ height: ROW_H }}
                        >
                          <div
                            className="shrink-0 truncate pr-2 text-[10px] text-gray-600"
                            style={{ width: LABEL_W }}
                            title={row.label}
                          >
                            {row.label}
                          </div>
                          {/* Chart area */}
                          <div className="relative h-full flex-1">
                            {/* Connecting line */}
                            <div
                              className="absolute top-1/2 h-0.5 bg-gray-300"
                              style={{
                                left: `${scale(minX)}%`,
                                width: `${Math.max(1, scale(maxX) - scale(minX))}%`,
                                transform: "translateY(-50%)",
                              }}
                            />
                            {/* 2026 proposed (small dot) */}
                            <div
                              className="absolute top-1/2 h-2 w-2 rounded-full border border-white bg-un-blue/50"
                              style={{
                                left: `${scale(row.proposed)}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                            {/* 2025 approved (large dot) */}
                            <div
                              className="absolute top-1/2 h-3 w-3 rounded-full border-2 border-white bg-gray-600 shadow"
                              style={{
                                left: `${scale(row.approved)}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                            {/* 2026 revised (large dot, UN blue) */}
                            <div
                              className="absolute top-1/2 h-3 w-3 rounded-full border-2 border-white bg-un-blue shadow"
                              style={{
                                left: `${scale(row.revised)}%`,
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          </div>
                          {/* Tooltip */}
                          <div
                            className="pointer-events-none absolute z-10 w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 opacity-0 shadow-lg group-hover:opacity-100"
                            style={{
                              left: LABEL_W + 8,
                              top: "50%",
                              transform: "translateY(-50%)",
                            }}
                          >
                            <p className="mb-2 text-xs font-medium text-gray-900">
                              {row.label}
                            </p>
                            <div className="flex items-center gap-1 text-center text-[10px]">
                              <div className="flex-1 rounded bg-gray-100 px-1.5 py-0.5">
                                <p className="text-gray-500">2025</p>
                                <p className="font-semibold text-gray-900">
                                  {formatMoney(row.approved)}
                                </p>
                              </div>
                              <span className="text-gray-400">→</span>
                              <div className="flex-1 rounded bg-gray-100 px-1.5 py-0.5">
                                <p className="text-gray-500">Proposed</p>
                                <p className="font-semibold text-gray-900">
                                  {formatMoney(row.proposed)}
                                </p>
                              </div>
                              <span className="text-gray-400">→</span>
                              <div className="flex flex-1 flex-col gap-0.5">
                                <div
                                  className={`rounded px-1.5 py-0.5 ${row.consolidation < 0 ? "bg-red-50" : row.consolidation > 0 ? "bg-green-50" : "bg-gray-50"}`}
                                >
                                  <p className="text-gray-500">Consol.</p>
                                  <p
                                    className={`font-semibold ${row.consolidation < 0 ? "text-red-600" : row.consolidation > 0 ? "text-green-600" : "text-gray-400"}`}
                                  >
                                    {row.consolidation !== 0
                                      ? `${getArrow(row.consolidation)}${formatMoney(Math.abs(row.consolidation))}`
                                      : "—"}
                                  </p>
                                </div>
                                <div
                                  className={`rounded px-1.5 py-0.5 ${row.other < 0 ? "bg-red-50" : row.other > 0 ? "bg-green-50" : "bg-gray-50"}`}
                                >
                                  <p className="text-gray-500">Other</p>
                                  <p
                                    className={`font-semibold ${row.other < 0 ? "text-red-600" : row.other > 0 ? "text-green-600" : "text-gray-400"}`}
                                  >
                                    {row.other !== 0
                                      ? `${getArrow(row.other)}${formatMoney(Math.abs(row.other))}`
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                              <span className="text-gray-400">→</span>
                              <div className="flex-1 rounded border border-un-blue/20 bg-un-blue/10 px-1.5 py-0.5">
                                <p className="text-un-blue">Revised</p>
                                <p className="font-bold text-un-blue">
                                  {formatMoney(row.revised)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full border border-white bg-gray-600" />
                      2025 Approved
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-un-blue/50" />
                      2026 Proposed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2.5 w-2.5 rounded-full border border-white bg-un-blue" />
                      2026 Revised
                    </span>
                  </div>
                </section>
              );
            })()}

          {/* Narratives */}
          <section>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Details
            </h3>
            {loadingNarratives ? (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
                <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
              </div>
            ) : detailsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="mb-2 text-sm text-red-800">{detailsError}</p>
                <button
                  onClick={handleRetry}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
                >
                  Try Again
                </button>
              </div>
            ) : narratives.length > 0 ? (
              <div className="space-y-2">{narratives.map(renderNarrative)}</div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                No detailed narrative available for this entity.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
