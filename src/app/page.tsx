'use client';

import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import BudgetTreemap from '@/components/BudgetTreemap';
import BudgetLollipop from '@/components/BudgetLollipop';
import EntityModal from '@/components/EntityModal';
import { BudgetItem, TreemapPart, TreemapSection, TreemapEntity } from '@/types';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function Home() {
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<TreemapEntity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${basePath}/budget.json`)
      .then(res => res.json())
      .then((data: BudgetItem[]) => {
        setBudgetData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const parts = useMemo(() => {
    if (budgetData.length === 0) return [];

    const partTotals = new Map<string, BudgetItem>();
    budgetData.filter(b => b.row_type === 'part_total').forEach(b => partTotals.set(b.Part, b));

    const partMap = new Map<string, { partName: string; sections: Map<string, { sectionName: string; entities: TreemapEntity[] }> }>();
    const entityRows = budgetData.filter(b => b.row_type === 'entity_total');
    const sectionRows = budgetData.filter(b => b.row_type === 'section_total');
    const sectionsWithEntities = new Set<string>();
    
    entityRows.forEach(b => {
      const budget = b['2026 revised estimate'];
      if (budget <= 0) return;
      
      const partKey = b.Part;
      const sectionKey = b.Section || 'default';
      sectionsWithEntities.add(`${partKey}-${sectionKey}`);
      
      if (!partMap.has(partKey)) {
        partMap.set(partKey, { partName: b['Part name'], sections: new Map() });
      }
      const part = partMap.get(partKey)!;
      
      if (!part.sections.has(sectionKey)) {
        part.sections.set(sectionKey, { sectionName: b['Section name'] || '', entities: [] });
      }
      
      const entity: TreemapEntity = {
        id: `${partKey}-${sectionKey}-${b['Entity name'] || b.chapter_title}`,
        name: b['Entity name'] || b.chapter_title || 'Unknown',
        part: partKey,
        partName: b['Part name'],
        section: sectionKey,
        sectionName: b['Section name'] || '',
        budget,
        budgetItem: b,
      };
      
      part.sections.get(sectionKey)!.entities.push(entity);
    });
    
    sectionRows.forEach(b => {
      const budget = b['2026 revised estimate'];
      if (budget <= 0) return;
      
      const partKey = b.Part;
      const sectionKey = b.Section || 'default';
      const sectionId = `${partKey}-${sectionKey}`;
      
      if (sectionsWithEntities.has(sectionId)) return;
      
      if (!partMap.has(partKey)) {
        partMap.set(partKey, { partName: b['Part name'], sections: new Map() });
      }
      const part = partMap.get(partKey)!;
      
      if (!part.sections.has(sectionKey)) {
        part.sections.set(sectionKey, { sectionName: b['Section name'] || '', entities: [] });
      }
      
      const entity: TreemapEntity = {
        id: `${partKey}-${sectionKey}-section`,
        name: b['Section name'] || 'Unknown Section',
        part: partKey,
        partName: b['Part name'],
        section: sectionKey,
        sectionName: b['Section name'] || '',
        budget,
        budgetItem: b,
      };
      
      part.sections.get(sectionKey)!.entities.push(entity);
    });

    const result: TreemapPart[] = [];
    const partOrder = ['Part I', 'Part II', 'Part III', 'Part IV', 'Part V', 'Part VI', 'Part VII', 'Part VIII', 'Part IX', 'Part X', 'Part XI', 'Part XII', 'Part XIII', 'Part XIV'];
    
    partOrder.forEach(partKey => {
      const partData = partMap.get(partKey);
      if (!partData) return;
      
      const sections: TreemapSection[] = [];
      let partTotal = 0;
      
      partData.sections.forEach((sectionData, sectionKey) => {
        const sectionTotal = sectionData.entities.reduce((sum, e) => sum + e.budget, 0);
        partTotal += sectionTotal;
        
        sections.push({
          section: sectionKey,
          sectionName: sectionData.sectionName,
          entities: sectionData.entities,
          totalBudget: sectionTotal,
        });
      });
      
      if (partTotal > 0) {
        const partTotalRow = partTotals.get(partKey);
        const approved2025 = partTotalRow?.['2025 approved'] ?? 0;
        const revised2026 = partTotalRow?.['2026 revised estimate'] ?? 0;
        const varianceVs2025 = approved2025 > 0 ? ((revised2026 - approved2025) / approved2025) * 100 : 0;
        
        result.push({
          part: partKey,
          partName: partData.partName,
          sections,
          totalBudget: partTotal,
          color: '',
          approved2025,
          varianceVs2025,
        });
      }
    });
    
    return result;
  }, [budgetData]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-4 sm:px-6 py-6 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Image
            src={`${basePath}/images/UN_Logo_Stacked_Colour_English.svg`}
            alt="UN Logo"
            width={48}
            height={48}
            className="h-10 w-auto select-none"
            draggable={false}
          />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">Budget Explorer</h1>
            <p className="text-xs sm:text-sm text-gray-500">Revised Estimates for 2026</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Intro Section */}
        <section className="mb-8">
          <p className="text-gray-700 leading-relaxed max-w-3xl">
            For additional details consult the source document of the{" "}
            <a 
              href="https://documents.un.org/symbol-explorer?s=A/80/400&i=A/80/400_1759797069261"
              target="_blank"
              rel="noopener noreferrer"
              className="text-un-blue hover:underline"
            >
              Revised Estimates 2026 (A/80/400).
            </a>
          </p>
        </section>

        {/* Treemap Section */}
        <section className="mb-16">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget Overview According to Revised Estimates 2026</h2>
          <p className="text-sm text-gray-600 mb-6">Area represents 2026 revised estimate. Click on any entity for details.</p>
          {loading ? (
            <div className="h-[1200px] flex items-center justify-center">
              <div className="text-gray-500">Loading budget data...</div>
            </div>
          ) : (
            <BudgetTreemap 
              parts={parts} 
              onEntityClick={setSelectedEntity}
            />
          )}
        </section>

        {/* Lollipop Chart Section */}
        {!loading && budgetData.length > 0 && (
          <section className="mb-16">
            <BudgetLollipop budgetData={budgetData} onEntityClick={setSelectedEntity} />
          </section>
        )}
      </main>

      {/* Modal */}
      {selectedEntity && (
        <EntityModal
          entity={selectedEntity}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  );
}
