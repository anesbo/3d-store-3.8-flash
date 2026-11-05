import React from 'react';
import { ToolMode } from '../types/model';
import {
  MousePointer,
  Square,
  DoorOpen,
  AppWindow,
  Store,
  Ruler,
  Hand,
} from 'lucide-react';

interface LeftSidebarProps {
  activeTool: ToolMode;
  isCatalogOpen: boolean;
  onSelectTool: (tool: ToolMode) => void;
  onToggleCatalog: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTool,
  isCatalogOpen,
  onSelectTool,
  onToggleCatalog,
}) => {
  const tools: { id: ToolMode; label: string; shortcut: string; icon: React.ReactNode }[] = [
    {
      id: 'select',
      label: 'Select / Move',
      shortcut: 'V',
      icon: <MousePointer className="w-4 h-4" />,
    },
    {
      id: 'wall',
      label: 'Draw Wall',
      shortcut: 'W',
      icon: <Square className="w-4 h-4" />,
    },
    {
      id: 'door',
      label: 'Insert Door',
      shortcut: 'D',
      icon: <DoorOpen className="w-4 h-4" />,
    },
    {
      id: 'window',
      label: 'Insert Window',
      shortcut: 'N',
      icon: <AppWindow className="w-4 h-4" />,
    },
    {
      id: 'measure',
      label: 'Tape Measure',
      shortcut: 'M',
      icon: <Ruler className="w-4 h-4" />,
    },
    {
      id: 'pan',
      label: 'Pan Canvas',
      shortcut: 'H',
      icon: <Hand className="w-4 h-4" />,
    },
  ];

  return (
    <div className="w-13 h-full bg-neutral-900 border-r border-neutral-800 flex flex-col items-center py-3 gap-1 z-20 select-none">
      {tools.map((t) => {
        const isActive = activeTool === t.id && (!isCatalogOpen || t.id !== 'furniture');
        return (
          <button
            key={t.id}
            onClick={() => onSelectTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
            className={`relative p-2.5 rounded-xl transition group ${
              isActive
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {t.icon}
            {/* Tooltip on hover */}
            <span className="absolute left-14 px-2 py-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-[11px] rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
              {t.label} <kbd className="text-neutral-400 text-[10px] ml-1">({t.shortcut})</kbd>
            </span>
          </button>
        );
      })}

      <div className="w-6 h-[1px] bg-neutral-800 my-1" />

      {/* Catalog toggle button */}
      <button
        onClick={onToggleCatalog}
        title="Commercial Furniture Catalog (F)"
        className={`relative p-2.5 rounded-xl transition group ${
          isCatalogOpen
            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
            : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
        }`}
      >
        <Store className="w-4 h-4" />
        <span className="absolute left-14 px-2 py-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-[11px] rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
          Catalog Items <kbd className="text-neutral-400 text-[10px] ml-1">(F)</kbd>
        </span>
      </button>
    </div>
  );
};

