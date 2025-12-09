"use client";

import { BudgetItem } from "@/types";
import { formatMoney, formatVariance, getArrow } from "@/lib/format";
import SectionHeading from "@/components/SectionHeading";

interface BudgetOverviewProps {
  grandTotal: BudgetItem;
}

const VarianceBadge = ({ value }: { value: number | null }) => (
  <span
    className={`rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${
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

export default function BudgetOverview({ grandTotal }: BudgetOverviewProps) {
  const b = grandTotal;
  const varianceVs2025 =
    b[
      "Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)"
    ];

  return (
    <section className="mb-12">
      <SectionHeading
        title="Total Budget Evolution"
        description="Overview of the 2026 revised estimates compared to 2025 approved and 2026 proposed budgets."
      />

      <div className="max-w-2xl">
        {/* Three boxes in a row */}
        <div className="flex items-center gap-1 text-center">
          <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2">
            <p className="text-xs text-gray-500">2025 Approved</p>
            <p className="text-base font-semibold text-gray-900">
              {formatMoney(b["2025 approved"])}
            </p>
          </div>
          <span className="text-gray-400">→</span>
          <div className="flex-1 rounded-lg bg-gray-100 px-3 py-2">
            <p className="text-xs text-gray-500">2026 Proposed</p>
            <p className="text-base font-semibold text-gray-900">
              {formatMoney(b["2026 proposed programme budget"])}
            </p>
          </div>
          <span className="text-gray-400">→</span>
          <div className="flex-1 rounded-lg border border-un-blue/20 bg-un-blue/10 px-3 py-2">
            <p className="text-xs text-un-blue">2026 Revised</p>
            <p className="text-base font-bold text-un-blue">
              {formatMoney(b["2026 revised estimate"])}
            </p>
          </div>
        </div>

        {/* Variance arrow using SVG */}
        <div className="relative mt-2 h-14">
          <svg
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arrowhead-overview"
                markerWidth="10"
                markerHeight="10"
                refX="5"
                refY="5"
                orient="auto"
              >
                <polygon points="0,0 10,5 0,10" fill="#9ca3af" />
              </marker>
            </defs>
            <line
              x1="16.67%"
              y1="50%"
              x2="83.33%"
              y2="50%"
              stroke="#d1d5db"
              strokeWidth="1"
              markerEnd="url(#arrowhead-overview)"
            />
            <circle cx="16.67%" cy="50%" r="3" fill="#9ca3af" />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <VarianceBadge value={varianceVs2025} />
          </div>
        </div>
      </div>
    </section>
  );
}
