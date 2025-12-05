'use client';

import { TreemapEntity, DetailItem, Narrative } from '@/types';
import { formatMoney, formatVariance, getArrow } from '@/lib/format';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EntityModalProps {
  entity: TreemapEntity | null;
  onClose: () => void;
}

// Extract part number from "Part I", "Part II", etc.
const getPartNumber = (part: string): string => {
  const match = part.match(/Part\s+(\S+)/);
  return match ? match[1] : part;
};

export default function EntityModal({ entity, onClose }: EntityModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [narratives, setNarratives] = useState<Narrative[]>([]);
  const [loadingNarratives, setLoadingNarratives] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!entity) return;
    
    setLoadingNarratives(true);
    fetch('/details.json')
      .then(res => res.json())
      .then((data: DetailItem[]) => {
        const match = data.find(d => 
          d.entity === entity.name || 
          d.entity === entity.budgetItem.chapter_title ||
          d.entity === entity.budgetItem['Entity name']
        );
        setNarratives(match?.narratives || []);
      })
      .catch(() => setNarratives([]))
      .finally(() => setLoadingNarratives(false));
  }, [entity]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    if (touchStart - touchEnd < -minSwipeDistance) handleClose();
  };

  useEffect(() => {
    const original = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = original; };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!entity) return null;

  const b = entity.budgetItem;


  const varianceVsProposed = b['Variance (excluding resources redeployed for consolidation) – Compared with 2026 proposed programme budget (percentage)'];
  const varianceVs2025 = b['Variance (excluding resources redeployed for consolidation) – Compared with 2025 approved (percentage)'];

  const formatNarrativeText = (text: string) => {
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 60) {
      const beforeColon = text.substring(0, colonIndex);
      if (!beforeColon.includes('.')) {
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
        className="bg-gray-50 rounded-lg p-3"
        style={{ marginLeft: indent }}
      >
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-un-blue text-white text-xs font-medium">
              {n.prefix}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed flex-1">
            {formatNarrativeText(n.text)}
          </p>
        </div>
      </div>
    );
  };

  const VarianceBadge = ({ value, small }: { value: number | null; small?: boolean }) => (
    <span className={`font-medium rounded whitespace-nowrap ${small ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'} ${
      (value ?? 0) < 0 ? 'bg-red-100 text-red-700' : 
      (value ?? 0) > 0 ? 'bg-green-100 text-green-700' : 
      'bg-gray-100 text-gray-600'
    }`}>
      {formatVariance(value)}
    </span>
  );

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-end z-50 transition-all duration-300 ease-out ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`w-full sm:w-2/3 md:w-1/2 lg:w-2/5 xl:w-1/3 sm:min-w-[400px] lg:min-w-[500px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out overflow-y-auto ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{entity.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Part {getPartNumber(entity.part)}: {entity.partName}
              </p>
              <p className="text-xs text-gray-400">
                Section {entity.section}: {entity.sectionName}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 pb-12 space-y-6">
          {/* Budget Flow */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Budget</h3>
            
            {/* Three boxes in a row */}
            <div className="flex items-center gap-1 text-center">
              <div className="bg-gray-100 rounded-lg px-3 py-2 flex-1">
                <p className="text-xs text-gray-500">2025 Approved</p>
                <p className="text-sm font-semibold text-gray-900">{formatMoney(b['2025 approved'])}</p>
              </div>
              <span className="text-gray-400">→</span>
              <div className="bg-gray-100 rounded-lg px-3 py-2 flex-1">
                <p className="text-xs text-gray-500">2026 Proposed</p>
                <p className="text-sm font-semibold text-gray-900">{formatMoney(b['2026 proposed programme budget'])}</p>
              </div>
              <span className="text-gray-400">→</span>
              <div className="bg-un-blue/10 rounded-lg px-3 py-2 flex-1 border border-un-blue/20">
                <p className="text-xs text-un-blue">2026 Revised</p>
                <p className="text-sm font-bold text-un-blue">{formatMoney(b['2026 revised estimate'])}</p>
              </div>
            </div>

            {/* Variance arrows using SVG */}
            <div className="relative h-16 mt-2">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
                  </marker>
                </defs>
                {/* Line 1: 2025 approved (16.67%) → 2026 revised (83.33%) */}
                <line x1="16.67%" y1="25%" x2="83.33%" y2="25%" stroke="#d1d5db" strokeWidth="1" markerEnd="url(#arrowhead)" />
                {/* Line 2: 2026 proposed (50%) → 2026 revised (83.33%) */}
                <line x1="50%" y1="75%" x2="83.33%" y2="75%" stroke="#d1d5db" strokeWidth="1" markerEnd="url(#arrowhead)" />
                {/* Start dots */}
                <circle cx="16.67%" cy="25%" r="3" fill="#9ca3af" />
                <circle cx="50%" cy="75%" r="3" fill="#9ca3af" />
              </svg>
              {/* Variance badges positioned over the lines */}
              <div className="absolute inset-0 flex flex-col justify-around pointer-events-none">
                <div className="flex justify-center" style={{ paddingLeft: '16.67%', paddingRight: '16.67%' }}>
                  <VarianceBadge value={varianceVs2025} small />
                </div>
                <div className="flex justify-center" style={{ paddingLeft: '50%', paddingRight: '16.67%' }}>
                  <VarianceBadge value={varianceVsProposed} small />
                </div>
              </div>
            </div>
          </section>

          {/* UN80 Changes */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">UN80 Changes</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-600">Relocation</td>
                    <td className="px-3 py-2 text-right text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Relocation'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Relocation'], true)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-600">Consolidation</td>
                    <td className="px-3 py-2 text-right text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Consolidation'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Consolidation'], true)}</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-3 py-2 text-gray-600">Other</td>
                    <td className="px-3 py-2 text-right text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Other'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Other'], true)}</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="px-3 py-2 font-semibold text-gray-900">Total</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{getArrow(b['UN80 changes (excluding transitional capacities) – Total'])}{formatMoney(b['UN80 changes (excluding transitional capacities) – Total'], true)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {b['Transitional capacities'] !== null && b['Transitional capacities'] !== 0 && (
              <div className="mt-2 bg-amber-50 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-sm text-amber-700">Transitional Capacities</span>
                <span className="text-sm font-medium text-amber-900">{getArrow(b['Transitional capacities'])}{formatMoney(b['Transitional capacities'], true)}</span>
              </div>
            )}
          </section>

          {/* Narratives */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Details</h3>
            {loadingNarratives ? (
              <div className="space-y-2">
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : narratives.length > 0 ? (
              <div className="space-y-2">
                {narratives.map(renderNarrative)}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No detailed narrative available for this entity.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
