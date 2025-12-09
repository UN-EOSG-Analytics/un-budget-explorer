"use client";

import SectionHeading from "@/components/SectionHeading";
import { formatMoney, formatVariance } from "@/lib/format";
import { BudgetItem } from "@/types";

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

      {/* Mobile: Vertical Stack */}
      <div className="md:hidden space-y-1.5 max-w-sm">
        <a
          href="https://www.un.org/en/ga/fifth/79/ppb2025.shtml"
          target="_blank"
          rel="noopener noreferrer"
          className="block cursor-pointer rounded-lg border border-gray-400 bg-gray-600/10 px-3 py-2 text-center transition-colors hover:border-gray-500 hover:bg-gray-600/20"
        >
          <p className="text-xs text-gray-600 mb-0.5">2025 Approved</p>
          <p className="text-base font-semibold text-gray-900">
            {formatMoney(b["2025 approved"])}
          </p>
        </a>

        <div className="flex justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-gray-400">
            <path d="M8 2 L8 12 M5 9 L8 12 L11 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <a
          href="https://www.un.org/en/ga/fifth/80/ppb2026.shtml"
          target="_blank"
          rel="noopener noreferrer"
          className="block cursor-pointer rounded-lg border border-un-blue/50 bg-un-blue/10 px-3 py-2 text-center transition-colors hover:border-un-blue/60 hover:bg-un-blue/20"
        >
          <p className="text-xs text-un-blue mb-0.5">2026 Proposed</p>
          <p className="text-base font-semibold text-gray-900">
            {formatMoney(b["2026 proposed programme budget"])}
          </p>
        </a>

        <div className="flex justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-gray-400">
            <path d="M8 2 L8 12 M5 9 L8 12 L11 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <a
          href="https://docs.un.org/en/A/80/400"
          target="_blank"
          rel="noopener noreferrer"
          className="block cursor-pointer rounded-lg border-2 border-un-blue bg-un-blue/15 px-3 py-2 text-center transition-colors hover:bg-un-blue/25"
        >
          <p className="text-xs text-un-blue mb-0.5">2026 Revised</p>
          <p className="text-base font-bold text-gray-900">
            {formatMoney(b["2026 revised estimate"])}
          </p>
        </a>

        <div className="flex justify-center items-center gap-1.5 py-1.5 text-xs">
          <span className="text-gray-500">vs. 2025:</span>
          <VarianceBadge value={varianceVs2025} />
        </div>

        <div className="flex justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-gray-400">
            <path d="M8 2 L8 12 M5 9 L8 12 L11 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <div className="rounded-lg border-2 border-dashed border-gray-400 bg-gray-50 px-3 py-2 text-center">
          <p className="text-xs text-gray-500 mb-0.5">2026 Approved</p>
          <p className="text-base font-semibold text-gray-400">TBD</p>
        </div>
      </div>

      {/* Desktop: Horizontal Layout */}
      <div className="hidden max-w-2xl md:block">
        {/* Four boxes in a row */}
        <div className="flex items-center gap-1 text-center">
          <a
            href="https://www.un.org/en/ga/fifth/79/ppb2025.shtml"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 cursor-pointer rounded-lg border border-gray-400 bg-gray-600/10 px-3 py-2 transition-colors hover:border-gray-500 hover:bg-gray-600/20"
          >
            <p className="text-xs text-gray-600">2025 Approved</p>
            <p className="text-base font-semibold text-gray-900">
              {formatMoney(b["2025 approved"])}
            </p>
          </a>
          <span className="text-gray-400">→</span>
          <a
            href="https://www.un.org/en/ga/fifth/80/ppb2026.shtml"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 cursor-pointer rounded-lg border border-un-blue/50 bg-un-blue/10 px-3 py-2 transition-colors hover:border-un-blue/60 hover:bg-un-blue/20"
          >
            <p className="text-xs text-un-blue">2026 Proposed</p>
            <p className="text-base font-semibold text-gray-900">
              {formatMoney(b["2026 proposed programme budget"])}
            </p>
          </a>
          <span className="text-gray-400">→</span>
          <a
            href="https://docs.un.org/en/A/80/400"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 cursor-pointer rounded-lg border-2 border-un-blue bg-un-blue/15 px-3 py-2 transition-colors hover:bg-un-blue/25"
          >
            <p className="text-xs text-un-blue">2026 Revised</p>
            <p className="text-base font-bold text-gray-900">
              {formatMoney(b["2026 revised estimate"])}
            </p>
          </a>
          <span className="text-gray-400">→</span>
          <div className="flex-1 rounded-lg border-2 border-dashed border-gray-400 bg-gray-50 px-3 py-2 text-center">
            <p className="text-xs text-gray-500">2026 Approved</p>
            <p className="text-base font-semibold text-gray-900">$X.XXB</p>
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
              x2="62.5%"
              y2="50%"
              stroke="#d1d5db"
              strokeWidth="1"
              markerEnd="url(#arrowhead-overview)"
            />
            <circle cx="16.67%" cy="50%" r="3" fill="#9ca3af" />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center" style={{ paddingLeft: "16.67%", paddingRight: "37.5%" }}>
            <div className="flex w-full justify-center">
              <VarianceBadge value={varianceVs2025} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
