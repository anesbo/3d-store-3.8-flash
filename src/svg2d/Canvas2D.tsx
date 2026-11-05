import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Vertex,
  Wall,
  Opening,
  FurnitureItem,
  Room,
  ProjectSettings,
  SelectionState,
  ToolMode,
} from '../types/model';
import {
  Point2D,
  distance,
  snapPointToGrid,
  snapToOrthoAngles,
  projectPointOntoSegment,
  findGuidelineSnaps,
  SnapGuide,
} from '../math/geometry';
import { FurnitureSvg } from './FurnitureSvg';
import { DimensionOverlay } from './DimensionOverlay';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Magnet,
  Maximize2,
  RotateCw,
  Trash2,
  Copy,
} from 'lucide-react';

interface Canvas2DProps {
  vertices: Vertex[];
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  rooms: Room[];
  settings: ProjectSettings;
  selection: SelectionState;
  activeTool: ToolMode;
  onSelect: (selection: SelectionState) => void;
  onAddWall: (v1: Point2D, v2: Point2D, existingStartId?: string, existingEndId?: string) => void;
  onMoveVertex: (vertexId: string, newPos: Point2D) => void;
  onMoveFurniture: (id: string, newPos: Point2D) => void;
  onRotateFurniture: (id: string, newRotation: number) => void;
  onAddOpening: (wallId: string, offset: number, type: 'door' | 'window') => void;
  onMoveOpening: (openingId: string, newOffset: number) => void;
  onFlipOpening: (openingId: string, property: 'flipSwing' | 'flipSide') => void;
  onUpdateSettings?: (updater: (prev: ProjectSettings) => ProjectSettings) => void;
  onCursorMove?: (worldPos: Point2D) => void;
}

export const Canvas2D: React.FC<Canvas2DProps> = ({
  vertices,
  walls,
  openings,
  furniture,
  rooms,
  settings,
  selection,
  activeTool,
  onSelect,
  onAddWall,
  onMoveVertex,
  onMoveFurniture,
  onRotateFurniture,
  onAddOpening,
  onMoveOpening,
  onFlipOpening,
  onUpdateSettings,
  onCursorMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport transformation: scale (pixels per meter), pan offset (in pixels)
  const [scale, setScale] = useState(38); // 38px per meter initially
  const [pan, setPan] = useState({ x: 400, y: 350 });

  // Interactive interaction states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Wall Drawing state
  const [wallStartVertex, setWallStartVertex] = useState<{ id?: string; point: Point2D } | null>(null);
  const [currentCursorWorld, setCurrentCursorWorld] = useState<Point2D>({ x: 0, y: 0 });
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  // Dragging vertex state
  const [draggingVertexId, setDraggingVertexId] = useState<string | null>(null);

  // Dragging opening state
  const [draggingOpeningId, setDraggingOpeningId] = useState<string | null>(null);

  // Dragging furniture state
  const [draggingFurniture, setDraggingFurniture] = useState<{
    id: string;
    mode: 'move' | 'rotate';
    startPos: Point2D;
    startMouse: Point2D;
    startRotation: number;
  } | null>(null);

  // Tape measurement state
  const [measureStart, setMeasureStart] = useState<Point2D | null>(null);
  const [measureEnd, setMeasureEnd] = useState<Point2D | null>(null);

  // Candidate opening placement hover
  const [hoveredWallForOpening, setHoveredWallForOpening] = useState<{
    wallId: string;
    offset: number;
    point: Point2D;
  } | null>(null);

  // Coordinate transforms
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): Point2D => {
      return {
        x: (screenX - pan.x) / scale,
        y: (screenY - pan.y) / scale,
      };
    },
    [pan, scale]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number): { x: number; y: number } => {
      return {
        x: pan.x + worldX * scale,
        y: pan.y + worldY * scale,
      };
    },
    [pan, scale]
  );

  // Center / Fit view to content
  const handleFitView = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;

    if (vertices.length === 0) {
      setPan({ x: w / 2, y: h / 2 });
      setScale(35);
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    vertices.forEach((v) => {
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    });

    const boxW = Math.max(4, maxX - minX);
    const boxH = Math.max(4, maxY - minY);
    const padding = 120;

    const scaleX = (w - padding * 2) / boxW;
    const scaleY = (h - padding * 2) / boxH;
    const newScale = Math.max(15, Math.min(70, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setPan({
      x: w / 2 - midX * newScale,
      y: h / 2 - midY * newScale,
    });
    setScale(newScale);
  }, [vertices]);

  // Initial auto fit on mount
  useEffect(() => {
    handleFitView();
  }, []);

  // Snapping helper for cursor
  const getProcessedCursor = useCallback(
    (rawWorld: Point2D, ignoreVertexId?: string): { point: Point2D; guides: SnapGuide[] } => {
      let pt = { ...rawWorld };
      let guides: SnapGuide[] = [];

      // 1. Guide snapping
      if (settings.snapToGuides) {
        const guideSnap = findGuidelineSnaps(pt, vertices, ignoreVertexId, 0.2);
        pt = guideSnap.snapped;
        guides = guideSnap.guides;
      }

      // 2. Grid snapping
      if (settings.snapToGrid) {
        pt = snapPointToGrid(pt, settings.gridSnap);
      }

      return { point: pt, guides };
    },
    [settings.snapToGuides, settings.snapToGrid, settings.gridSnap, vertices]
  );

  // Find nearest vertex to cursor
  const findNearbyVertex = useCallback(
    (worldPt: Point2D, threshold = 0.35): Vertex | null => {
      let nearest: Vertex | null = null;
      let minDist = threshold;
      for (const v of vertices) {
        const d = distance(worldPt, { x: v.x, y: v.y });
        if (d < minDist) {
          minDist = d;
          nearest = v;
        }
      }
      return nearest;
    },
    [vertices]
  );

  // Find nearest wall for opening placement
  const findWallProjection = useCallback(
    (worldPt: Point2D, threshold = 0.8) => {
      const vertexMap = new Map(vertices.map((v) => [v.id, v]));
      let bestMatch: { wallId: string; offset: number; point: Point2D } | null = null;
      let bestDist = threshold;

      for (const wall of walls) {
        const v1 = vertexMap.get(wall.startVertexId);
        const v2 = vertexMap.get(wall.endVertexId);
        if (!v1 || !v2) continue;

        const proj = projectPointOntoSegment(worldPt, v1, v2);
        if (proj.dist < bestDist) {
          bestDist = proj.dist;
          const wallLen = distance(v1, v2);
          const offset = proj.t * wallLen;
          bestMatch = {
            wallId: wall.id,
            offset,
            point: proj.point,
          };
        }
      }
      return bestMatch;
    },
    [vertices, walls]
  );

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.max(8, Math.min(180, scale * zoomFactor));

    // Zoom into mouse pointer
    const newPanX = mouseX - (mouseX - pan.x) * (newScale / scale);
    const newPanY = mouseY - (mouseY - pan.y) * (newScale / scale);

    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const rawWorld = screenToWorld(screenX, screenY);

    // Pan with middle mouse, spacebar, or Pan tool
    if (e.button === 1 || activeTool === 'pan' || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: screenX - pan.x, y: screenY - pan.y });
      return;
    }

    if (e.button !== 0) return;

    // Measurement tool
    if (activeTool === 'measure') {
      const { point } = getProcessedCursor(rawWorld);
      setMeasureStart(point);
      setMeasureEnd(point);
      return;
    }

    // Door or Window tool placement
    if (activeTool === 'door' || activeTool === 'window') {
      if (hoveredWallForOpening) {
        onAddOpening(
          hoveredWallForOpening.wallId,
          hoveredWallForOpening.offset,
          activeTool
        );
      }
      return;
    }

    // Wall drawing tool
    if (activeTool === 'wall') {
      const nearbyV = findNearbyVertex(rawWorld, 0.4);
      let pt = nearbyV ? { x: nearbyV.x, y: nearbyV.y } : getProcessedCursor(rawWorld).point;

      if (!wallStartVertex) {
        // Start first point
        setWallStartVertex({ id: nearbyV?.id, point: pt });
      } else {
        // Check ortho angle snap
        const snappedPt = snapToOrthoAngles(wallStartVertex.point, pt, 45);
        if (distance(wallStartVertex.point, snappedPt) >= 0.1) {
          onAddWall(wallStartVertex.point, snappedPt, wallStartVertex.id, nearbyV?.id);
          // Chain: start next wall from current endpoint
          setWallStartVertex({ id: nearbyV?.id, point: snappedPt });
        }
      }
      return;
    }

    // Vertex dragging in select tool
    if (activeTool === 'select') {
      const nearbyV = findNearbyVertex(rawWorld, 0.35);
      if (nearbyV) {
        setDraggingVertexId(nearbyV.id);
        onSelect({ type: 'vertex', id: nearbyV.id });
        return;
      }
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const rawWorld = screenToWorld(screenX, screenY);

    onCursorMove?.(rawWorld);

    // Pan handling
    if (isPanning) {
      setPan({ x: screenX - panStart.x, y: screenY - panStart.y });
      return;
    }

    // Measure tool
    if (measureStart && activeTool === 'measure') {
      const { point } = getProcessedCursor(rawWorld);
      setMeasureEnd(point);
      return;
    }

    // Dragging Vertex
    if (draggingVertexId) {
      const { point, guides } = getProcessedCursor(rawWorld, draggingVertexId);
      setActiveGuides(guides);
      onMoveVertex(draggingVertexId, point);
      return;
    }

    // Dragging Opening along wall
    if (draggingOpeningId) {
      const op = openings.find((o) => o.id === draggingOpeningId);
      if (op) {
        const wall = walls.find((w) => w.id === op.wallId);
        const vMap = new Map(vertices.map((v) => [v.id, v]));
        if (wall) {
          const v1 = vMap.get(wall.startVertexId);
          const v2 = vMap.get(wall.endVertexId);
          if (v1 && v2) {
            const proj = projectPointOntoSegment(rawWorld, v1, v2);
            const wallLen = distance(v1, v2);
            const clampedOffset = Math.max(0.05, Math.min(wallLen - op.width - 0.05, proj.t * wallLen));
            onMoveOpening(op.id, clampedOffset);
          }
        }
      }
      return;
    }

    // Dragging / Rotating Furniture
    if (draggingFurniture) {
      if (draggingFurniture.mode === 'move') {
        const dx = rawWorld.x - draggingFurniture.startMouse.x;
        const dy = rawWorld.y - draggingFurniture.startMouse.y;
        let newPos = {
          x: draggingFurniture.startPos.x + dx,
          y: draggingFurniture.startPos.y + dy,
        };
        if (settings.snapToGrid) {
          newPos = snapPointToGrid(newPos, settings.gridSnap);
        }
        onMoveFurniture(draggingFurniture.id, newPos);
      } else if (draggingFurniture.mode === 'rotate') {
        // Calculate angle from furniture center to cursor
        const item = furniture.find((f) => f.id === draggingFurniture.id);
        if (item) {
          const rad = Math.atan2(rawWorld.y - item.y, rawWorld.x - item.x);
          let deg = (rad * 180) / Math.PI + 90;
          if (deg < 0) deg += 360;
          // Step snap to 15 degrees if near
          const snapStep = 15;
          const nearestSnap = Math.round(deg / snapStep) * snapStep;
          if (Math.abs(deg - nearestSnap) < 4.0) {
            deg = nearestSnap;
          }
          onRotateFurniture(draggingFurniture.id, Math.round(deg));
        }
      }
      return;
    }

    // Wall drawing or Cursor tracking
    const { point, guides } = getProcessedCursor(rawWorld);
    setActiveGuides(guides);

    if (wallStartVertex && activeTool === 'wall') {
      const orthoPt = snapToOrthoAngles(wallStartVertex.point, point, 45);
      setCurrentCursorWorld(orthoPt);
    } else {
      setCurrentCursorWorld(point);
    }

    // Door / Window preview projection
    if (activeTool === 'door' || activeTool === 'window') {
      const proj = findWallProjection(rawWorld, 0.8);
      setHoveredWallForOpening(proj);
    } else {
      setHoveredWallForOpening(null);
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingVertexId(null);
    setDraggingOpeningId(null);
    setDraggingFurniture(null);
    setActiveGuides([]);
  };

  // Keyboard shortcut listener (Esc to cancel wall drawing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallStartVertex(null);
        setMeasureStart(null);
        setMeasureEnd(null);
        onSelect({ type: null, id: null });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelect]);

  const vertexMap = new Map(vertices.map((v) => [v.id, v]));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0c0e14] select-none"
    >
      <svg
        ref={svgRef}
        className="w-full h-full block cursor-default"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          {/* Subtle architectural grid pattern */}
          <pattern
            id="cad-grid-minor"
            width={scale * 0.5}
            height={scale * 0.5}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scale * 0.5} 0 L 0 0 0 ${scale * 0.5}`}
              fill="none"
              stroke="#1b1e2a"
              strokeWidth="0.75"
            />
          </pattern>
          <pattern
            id="cad-grid-major"
            width={scale * 2.5}
            height={scale * 2.5}
            patternUnits="userSpaceOnUse"
          >
            <rect width={scale * 2.5} height={scale * 2.5} fill="url(#cad-grid-minor)" />
            <path
              d={`M ${scale * 2.5} 0 L 0 0 0 ${scale * 2.5}`}
              fill="none"
              stroke="#262a3b"
              strokeWidth="1.2"
            />
          </pattern>
        </defs>

        {/* Background Grid */}
        {settings.showGrid && (
          <rect
            x={0}
            y={0}
            width="100%"
            height="100%"
            fill="url(#cad-grid-major)"
            transform={`translate(${pan.x % (scale * 2.5)}, ${pan.y % (scale * 2.5)})`}
          />
        )}

        {/* Transformed World Layer */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* 50m x 50m Site Boundary Guide */}
          <rect
            x={-25}
            y={-25}
            width={50}
            height={50}
            fill="none"
            stroke="#1f2333"
            strokeWidth={0.06}
            strokeDasharray="0.3,0.3"
          />

          {/* Coordinate Axes Crosshair at Origin (0,0) */}
          <g opacity={0.4}>
            <line x1={-3} y1={0} x2={3} y2={0} stroke="#475569" strokeWidth={0.02} />
            <line x1={0} y1={-3} x2={0} y2={3} stroke="#475569" strokeWidth={0.02} />
            <circle cx={0} cy={0} r={0.08} fill="none" stroke="#475569" strokeWidth={0.02} />
          </g>

          {/* Dynamic Snapping Alignment Guides */}
          {activeGuides.map((guide, idx) => (
            <line
              key={idx}
              x1={guide.type === 'x' ? guide.value : -50}
              y1={guide.type === 'y' ? guide.value : -50}
              x2={guide.type === 'x' ? guide.value : 50}
              y2={guide.type === 'y' ? guide.value : 50}
              stroke="#06b6d4"
              strokeWidth={0.02}
              strokeDasharray="0.1,0.06"
              className="animate-pulse"
            />
          ))}

          {/* 1. ROOM POLYGONS & LABELS */}
          {rooms.map((room) => {
            const isSelected = selection.type === 'room' && selection.id === room.id;
            const pointsStr = room.polygon.map((p) => `${p.x},${p.y}`).join(' ');
            return (
              <g key={room.id} className="cursor-pointer">
                <polygon
                  points={pointsStr}
                  className={`transition-colors duration-150 ${
                    isSelected
                      ? 'fill-sky-500/25 stroke-sky-400'
                      : 'fill-slate-800/35 hover:fill-slate-800/50 stroke-transparent'
                  }`}
                  strokeWidth={0.04}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ type: 'room', id: room.id });
                  }}
                />

                {/* Room Centroid Label Badge */}
                {settings.showRoomLabels && (
                  <g
                    transform={`translate(${room.polygon.reduce((acc, p) => acc + p.x, 0) / room.polygon.length}, ${
                      room.polygon.reduce((acc, p) => acc + p.y, 0) / room.polygon.length
                    })`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({ type: 'room', id: room.id });
                    }}
                  >
                    <rect
                      x={-0.8}
                      y={-0.24}
                      width={1.6}
                      height={0.48}
                      rx={0.08}
                      fill="#0f172a"
                      stroke={isSelected ? '#38bdf8' : '#334155'}
                      strokeWidth={0.02}
                      className="shadow-sm"
                    />
                    <text
                      x={0}
                      y={-0.04}
                      fill="#f8fafc"
                      fontSize={0.13}
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {room.name}
                    </text>
                    <text
                      x={0}
                      y={0.14}
                      fill="#94a3b8"
                      fontSize={0.1}
                      fontFamily="JetBrains Mono, monospace"
                      textAnchor="middle"
                    >
                      {room.area.toFixed(1)} m²
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. WALLS */}
          {walls.map((wall) => {
            const v1 = vertexMap.get(wall.startVertexId);
            const v2 = vertexMap.get(wall.endVertexId);
            if (!v1 || !v2) return null;

            const isSelected = selection.type === 'wall' && selection.id === wall.id;

            return (
              <g key={wall.id} className="cursor-pointer">
                {/* Wall body rectangle */}
                <line
                  x1={v1.x}
                  y1={v1.y}
                  x2={v2.x}
                  y2={v2.y}
                  stroke={isSelected ? '#38bdf8' : '#e2e8f0'}
                  strokeWidth={wall.thickness}
                  strokeLinecap="square"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ type: 'wall', id: wall.id });
                  }}
                />

                {/* Wall centerline dash */}
                <line
                  x1={v1.x}
                  y1={v1.y}
                  x2={v2.x}
                  y2={v2.y}
                  stroke={isSelected ? '#0284c7' : '#475569'}
                  strokeWidth={0.015}
                  strokeDasharray="0.08,0.04"
                />
              </g>
            );
          })}

          {/* 3. WALL OPENINGS (Doors, Windows, Swings) */}
          {openings.map((op) => {
            const wall = walls.find((w) => w.id === op.wallId);
            if (!wall) return null;
            const v1 = vertexMap.get(wall.startVertexId);
            const v2 = vertexMap.get(wall.endVertexId);
            if (!v1 || !v2) return null;

            const wallLen = distance(v1, v2);
            const dx = (v2.x - v1.x) / wallLen;
            const dy = (v2.y - v1.y) / wallLen;
            const nx = -dy;
            const ny = dx;

            const startX = v1.x + dx * op.offset;
            const startY = v1.y + dy * op.offset;
            const endX = v1.x + dx * (op.offset + op.width);
            const endY = v1.y + dy * (op.offset + op.width);

            const isSelected = selection.type === 'opening' && selection.id === op.id;

            // Door swing calculations
            const hingeX = op.flipSide ? endX : startX;
            const hingeY = op.flipSide ? endY : startY;
            const swingDir = op.flipSwing ? -1 : 1;
            const arcRadius = op.width;

            return (
              <g
                key={op.id}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ type: 'opening', id: op.id });
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelect({ type: 'opening', id: op.id });
                  setDraggingOpeningId(op.id);
                }}
              >
                {/* Clear wall opening cutout (render background color) */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke="#0c0e14"
                  strokeWidth={wall.thickness + 0.02}
                  strokeLinecap="butt"
                />

                {op.type === 'door' && (
                  <g>
                    {/* Door jamb lines */}
                    <line
                      x1={startX - nx * (wall.thickness / 2)}
                      y1={startY - ny * (wall.thickness / 2)}
                      x2={startX + nx * (wall.thickness / 2)}
                      y2={startY + ny * (wall.thickness / 2)}
                      stroke="#94a3b8"
                      strokeWidth={0.03}
                    />
                    <line
                      x1={endX - nx * (wall.thickness / 2)}
                      y1={endY - ny * (wall.thickness / 2)}
                      x2={endX + nx * (wall.thickness / 2)}
                      y2={endY + ny * (wall.thickness / 2)}
                      stroke="#94a3b8"
                      strokeWidth={0.03}
                    />

                    {/* Door Leaf (rotated panel) */}
                    <line
                      x1={hingeX}
                      y1={hingeY}
                      x2={hingeX + nx * swingDir * arcRadius}
                      y2={hingeY + ny * swingDir * arcRadius}
                      stroke={isSelected ? '#38bdf8' : '#f59e0b'}
                      strokeWidth={0.035}
                    />

                    {/* Door 90° Swing Arc */}
                    <path
                      d={`M ${hingeX + dx * (op.flipSide ? -arcRadius : arcRadius)} ${
                        hingeY + dy * (op.flipSide ? -arcRadius : arcRadius)
                      } A ${arcRadius} ${arcRadius} 0 0 ${op.flipSwing ? 0 : 1} ${
                        hingeX + nx * swingDir * arcRadius
                      } ${hingeY + ny * swingDir * arcRadius}`}
                      fill="none"
                      stroke={isSelected ? '#38bdf8' : '#f59e0b'}
                      strokeWidth={0.02}
                      strokeDasharray="0.04,0.03"
                      opacity={0.85}
                    />
                  </g>
                )}

                {op.type === 'window' && (
                  <g>
                    {/* Window dual-line glass indication */}
                    <line
                      x1={startX}
                      y1={startY}
                      x2={endX}
                      y2={endY}
                      stroke={isSelected ? '#38bdf8' : '#38bdf8'}
                      strokeWidth={0.04}
                    />
                    <line
                      x1={startX - nx * 0.03}
                      y1={startY - ny * 0.03}
                      x2={endX - nx * 0.03}
                      y2={endY - ny * 0.03}
                      stroke="#94a3b8"
                      strokeWidth={0.015}
                    />
                    <line
                      x1={startX + nx * 0.03}
                      y1={startY + ny * 0.03}
                      x2={endX + nx * 0.03}
                      y2={endY + ny * 0.03}
                      stroke="#94a3b8"
                      strokeWidth={0.015}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* 4. FURNITURE ITEMS */}
          {furniture.map((item) => (
            <FurnitureSvg
              key={item.id}
              item={item}
              isSelected={selection.type === 'furniture' && selection.id === item.id}
              onSelect={(e) => {
                e.stopPropagation();
                onSelect({ type: 'furniture', id: item.id });
              }}
              onStartDrag={(e, handle) => {
                e.stopPropagation();
                setDraggingFurniture({
                  id: item.id,
                  mode: handle,
                  startPos: { x: item.x, y: item.y },
                  startMouse: screenToWorld(e.clientX - containerRef.current!.getBoundingClientRect().left, e.clientY - containerRef.current!.getBoundingClientRect().top),
                  startRotation: item.rotation,
                });
              }}
            />
          ))}

          {/* 5. WALL VERTICES (Points) */}
          {vertices.map((v) => {
            const isSelected = selection.type === 'vertex' && selection.id === v.id;
            return (
              <g
                key={v.id}
                className="cursor-pointer"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onSelect({ type: 'vertex', id: v.id });
                  setDraggingVertexId(v.id);
                }}
              >
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={isSelected ? 0.14 : 0.09}
                  className={`transition-transform duration-100 ${
                    isSelected
                      ? 'fill-sky-400 stroke-white stroke-2'
                      : 'fill-neutral-900 stroke-neutral-400 stroke-[1.5] hover:fill-sky-500 hover:scale-125'
                  }`}
                  strokeWidth={0.02}
                />
              </g>
            );
          })}

          {/* 6. ARCHITECTURAL DIMENSIONS */}
          {settings.showDimensions && (
            <DimensionOverlay
              walls={walls}
              vertices={vertices}
              openings={openings}
              selectedWallId={selection.type === 'wall' ? selection.id : null}
            />
          )}

          {/* 7. WALL DRAWING RUBBER BAND */}
          {wallStartVertex && activeTool === 'wall' && (
            <g className="pointer-events-none">
              <line
                x1={wallStartVertex.point.x}
                y1={wallStartVertex.point.y}
                x2={currentCursorWorld.x}
                y2={currentCursorWorld.y}
                stroke="#38bdf8"
                strokeWidth={settings.wallDefaultThickness}
                strokeDasharray="0.1,0.06"
                strokeLinecap="square"
              />
              <circle
                cx={currentCursorWorld.x}
                cy={currentCursorWorld.y}
                r={0.1}
                fill="#38bdf8"
              />
              {/* Live Distance Tooltip */}
              <g
                transform={`translate(${
                  (wallStartVertex.point.x + currentCursorWorld.x) / 2
                }, ${
                  (wallStartVertex.point.y + currentCursorWorld.y) / 2 - 0.28
                })`}
              >
                <rect
                  x={-0.45}
                  y={-0.12}
                  width={0.9}
                  height={0.24}
                  rx={0.04}
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth={0.015}
                />
                <text
                  x={0}
                  y={0.045}
                  fill="#ffffff"
                  fontSize={0.11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {distance(wallStartVertex.point, currentCursorWorld).toFixed(2)} m
                </text>
              </g>
            </g>
          )}

          {/* 8. HOVERED OPENING PREVIEW */}
          {hoveredWallForOpening && (activeTool === 'door' || activeTool === 'window') && (
            <g className="pointer-events-none">
              <circle
                cx={hoveredWallForOpening.point.x}
                cy={hoveredWallForOpening.point.y}
                r={0.12}
                fill="#22c55e"
                className="animate-ping"
              />
              <circle
                cx={hoveredWallForOpening.point.x}
                cy={hoveredWallForOpening.point.y}
                r={0.15}
                fill="#16a34a"
                stroke="#ffffff"
                strokeWidth={0.02}
              />
            </g>
          )}

          {/* 9. TAPE MEASURE OVERLAY */}
          {measureStart && measureEnd && (
            <g className="pointer-events-none">
              <line
                x1={measureStart.x}
                y1={measureStart.y}
                x2={measureEnd.x}
                y2={measureEnd.y}
                stroke="#eab308"
                strokeWidth={0.03}
                strokeDasharray="0.1,0.05"
              />
              <circle cx={measureStart.x} cy={measureStart.y} r={0.08} fill="#eab308" />
              <circle cx={measureEnd.x} cy={measureEnd.y} r={0.08} fill="#eab308" />
              <g
                transform={`translate(${(measureStart.x + measureEnd.x) / 2}, ${
                  (measureStart.y + measureEnd.y) / 2 - 0.25
                })`}
              >
                <rect
                  x={-0.5}
                  y={-0.12}
                  width={1.0}
                  height={0.24}
                  rx={0.04}
                  fill="#854d0e"
                  stroke="#facc15"
                  strokeWidth={0.015}
                />
                <text
                  x={0}
                  y={0.045}
                  fill="#fef08a"
                  fontSize={0.11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {distance(measureStart, measureEnd).toFixed(3)} m
                </text>
              </g>
            </g>
          )}
        </g>
      </svg>

      {/* Floating 2D View Toolbar */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1.5 bg-neutral-900/85 backdrop-blur-md border border-neutral-800 rounded-lg shadow-xl text-neutral-300 text-xs z-10">
        <button
          onClick={() => setScale((s) => Math.min(180, s * 1.25))}
          title="Zoom In"
          className="p-1.5 hover:bg-neutral-800 rounded transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(8, s * 0.8))}
          title="Zoom Out"
          className="p-1.5 hover:bg-neutral-800 rounded transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitView}
          title="Fit Floorplan to Window"
          className="p-1.5 hover:bg-neutral-800 rounded transition"
        >
          <Maximize className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-neutral-700 mx-1" />

        {/* Snap to Grid Toggle */}
        <button
          onClick={() => {
            onUpdateSettings?.((s) => ({ ...s, snapToGrid: !s.snapToGrid }));
          }}
          title={`Snap to Grid (${settings.gridSnap}m)`}
          className={`flex items-center gap-1 px-2 py-1 rounded transition ${
            settings.snapToGrid ? 'bg-blue-600 text-white font-medium' : 'hover:bg-neutral-800 text-neutral-400'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap: {settings.gridSnap}m</span>
        </button>

        {/* Dimensions Toggle */}
        <button
          onClick={() => {
            onUpdateSettings?.((s) => ({ ...s, showDimensions: !s.showDimensions }));
          }}
          title="Toggle Dimensions"
          className={`px-2 py-1 rounded transition ${
            settings.showDimensions ? 'bg-neutral-700 text-white' : 'hover:bg-neutral-800 text-neutral-400'
          }`}
        >
          Dims
        </button>

        {/* Room Labels Toggle */}
        <button
          onClick={() => {
            onUpdateSettings?.((s) => ({ ...s, showRoomLabels: !s.showRoomLabels }));
          }}
          title="Toggle Room Labels"
          className={`px-2 py-1 rounded transition ${
            settings.showRoomLabels ? 'bg-neutral-700 text-white' : 'hover:bg-neutral-800 text-neutral-400'
          }`}
        >
          Rooms
        </button>
      </div>

      {/* Wall Drawing Guide Pill */}
      {activeTool === 'wall' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-neutral-900/90 backdrop-blur-md border border-sky-500/40 rounded-full shadow-2xl text-xs z-10 animate-fade-in text-sky-300">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
          <span>
            {wallStartVertex
              ? 'Click to place next vertex (chains continuously) • Esc to finish chain'
              : 'Click to start drawing wall'}
          </span>
        </div>
      )}
    </div>
  );
};
