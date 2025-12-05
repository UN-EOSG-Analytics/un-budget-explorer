'use client';

import { BudgetItem } from '@/types';
import { formatMoney, formatVariance, getArrow } from '@/lib/format';

interface BudgetOverviewProps {
  grandTotal: BudgetItem;
}

export default function BudgetOverview({ grandTotal }: BudgetOverviewProps) {
  const b = grandTotal;
  const varianceVs2025 = b['Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)'];
  const varianceVsProposed = b['Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)'];

  const VarianceBadge = ({ value }: { value: number | null }) => (
    <span className={`text-xs font-medium rounded px-1.5 py-0.5 whitespace-nowrap ${
      (value ?? 0) < 0 ? 'bg-red-100 text-red-700' : 
      (value ?? 0) > 0 ? 'bg-green-100 text-green-700' : 
      'bg-gray-100 text-gray-600'
    }`}>
      {formatVariance(value)}
    </span>
  );

  return (
    <section className="mb-12">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Total Budget Evolution</h2>
      <p className="text-sm text-gray-600 mb-6">Overview of the 2026 revised estimates compared to 2025 approved and 2026 proposed budgets.</p>
      
      <div className="max-w-2xl">
        {/* Three boxes in a row */}
        <div className="flex items-center gap-1 text-center">
          <div className="bg-gray-100 rounded-lg px-3 py-2 flex-1">
            <p className="text-xs text-gray-500">2025 Approved</p>
            <p className="text-base font-semibold text-gray-900">{formatMoney(b['2025 approved'])}</p>
          </div>
          <span className="text-gray-400">→</span>
          <div className="bg-gray-100 rounded-lg px-3 py-2 flex-1">
            <p className="text-xs text-gray-500">2026 Proposed</p>
            <p className="text-base font-semibold text-gray-900">{formatMoney(b['2026 proposed programme budget'])}</p>
          </div>
          <span className="text-gray-400">→</span>
          <div className="bg-un-blue/10 rounded-lg px-3 py-2 flex-1 border border-un-blue/20">
            <p className="text-xs text-un-blue">2026 Revised</p>
            <p className="text-base font-bold text-un-blue">{formatMoney(b['2026 revised estimate'])}</p>
          </div>
        </div>

        {/* Variance arrows using SVG */}
        <div className="relative h-14 mt-2">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <marker id="arrowhead-overview" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
              </marker>
            </defs>
            <line x1="16.67%" y1="25%" x2="83.33%" y2="25%" stroke="#d1d5db" strokeWidth="1" markerEnd="url(#arrowhead-overview)" />
            <line x1="50%" y1="75%" x2="83.33%" y2="75%" stroke="#d1d5db" strokeWidth="1" markerEnd="url(#arrowhead-overview)" />
            <circle cx="16.67%" cy="25%" r="3" fill="#9ca3af" />
            <circle cx="50%" cy="75%" r="3" fill="#9ca3af" />
          </svg>
          <div className="absolute inset-0 flex flex-col justify-around pointer-events-none">
            <div className="flex justify-center" style={{ paddingLeft: '16.67%', paddingRight: '16.67%' }}>
              <VarianceBadge value={varianceVs2025} />
            </div>
            <div className="flex justify-center" style={{ paddingLeft: '50%', paddingRight: '16.67%' }}>
              <VarianceBadge value={varianceVsProposed} />
            </div>
          </div>
        </div>

        {/* UN80 Changes - positioned below second variance arrow (50% to 83.33%) */}
        <div className="relative mt-2" style={{ marginLeft: '50%', width: '33.33%' }}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">UN80 Changes</p>
          <div className="bg-gray-50 rounded text-xs">
            <div className="flex justify-between px-2 py-1 border-b border-gray-200">
              <span className="text-gray-600">Relocation</span>
              <span className="text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Relocation'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Relocation'], true)}</span>
            </div>
            <div className="flex justify-between px-2 py-1 border-b border-gray-200">
              <span className="text-gray-600">Consolidation</span>
              <span className="text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Consolidation'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Consolidation'], true)}</span>
            </div>
            <div className="flex justify-between px-2 py-1 border-b border-gray-200">
              <span className="text-gray-600">Other</span>
              <span className="text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Other'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Other'], true)}</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-gray-100 font-medium rounded-b">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Total'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Total'], true)}</span>
            </div>
          </div>
          {b['Transitional capacities'] !== null && b['Transitional capacities'] !== 0 && (
            <div className="mt-1 bg-amber-50 rounded px-2 py-1 flex justify-between text-xs">
              <span className="text-amber-700">Transitional Capacities</span>
              <span className="font-medium text-amber-900">{getArrow(b['Transitional capacities'])}{formatMoney(b['Transitional capacities'], true)}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

