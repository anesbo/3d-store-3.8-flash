import React, { useState, useMemo } from 'react';
import { FURNITURE_CATALOG, CatalogItemDef } from '../catalog/furnitureCatalog';
import { FurnitureCategory } from '../types/model';
import {
  Search,
  Armchair,
  UtensilsCrossed,
  Store,
  Flower2,
  Lightbulb,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';

interface CatalogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (catalogId: string) => void;
  onAddItemToCenter: (catalogId: string) => void;
}

export const CatalogDrawer: React.FC<CatalogDrawerProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  onAddItemToCenter,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredItems = useMemo(() => {
    return FURNITURE_CATALOG.filter((item) => {
      const matchesCat =
        selectedCategory === 'all' || item.category === selectedCategory;
      const matchesSearch =
        search === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  const categories: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Items', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'seating', label: 'Seating', icon: <Armchair className="w-3.5 h-3.5" /> },
    { id: 'surfaces', label: 'Surfaces', icon: <UtensilsCrossed className="w-3.5 h-3.5" /> },
    { id: 'retail', label: 'Retail & Service', icon: <Store className="w-3.5 h-3.5" /> },
    { id: 'decor', label: 'Decor & Screens', icon: <Flower2 className="w-3.5 h-3.5" /> },
    { id: 'lighting', label: 'Lighting', icon: <Lightbulb className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="absolute top-12 left-14 bottom-8 w-88 bg-neutral-900/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl flex flex-col z-30 overflow-hidden text-neutral-200 select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Store className="w-4 h-4 text-blue-400" />
            Commercial Item Catalog
          </h3>
          <p className="text-[11px] text-neutral-400">
            {FURNITURE_CATALOG.length} Procedural Three.js Models
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-neutral-800/80">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search fixtures, chairs, bars..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto mt-2.5 pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400'
              }`}
            >
              {c.icon}
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData('application/forma-catalog-id', item.id);
            }}
            className="p-3 bg-neutral-950/60 hover:bg-neutral-800/60 border border-neutral-800/80 hover:border-neutral-700 rounded-xl transition flex flex-col justify-between group cursor-grab active:cursor-grabbing"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                    {item.name}
                  </h4>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {item.defaultWidth.toFixed(2)}m × {item.defaultDepth.toFixed(2)}m × {item.defaultHeight.toFixed(2)}m
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ${item.defaultPrice}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-neutral-800/60">
              <span className="text-[10px] text-neutral-500 capitalize">
                {item.category}
              </span>
              <button
                onClick={() => onAddItemToCenter(item.id)}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600/90 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to Layout
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

