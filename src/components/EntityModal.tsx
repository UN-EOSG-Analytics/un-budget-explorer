'use client';

import { TreemapEntity, DetailItem, Narrative, ResourceTable } from '@/types';
import { formatMoney, formatVariance, getArrow } from '@/lib/format';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

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
  const [resourceTable, setResourceTable] = useState<ResourceTable | null>(null);
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
    fetch(`${basePath}/details.json`)
      .then(res => res.json())
      .then((data: DetailItem[]) => {
        const match = data.find(d => 
          d.entity === entity.name || 
          d.entity === entity.budgetItem.chapter_title ||
          d.entity === entity.budgetItem['Entity name']
        );
        setNarratives(match?.narratives || []);
        setResourceTable(match?.resource_table || null);
      })
      .catch(() => { setNarratives([]); setResourceTable(null); })
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

          {/* Resource Changes Chart */}
          {resourceTable && resourceTable.rows.length > 0 && (() => {
            const parseNum = (s: string) => parseFloat(s) || 0;
            const rows = resourceTable.rows
              .filter(r => !r[0].toLowerCase().includes('variance') && !r[0].toLowerCase().includes('total'))
              .map(r => ({
                label: r[0].replace(/^[IVX]+\.\t/, ''),
                approved: parseNum(r[1]),
                proposed: parseNum(r[2]),
                consolidation: parseNum(r[3]),
                other: parseNum(r[4]),
                revised: parseNum(r[5]),
              }));
            const globalMax = Math.max(...rows.flatMap(r => [Math.abs(r.approved), Math.abs(r.proposed), Math.abs(r.revised)]));
            const MAX_H = 40; // max height in pixels
            const MIN_H = 8;  // min height in pixels
            
            return (
              <section>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Resource Changes by Object</h3>
                {/* Header */}
                <div className="flex text-[10px] text-gray-500 mb-2">
                  <div className="w-28 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-5 gap-1 text-center items-end">
                    <span>2025 Approved</span>
                    <span>2026 Proposed</span>
                    <span>Consolidation</span>
                    <span>Other</span>
                    <span>2026<br/>Revised</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {rows.map((row, i) => {
                    // Row's max value determines its height
                    const rowMax = Math.max(row.approved, row.proposed, row.revised);
                    const rowH = Math.max(MIN_H, (rowMax / globalMax) * MAX_H);
                    // Scale within this row (100% = rowMax)
                    const scale = (v: number) => rowMax > 0 ? (v / rowMax) * 100 : 0;
                    // Waterfall positions
                    const afterConsol = row.proposed + row.consolidation;
                    const consolTop = row.consolidation < 0 ? scale(afterConsol) : scale(row.proposed);
                    const consolH = rowMax > 0 ? (Math.abs(row.consolidation) / rowMax) * 100 : 0;
                    const afterOther = afterConsol + row.other;
                    const otherTop = row.other < 0 ? scale(afterOther) : scale(afterConsol);
                    const otherH = rowMax > 0 ? (Math.abs(row.other) / rowMax) * 100 : 0;
                    
                    return (
                      <div key={i} className="flex items-center group relative">
                        <div className="w-28 flex-shrink-0 text-[10px] truncate pr-2 text-gray-600" title={row.label}>
                          {row.label}
                        </div>
                        <div className="flex-1 grid grid-cols-5 gap-1 relative" style={{ height: rowH }}>
                          {/* 2025 Approved */}
                          <div className="relative">
                            <div className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded" style={{ height: `${Math.max(2, scale(row.approved))}%` }} />
                          </div>
                          {/* 2026 Proposed */}
                          <div className="relative">
                            <div className="absolute bottom-0 left-0 right-0 bg-gray-400 rounded" style={{ height: `${Math.max(2, scale(row.proposed))}%` }} />
                          </div>
                          {/* Consolidation - waterfall positioned */}
                          <div className="relative">
                            {row.consolidation !== 0 ? (
                              <div 
                                className={`absolute left-0 right-0 rounded ${row.consolidation < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ bottom: `${consolTop}%`, height: `${Math.max(2, consolH)}%` }} 
                              />
                            ) : (
                              <div className="absolute left-0 right-0 h-px bg-gray-300" style={{ bottom: `${scale(row.proposed)}%` }} />
                            )}
                          </div>
                          {/* Other - waterfall positioned */}
                          <div className="relative">
                            {row.other !== 0 ? (
                              <div 
                                className={`absolute left-0 right-0 rounded ${row.other < 0 ? 'bg-red-500' : 'bg-green-500'}`} 
                                style={{ bottom: `${otherTop}%`, height: `${Math.max(2, otherH)}%` }} 
                              />
                            ) : (
                              <div className="absolute left-0 right-0 h-px bg-gray-300" style={{ bottom: `${scale(afterConsol)}%` }} />
                            )}
                          </div>
                          {/* 2026 Revised */}
                          <div className="relative">
                            <div className="absolute bottom-0 left-0 right-0 bg-un-blue rounded" style={{ height: `${Math.max(2, scale(row.revised))}%` }} />
                          </div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute left-28 top-1/2 -translate-y-1/2 ml-2 bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                          <p className="font-medium text-xs text-gray-900 mb-2">{row.label}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                            <span className="text-gray-500">2025 Approved</span>
                            <span className="text-right text-gray-900">{formatMoney(row.approved * 1000)}</span>
                            <span className="text-gray-500">2026 Proposed</span>
                            <span className="text-right text-gray-900">{formatMoney(row.proposed * 1000)}</span>
                            <span className="text-gray-500">Consolidation</span>
                            <span className={`text-right ${row.consolidation < 0 ? 'text-red-600' : row.consolidation > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {row.consolidation !== 0 ? `${getArrow(row.consolidation)}${formatMoney(Math.abs(row.consolidation) * 1000)}` : '—'}
                            </span>
                            <span className="text-gray-500">Other</span>
                            <span className={`text-right ${row.other < 0 ? 'text-red-600' : row.other > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {row.other !== 0 ? `${getArrow(row.other)}${formatMoney(Math.abs(row.other) * 1000)}` : '—'}
                            </span>
                            <span className="text-gray-500 font-medium">2026 Revised</span>
                            <span className="text-right text-un-blue font-medium">{formatMoney(row.revised * 1000)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

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
