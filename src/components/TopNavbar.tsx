import React, { useState } from 'react';
import { Project, DesignAlternative, ViewMode } from '../types/model';
import { PRESET_PROJECTS } from '../presets/defaultProjects';
import {
  Undo2,
  Redo2,
  Columns,
  Square,
  Box,
  DollarSign,
  Download,
  Plus,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TopNavbarProps {
  project: Project;
  activeAlternative: DesignAlternative;
  viewMode: ViewMode;
  canUndo: boolean;
  canRedo: boolean;
  totalBudget: number;
  onUndo: () => void;
  onRedo: () => void;
  onSelectViewMode: (mode: ViewMode) => void;
  onSelectPresetProject: (presetId: string) => void;
  onSelectAlternative: (altId: string) => void;
  onCreateAlternative: (name: string) => void;
  onOpenBomModal: () => void;
  onOpenExportModal: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  project,
  activeAlternative,
  viewMode,
  canUndo,
  canRedo,
  totalBudget,
  onUndo,
  onRedo,
  onSelectViewMode,
  onSelectPresetProject,
  onSelectAlternative,
  onCreateAlternative,
  onOpenBomModal,
  onOpenExportModal,
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isAltDropdownOpen, setIsAltDropdownOpen] = useState(false);

  return (
    <header className="h-12 w-full bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-3 z-30 select-none">
      {/* Brand & Project Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-2 border-r border-neutral-800">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-blue-500/20">
            F
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white tracking-tight text-sm">Forma</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Project Preset Selector */}
        <div className="relative">
          <button
            onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-950/70 hover:bg-neutral-800/80 border border-neutral-800 rounded-lg text-xs font-semibold text-neutral-200 transition"
          >
            <span>{project.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1 z-50 text-xs">
              <span className="px-2.5 py-1 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">
                Commercial Layout Presets
              </span>
              {PRESET_PROJECTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectPresetProject(p.id);
                    setIsProjectDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition ${
                    project.id === p.id
                      ? 'bg-blue-600/20 text-blue-400 font-semibold'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Design Alternative / Variant Switcher */}
        <div className="relative">
          <button
            onClick={() => setIsAltDropdownOpen(!isAltDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-950/50 hover:bg-neutral-800 border border-neutral-800/80 rounded-lg text-xs text-neutral-300 transition"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium truncate max-w-[140px]">{activeAlternative.name}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isAltDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1 z-50 text-xs">
              <span className="px-2.5 py-1 text-[10px] text-neutral-500 font-semibold uppercase tracking-wider block">
                Design Alternatives
              </span>
              {project.alternatives.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => {
                    onSelectAlternative(alt.id);
                    setIsAltDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center justify-between ${
                    activeAlternative.id === alt.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span className="truncate">{alt.name}</span>
                </button>
              ))}
              <div className="border-t border-neutral-800 my-1" />
              <button
                onClick={() => {
                  onCreateAlternative(`Option ${String.fromCharCode(65 + project.alternatives.length)}`);
                  setIsAltDropdownOpen(false);
                }}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-neutral-800 text-blue-400 font-medium rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Branch New Variant</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Undo/Redo & View Mode Switcher */}
      <div className="flex items-center gap-3">
        {/* Undo & Redo */}
        <div className="flex items-center gap-0.5 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1.5 hover:text-white hover:bg-neutral-800 rounded disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1.5 hover:text-white hover:bg-neutral-800 rounded disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-0.5 p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 text-xs font-medium">
          <button
            onClick={() => onSelectViewMode('split')}
            title="Dual Synchronized View (2D + 3D)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
              viewMode === 'split' ? 'bg-neutral-800 text-white font-semibold' : 'hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Dual View</span>
          </button>
          <button
            onClick={() => onSelectViewMode('2d')}
            title="2D CAD Floorplan Only"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
              viewMode === '2d' ? 'bg-neutral-800 text-white font-semibold' : 'hover:text-white'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>2D Plan</span>
          </button>
          <button
            onClick={() => onSelectViewMode('3d')}
            title="3D Real-time PBR Scene Only"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
              viewMode === '3d' ? 'bg-neutral-800 text-white font-semibold' : 'hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Scene</span>
          </button>
        </div>
      </div>

      {/* Right: BOM Budget & Export */}
      <div className="flex items-center gap-2">
        {/* Live Budget Ticker Button */}
        <button
          onClick={onOpenBomModal}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition text-xs"
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-neutral-400">Budget:</span>
            <span className="font-bold text-emerald-400 font-mono">
              ${totalBudget.toLocaleString()}
            </span>
          </div>
        </button>

        {/* Export Dropdown Trigger */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-500/20 transition"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Hub</span>
        </button>
      </div>
    </header>
  );
};
