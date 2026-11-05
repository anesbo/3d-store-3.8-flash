import React from 'react';
import {
  SelectionState,
  DesignAlternative,
  Wall,
  Opening,
  FurnitureItem,
  Room,
  ProjectSettings,
  WallFinish,
  FlooringFinish,
} from '../types/model';
import { distance } from '../math/geometry';
import {
  Sliders,
  Trash2,
  Copy,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Check,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  DoorOpen,
  Box,
  Compass,
} from 'lucide-react';

interface InspectorDrawerProps {
  selection: SelectionState;
  alternative: DesignAlternative;
  settings: ProjectSettings;
  onUpdateFurniture: (id: string, updates: Partial<FurnitureItem>) => void;
  onUpdateWall: (id: string, updates: Partial<Wall>) => void;
  onUpdateOpening: (id: string, updates: Partial<Opening>) => void;
  onUpdateRoom: (id: string, updates: Partial<Room>) => void;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onClose: () => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  selection,
  alternative,
  settings,
  onUpdateFurniture,
  onUpdateWall,
  onUpdateOpening,
  onUpdateRoom,
  onDeleteSelection,
  onDuplicateSelection,
  onClose,
}) => {
  const vertexMap = new Map(alternative.vertices.map((v) => [v.id, v]));

  // Selected entities
  const selectedFurniture =
    selection.type === 'furniture'
      ? alternative.furniture.find((f) => f.id === selection.id)
      : null;

  const selectedWall =
    selection.type === 'wall'
      ? alternative.walls.find((w) => w.id === selection.id)
      : null;

  const selectedOpening =
    selection.type === 'opening'
      ? alternative.openings.find((o) => o.id === selection.id)
      : null;

  const selectedRoom =
    selection.type === 'room'
      ? alternative.rooms.find((r) => r.id === selection.id)
      : null;

  // 1. FURNITURE INSPECTOR
  if (selectedFurniture) {
    const f = selectedFurniture;
    return (
      <div className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col text-neutral-200 text-xs select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Furniture Inspector</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDuplicateSelection}
              title="Duplicate (Ctrl+D)"
              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDeleteSelection}
              title="Delete (Del)"
              className="p-1 hover:bg-neutral-800 text-rose-400 hover:text-rose-300 rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name & Category */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">Item Name</label>
            <input
              type="text"
              value={f.name}
              onChange={(e) => onUpdateFurniture(f.id, { name: e.target.value })}
              className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-medium focus:border-blue-500 focus:outline-none"
            />
            <span className="inline-block mt-1 px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded text-[10px] font-mono capitalize">
              {f.category}
            </span>
          </div>

          {/* Dimensions (W, D, H) */}
          <div className="space-y-2">
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
              Dimensions (Meters)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-neutral-500">Width (X)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10.0"
                  value={f.width}
                  onChange={(e) => onUpdateFurniture(f.id, { width: Math.max(0.1, Number(e.target.value)) })}
                  className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500">Depth (Y)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10.0"
                  value={f.depth}
                  onChange={(e) => onUpdateFurniture(f.id, { depth: Math.max(0.1, Number(e.target.value)) })}
                  className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-500">Height (Z)</span>
                <input
                  type="number"
                  step="0.05"
                  min="0.01"
                  max="6.0"
                  value={f.height}
                  onChange={(e) => onUpdateFurniture(f.id, { height: Math.max(0.01, Number(e.target.value)) })}
                  className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Position & Elevation */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <span className="text-[10px] text-neutral-500">Position X</span>
              <input
                type="number"
                step="0.1"
                value={Number(f.x.toFixed(2))}
                onChange={(e) => onUpdateFurniture(f.id, { x: Number(e.target.value) })}
                className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500">Position Y</span>
              <input
                type="number"
                step="0.1"
                value={Number(f.y.toFixed(2))}
                onChange={(e) => onUpdateFurniture(f.id, { y: Number(e.target.value) })}
                className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500">Elevation</span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={Number(f.elevation.toFixed(2))}
                onChange={(e) => onUpdateFurniture(f.id, { elevation: Math.max(0, Number(e.target.value)) })}
                className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
              />
            </div>
          </div>

          {/* Rotation Control */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
                Rotation: {f.rotation}°
              </label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateFurniture(f.id, { rotation: (f.rotation + 90) % 360 })}
                  className="p-1 hover:bg-neutral-800 rounded text-neutral-300"
                  title="Rotate +90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={f.rotation}
              onChange={(e) => onUpdateFurniture(f.id, { rotation: Number(e.target.value) })}
              className="w-full mt-1.5 accent-blue-500 cursor-pointer h-1.5"
            />
          </div>

          {/* Color & Material Finish */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">Color / Tint</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={f.color || '#3b5443'}
                onChange={(e) => onUpdateFurniture(f.id, { color: e.target.value })}
                className="w-8 h-8 rounded border border-neutral-700 bg-neutral-950 cursor-pointer p-0.5"
              />
              <span className="font-mono text-neutral-400 uppercase text-[11px]">{f.color || '#3b5443'}</span>
            </div>
          </div>

          {/* Unit Cost Budget Rate */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
              Unit Rate (USD)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1.5 text-neutral-500 font-mono">$</span>
              <input
                type="number"
                min="0"
                step="10"
                value={f.unitPrice}
                onChange={(e) => onUpdateFurniture(f.id, { unitPrice: Math.max(0, Number(e.target.value)) })}
                className="w-full pl-6 pr-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-emerald-400 font-mono font-semibold"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. WALL INSPECTOR
  if (selectedWall) {
    const w = selectedWall;
    const v1 = vertexMap.get(w.startVertexId);
    const v2 = vertexMap.get(w.endVertexId);
    const wallLen = v1 && v2 ? distance(v1, v2) : 0;
    const grossArea = wallLen * w.height * 2;

    const wallFinishes: { id: WallFinish; label: string }[] = [
      { id: 'drywall_white', label: 'Drywall Matte White' },
      { id: 'drywall_dark', label: 'Drywall Charcoal' },
      { id: 'concrete', label: 'Polished Concrete' },
      { id: 'brick', label: 'Exposed Brick' },
      { id: 'tile_white', label: 'Ceramic Subway Tile' },
      { id: 'wood_panel', label: 'Slatted Timber Panel' },
    ];

    return (
      <div className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col text-neutral-200 text-xs select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Wall Inspector</span>
          </div>
          <button
            onClick={onDeleteSelection}
            title="Delete Wall"
            className="p-1 hover:bg-neutral-800 text-rose-400 hover:text-rose-300 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Wall Metrics */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div>
              <span className="text-[10px] text-neutral-500">Wall Length</span>
              <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                {wallLen.toFixed(3)} m
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500">Gross Area (2 sides)</span>
              <div className="text-base font-bold text-neutral-200 font-mono mt-0.5">
                {grossArea.toFixed(1)} m²
              </div>
            </div>
          </div>

          {/* Wall Thickness */}
          <div>
            <div className="flex justify-between">
              <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
                Thickness
              </label>
              <span className="font-mono text-cyan-400">{w.thickness.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.06"
              max="0.80"
              step="0.01"
              value={w.thickness}
              onChange={(e) => onUpdateWall(w.id, { thickness: Number(e.target.value) })}
              className="w-full mt-1 accent-cyan-400 cursor-pointer h-1.5"
            />
          </div>

          {/* Wall Height */}
          <div>
            <div className="flex justify-between">
              <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
                Height
              </label>
              <span className="font-mono text-cyan-400">{w.height.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="6.00"
              step="0.10"
              value={w.height}
              onChange={(e) => onUpdateWall(w.id, { height: Number(e.target.value) })}
              className="w-full mt-1 accent-cyan-400 cursor-pointer h-1.5"
            />
          </div>

          {/* Material Finish Preset */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
              Wall Finish Material
            </label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {wallFinishes.map((finish) => (
                <button
                  key={finish.id}
                  onClick={() =>
                    onUpdateWall(w.id, {
                      material: { ...w.material, finish: finish.id },
                    })
                  }
                  className={`p-2 rounded-lg text-left transition border ${
                    w.material.finish === finish.id
                      ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 font-medium'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-[11px] truncate">{finish.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. OPENING INSPECTOR (Door / Window)
  if (selectedOpening) {
    const op = selectedOpening;
    const wall = alternative.walls.find((w) => w.id === op.wallId);
    const v1 = wall ? vertexMap.get(wall.startVertexId) : null;
    const v2 = wall ? vertexMap.get(wall.endVertexId) : null;
    const wallLen = v1 && v2 ? distance(v1, v2) : 10;

    return (
      <div className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col text-neutral-200 text-xs select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <DoorOpen className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              {op.type === 'door' ? 'Door' : 'Window'} Inspector
            </span>
          </div>
          <button
            onClick={onDeleteSelection}
            title="Delete Opening"
            className="p-1 hover:bg-neutral-800 text-rose-400 hover:text-rose-300 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Type Switcher */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">Opening Type</label>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              <button
                onClick={() => onUpdateOpening(op.id, { type: 'door', sillHeight: 0, swingAngle: 90 })}
                className={`p-2 rounded-lg text-center transition border ${
                  op.type === 'door'
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                Door
              </button>
              <button
                onClick={() => onUpdateOpening(op.id, { type: 'window', sillHeight: 0.8, swingAngle: 0 })}
                className={`p-2 rounded-lg text-center transition border ${
                  op.type === 'window'
                    ? 'bg-sky-500/15 border-sky-500/60 text-sky-300 font-semibold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                Window
              </button>
            </div>
          </div>

          {/* Width & Height */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-neutral-500">Width</span>
              <input
                type="number"
                step="0.05"
                min="0.3"
                max={wallLen - 0.1}
                value={op.width}
                onChange={(e) => onUpdateOpening(op.id, { width: Math.max(0.3, Number(e.target.value)) })}
                className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500">Height</span>
              <input
                type="number"
                step="0.05"
                min="0.3"
                max="4.0"
                value={op.height}
                onChange={(e) => onUpdateOpening(op.id, { height: Math.max(0.3, Number(e.target.value)) })}
                className="w-full mt-0.5 px-2 py-1 bg-neutral-950 border border-neutral-800 rounded text-neutral-200 font-mono text-center"
              />
            </div>
          </div>

          {/* Offset along wall */}
          <div>
            <div className="flex justify-between">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                Corner Offset
              </span>
              <span className="font-mono text-neutral-300">{op.offset.toFixed(2)} m</span>
            </div>
            <input
              type="range"
              min="0.05"
              max={Math.max(0.1, wallLen - op.width - 0.05)}
              step="0.05"
              value={op.offset}
              onChange={(e) => onUpdateOpening(op.id, { offset: Number(e.target.value) })}
              className="w-full mt-1.5 accent-amber-400 cursor-pointer h-1.5"
            />
          </div>

          {/* Door Controls: Swing Angle & Flip */}
          {op.type === 'door' && (
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                    Door Swing: {op.swingAngle}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="110"
                  value={op.swingAngle}
                  onChange={(e) => onUpdateOpening(op.id, { swingAngle: Number(e.target.value) })}
                  className="w-full mt-1 accent-amber-400 cursor-pointer h-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpdateOpening(op.id, { flipSwing: !op.flipSwing })}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-300 font-medium"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                  Flip In/Out
                </button>
                <button
                  onClick={() => onUpdateOpening(op.id, { flipSide: !op.flipSide })}
                  className="flex items-center justify-center gap-1.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-300 font-medium"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  Flip Hinge
                </button>
              </div>
            </div>
          )}

          {/* Window Sill Height */}
          {op.type === 'window' && (
            <div>
              <div className="flex justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
                  Sill Height (Elevation)
                </span>
                <span className="font-mono text-neutral-300">{op.sillHeight.toFixed(2)} m</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={op.sillHeight}
                onChange={(e) => onUpdateOpening(op.id, { sillHeight: Number(e.target.value) })}
                className="w-full mt-1.5 accent-sky-400 cursor-pointer h-1.5"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. ROOM INSPECTOR
  if (selectedRoom) {
    const r = selectedRoom;
    const flooringOptions: { id: FlooringFinish; label: string; rate: number }[] = [
      { id: 'hardwood_herringbone', label: 'Herringbone Oak Planks', rate: 85 },
      { id: 'hardwood_natural', label: 'Natural Scandinavian Oak', rate: 75 },
      { id: 'polished_concrete', label: 'Polished Industrial Concrete', rate: 45 },
      { id: 'ceramic_tile', label: 'Porcelain Ceramic Tile', rate: 60 },
      { id: 'terrazzo_light', label: 'Light Venetian Terrazzo', rate: 95 },
      { id: 'terrazzo_dark', label: 'Anthracite Terrazzo', rate: 95 },
      { id: 'carpet_tile', label: 'Acoustic Commercial Carpet', rate: 40 },
      { id: 'slate_stone', label: 'Cleft Slate Stone', rate: 80 },
    ];

    const totalFlooringBudget = Math.round(r.area * r.unitCostPerSqMeter);

    return (
      <div className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col text-neutral-200 text-xs select-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Room & Finish Inspector</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Room Name */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">Room Label</label>
            <input
              type="text"
              value={r.name}
              onChange={(e) => onUpdateRoom(r.id, { name: e.target.value })}
              className="w-full mt-1 px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white font-medium focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Area & Perimeter */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div>
              <span className="text-[10px] text-neutral-500">Floor Surface</span>
              <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                {r.area.toFixed(1)} m²
              </div>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500">Perimeter</span>
              <div className="text-lg font-bold text-neutral-200 font-mono mt-0.5">
                {r.perimeter.toFixed(1)} m
              </div>
            </div>
          </div>

          {/* Flooring Material Selection */}
          <div>
            <label className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">
              Flooring Finish Material
            </label>
            <div className="space-y-1.5 mt-2">
              {flooringOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() =>
                    onUpdateRoom(r.id, {
                      flooringMaterial: opt.id,
                      unitCostPerSqMeter: opt.rate,
                    })
                  }
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition ${
                    r.flooringMaterial === opt.id
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white font-medium'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="font-mono text-[11px] text-emerald-400">${opt.rate}/m²</span>
                </button>
              ))}
            </div>
          </div>

          {/* Room Flooring Total Cost */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500">Subtotal Flooring Cost</span>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              ${totalFlooringBudget.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. DEFAULT OVERVIEW (Nothing Selected)
  const totalFloorArea = alternative.rooms.reduce((sum, r) => sum + r.area, 0);

  return (
    <div className="w-80 h-full bg-neutral-900 border-l border-neutral-800 flex flex-col text-neutral-200 text-xs select-none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-950/40">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">Space Overview</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Layout details */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Active Alternative</span>
            <h4 className="text-sm font-bold text-white mt-0.5">{alternative.name}</h4>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">{alternative.description}</p>
        </div>

        {/* Space Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500">Total Floor Area</span>
            <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
              {totalFloorArea.toFixed(1)} m²
            </div>
          </div>
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500">Rooms</span>
            <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">
              {alternative.rooms.length} zones
            </div>
          </div>
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500">Walls Built</span>
            <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
              {alternative.walls.length}
            </div>
          </div>
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
            <span className="text-[10px] text-neutral-500">Catalog Items</span>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {alternative.furniture.length}
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="p-3 bg-neutral-950/50 border border-neutral-800/80 rounded-xl space-y-1.5 text-neutral-400 text-[11px]">
          <span className="font-semibold text-neutral-200">Interactive Controls:</span>
          <p>• Click any wall, door, or furniture item to inspect & modify.</p>
          <p>• In 2D: Drag items to move; drag top blue circle to rotate.</p>
          <p>• In 3D: Orbit camera with left-click, pan with middle-click, or click "Walkthrough" to explore in first-person!</p>
        </div>
      </div>
    </div>
  );
};

