import React from 'react';
import { ToolMode, ProjectSettings } from '../types/model';
import { Point2D } from '../math/geometry';
import { Crosshair, Magnet, Layers } from 'lucide-react';

interface StatusBarProps {
  cursorWorld: Point2D;
  activeTool: ToolMode;
  settings: ProjectSettings;
  wallCount: number;
  furnitureCount: number;
  roomCount: number;
  totalArea: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorWorld,
  activeTool,
  settings,
  wallCount,
  furnitureCount,
  roomCount,
  totalArea,
}) => {
  const toolNames: Record<ToolMode, string> = {
    select: 'Select & Manipulate (V)',
    wall: 'Draw Wall (W)',
    door: 'Place Door (D)',
    window: 'Place Window (N)',
    furniture: 'Furniture Catalog (F)',
    measure: 'Tape Measure (M)',
    pan: 'Pan Viewport (H)',
  };

  return (
    <footer className="h-6 w-full bg-neutral-950 border-t border-neutral-800 flex items-center justify-between px-3 text-[11px] text-neutral-400 select-none z-20">
      {/* Left: Active Tool & Coordinates */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-medium text-neutral-300">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>{toolNames[activeTool]}</span>
        </div>

        <div className="flex items-center gap-1 font-mono text-neutral-400">
          <Crosshair className="w-3 h-3 text-neutral-500" />
          <span>
            X: {cursorWorld.x >= 0 ? `+${cursorWorld.x.toFixed(2)}` : cursorWorld.x.toFixed(2)}m
          </span>
          <span className="text-neutral-600">/</span>
          <span>
            Y: {cursorWorld.y >= 0 ? `+${cursorWorld.y.toFixed(2)}` : cursorWorld.y.toFixed(2)}m
          </span>
        </div>
      </div>

      {/* Center: Keyboard shortcuts reminder */}
      <div className="hidden md:flex items-center gap-3 text-neutral-500 text-[10px]">
        <span><kbd className="px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">Space</kbd> + Drag to Pan</span>
        <span>•</span>
        <span><kbd className="px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">Wheel</kbd> Zoom</span>
        <span>•</span>
        <span><kbd className="px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">Del</kbd> Delete</span>
        <span>•</span>
        <span><kbd className="px-1 py-0.2 bg-neutral-900 border border-neutral-800 rounded text-neutral-400">Esc</kbd> Cancel</span>
      </div>

      {/* Right: Space Stats */}
      <div className="flex items-center gap-3 font-mono">
        <div className="flex items-center gap-1">
          <Magnet className="w-3 h-3 text-neutral-500" />
          <span>{settings.snapToGrid ? `Snap ${settings.gridSnap}m` : 'Snap Off'}</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
          <Layers className="w-3 h-3" />
          <span>{totalArea.toFixed(1)} m²</span>
        </div>

        <span className="text-neutral-500">
          {wallCount} walls • {furnitureCount} items
        </span>
      </div>
    </footer>
  );
};

