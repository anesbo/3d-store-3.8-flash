import React, { useState, useMemo } from 'react';
import { DesignAlternative, FurnitureCategory } from '../types/model';
import { distance } from '../math/geometry';
import { X, Download, DollarSign, Layers, Box, CheckCircle2, Filter } from 'lucide-react';

interface BomModalProps {
  isOpen: boolean;
  onClose: () => void;
  alternative: DesignAlternative;
}

interface BomLineItem {
  id: string;
  name: string;
  category: 'Finishes' | 'Openings' | 'Furniture' | 'Fixtures' | 'Lighting';
  dimensions: string;
  quantity: number;
  unit: string;
  unitRate: number;
  totalCost: number;
}

export const BomModal: React.FC<BomModalProps> = ({ isOpen, onClose, alternative }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Compute BOM line items
  const { lineItems, totals } = useMemo(() => {
    const items: BomLineItem[] = [];
    const vertexMap = new Map(alternative.vertices.map((v) => [v.id, v]));

    // 1. Flooring Finishes
    alternative.rooms.forEach((room) => {
      items.push({
        id: `floor-${room.id}`,
        name: `Flooring: ${room.name} (${room.flooringMaterial.replace('_', ' ')})`,
        category: 'Finishes',
        dimensions: `${room.area.toFixed(1)} m² floor area`,
        quantity: room.area,
        unit: 'm²',
        unitRate: room.unitCostPerSqMeter,
        totalCost: Math.round(room.area * room.unitCostPerSqMeter),
      });
    });

    // 2. Wall Finishes
    let totalWallArea = 0;
    alternative.walls.forEach((wall) => {
      const v1 = vertexMap.get(wall.startVertexId);
      const v2 = vertexMap.get(wall.endVertexId);
      if (!v1 || !v2) return;

      const len = distance(v1, v2);
      const grossArea = len * wall.height * 2; // both sides

      // Subtract opening cutouts
      const opCutout = alternative.openings
        .filter((o) => o.wallId === wall.id)
        .reduce((sum, o) => sum + o.width * o.height * 2, 0);

      const netArea = Math.max(0, grossArea - opCutout);
      totalWallArea += netArea;
    });

    if (totalWallArea > 0) {
      const wallRate = 22; // $22/m² commercial paint/plaster finish
      items.push({
        id: 'wall-finishes-paint',
        name: 'Architectural Wall Finish & Paint',
        category: 'Finishes',
        dimensions: `${totalWallArea.toFixed(1)} m² net surface`,
        quantity: Math.round(totalWallArea * 10) / 10,
        unit: 'm²',
        unitRate: wallRate,
        totalCost: Math.round(totalWallArea * wallRate),
      });
    }

    // 3. Openings (Doors & Windows)
    const doorCount = alternative.openings.filter((o) => o.type === 'door').length;
    if (doorCount > 0) {
      items.push({
        id: 'openings-doors',
        name: 'Commercial Passage & Restroom Doors',
        category: 'Openings',
        dimensions: 'Hinged commercial doors w/ hardware',
        quantity: doorCount,
        unit: 'ea',
        unitRate: 480,
        totalCost: doorCount * 480,
      });
    }

    const winCount = alternative.openings.filter((o) => o.type === 'window').length;
    if (winCount > 0) {
      items.push({
        id: 'openings-windows',
        name: 'Glazed Storefront & Partition Windows',
        category: 'Openings',
        dimensions: 'Tempered acoustic double-glazed units',
        quantity: winCount,
        unit: 'ea',
        unitRate: 620,
        totalCost: winCount * 620,
      });
    }

    // 4. Furniture & Fixtures Schedule (grouped by catalogId)
    const groupedFurniture = new Map<string, { item: typeof alternative.furniture[0]; count: number }>();
    alternative.furniture.forEach((f) => {
      const key = `${f.catalogId}_${f.width.toFixed(2)}_${f.depth.toFixed(2)}`;
      if (groupedFurniture.has(key)) {
        groupedFurniture.get(key)!.count += 1;
      } else {
        groupedFurniture.set(key, { item: f, count: 1 });
      }
    });

    groupedFurniture.forEach(({ item, count }, key) => {
      let cat: 'Furniture' | 'Fixtures' | 'Lighting' = 'Furniture';
      if (item.category === 'lighting') cat = 'Lighting';
      else if (item.category === 'retail' || item.category === 'decor') cat = 'Fixtures';

      items.push({
        id: `furn-${key}`,
        name: item.name,
        category: cat,
        dimensions: `${item.width.toFixed(2)}m × ${item.depth.toFixed(2)}m × ${item.height.toFixed(2)}m`,
        quantity: count,
        unit: 'ea',
        unitRate: item.unitPrice,
        totalCost: count * item.unitPrice,
      });
    });

    // Summary Totals
    const totalBudget = items.reduce((sum, item) => sum + item.totalCost, 0);
    const totalFloorArea = alternative.rooms.reduce((sum, r) => sum + r.area, 0);
    const furnitureCount = alternative.furniture.length;

    return {
      lineItems: items,
      totals: {
        budget: totalBudget,
        floorArea: totalFloorArea,
        wallArea: totalWallArea,
        furnitureCount,
      },
    };
  }, [alternative]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (selectedCategory === 'All') return lineItems;
    return lineItems.filter((item) => item.category === selectedCategory);
  }, [lineItems, selectedCategory]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['Item Name', 'Category', 'Dimensions', 'Quantity', 'Unit', 'Unit Rate ($)', 'Total Cost ($)'];
    const rows = lineItems.map((item) => [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${item.dimensions.replace(/"/g, '""')}"`,
      item.quantity,
      `"${item.unit}"`,
      item.unitRate,
      item.totalCost,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Forma_BOM_Schedule_${alternative.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const categories = ['All', 'Finishes', 'Openings', 'Furniture', 'Fixtures', 'Lighting'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Bill of Materials & Cost Estimate
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live automated quantity schedule for <span className="text-neutral-200 font-medium">{alternative.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-4 gap-3 p-6 bg-neutral-950/30 border-b border-neutral-800">
          <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Total Est. Budget</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              ${totals.budget.toLocaleString()}
            </div>
            <span className="text-[10px] text-neutral-500">Materials & Furnishings</span>
          </div>

          <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Total Floor Area</span>
            <div className="text-2xl font-bold text-sky-400 mt-1 font-mono">
              {totals.floorArea.toFixed(1)} <span className="text-sm font-normal text-neutral-400">m²</span>
            </div>
            <span className="text-[10px] text-neutral-500">{alternative.rooms.length} Detected Rooms</span>
          </div>

          <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Net Wall Surface</span>
            <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">
              {totals.wallArea.toFixed(1)} <span className="text-sm font-normal text-neutral-400">m²</span>
            </div>
            <span className="text-[10px] text-neutral-500">{alternative.walls.length} Walls Built</span>
          </div>

          <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">Furniture & Fixtures</span>
            <div className="text-2xl font-bold text-purple-400 mt-1 font-mono">
              {totals.furnitureCount} <span className="text-sm font-normal text-neutral-400">items</span>
            </div>
            <span className="text-[10px] text-neutral-500">Commercial Catalog</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-neutral-900/60 border-b border-neutral-800/80 text-xs">
          <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full transition ${
                selectedCategory === cat
                  ? 'bg-neutral-200 text-neutral-900 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Line Items Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 pb-2">
                <th className="font-semibold py-2">Item Description</th>
                <th className="font-semibold py-2">Category</th>
                <th className="font-semibold py-2">Specs / Dimensions</th>
                <th className="font-semibold py-2 text-right">Qty</th>
                <th className="font-semibold py-2 text-right">Unit Rate</th>
                <th className="font-semibold py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/40 transition">
                  <td className="py-2.5 font-medium text-neutral-200">{item.name}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-300">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-2.5 text-neutral-400">{item.dimensions}</td>
                  <td className="py-2.5 text-right font-mono text-neutral-300">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2.5 text-right font-mono text-neutral-400">${item.unitRate}</td>
                  <td className="py-2.5 text-right font-mono font-semibold text-emerald-400">
                    ${item.totalCost.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 text-xs text-neutral-400">
          <span>Rates are modeled based on standard US commercial fitout cost benchmarks.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
