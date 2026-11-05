import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useProjectStore } from './state/useProjectStore';
import { TopNavbar } from './components/TopNavbar';
import { LeftSidebar } from './components/LeftSidebar';
import { Canvas2D } from './svg2d/Canvas2D';
import { ThreeScene, ThreeSceneHandle } from './three/ThreeScene';
import { InspectorDrawer } from './components/InspectorDrawer';
import { CatalogDrawer } from './components/CatalogDrawer';
import { BomModal } from './components/BomModal';
import { ExportModal } from './components/ExportModal';
import { StatusBar } from './components/StatusBar';
import { Point2D, distance } from './math/geometry';
import { ToolMode } from './types/model';

export const App: React.FC = () => {
  const store = useProjectStore();
  const threeSceneRef = useRef<ThreeSceneHandle>(null);

  // Modals & Panels
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [cursorWorld, setCursorWorld] = useState<Point2D>({ x: 0, y: 0 });

  // Split-screen drag state
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  // Compute live total budget
  const totalBudget = useMemo(() => {
    let budget = 0;
    // Flooring
    store.activeAlternative.rooms.forEach((r) => {
      budget += r.area * r.unitCostPerSqMeter;
    });
    // Walls
    const vertexMap = new Map(store.activeAlternative.vertices.map((v) => [v.id, v]));
    let wallArea = 0;
    store.activeAlternative.walls.forEach((w) => {
      const v1 = vertexMap.get(w.startVertexId);
      const v2 = vertexMap.get(w.endVertexId);
      if (v1 && v2) {
        wallArea += distance(v1, v2) * w.height * 2;
      }
    });
    budget += wallArea * 22; // $22/m² finish rate
    // Openings
    budget += store.activeAlternative.openings.filter((o) => o.type === 'door').length * 480;
    budget += store.activeAlternative.openings.filter((o) => o.type === 'window').length * 620;
    // Furniture
    store.activeAlternative.furniture.forEach((f) => {
      budget += f.unitPrice;
    });

    return Math.round(budget);
  }, [store.activeAlternative]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in text input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        store.redo();
        return;
      }

      // Delete / Backspace: Remove selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        store.deleteSelection();
        return;
      }

      // Duplicate: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        store.duplicateSelection();
        return;
      }

      // Tool Hotkeys
      switch (e.key.toLowerCase()) {
        case 'v':
          store.setActiveTool('select');
          break;
        case 'w':
          store.setActiveTool('wall');
          setIsCatalogOpen(false);
          break;
        case 'd':
          store.setActiveTool('door');
          setIsCatalogOpen(false);
          break;
        case 'n':
          store.setActiveTool('window');
          setIsCatalogOpen(false);
          break;
        case 'f':
          setIsCatalogOpen((prev) => !prev);
          break;
        case 'm':
          store.setActiveTool('measure');
          break;
        case 'h':
          store.setActiveTool('pan');
          break;
        case 'escape':
          store.setSelection({ type: null, id: null });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // Add catalog item to center of canvas/space
  const handleAddCatalogItemToCenter = useCallback(
    (catalogId: string) => {
      // Find room centroid or center
      const startX = store.activeAlternative.rooms[0]?.polygon[0]?.x ?? 4;
      const startY = store.activeAlternative.rooms[0]?.polygon[0]?.y ?? 4;
      store.addFurnitureFromCatalog(catalogId, { x: startX + 0.5, y: startY + 0.5 });
      setIsCatalogOpen(false);
      store.setActiveTool('select');
    },
    [store]
  );

  // Split resizer drag handling
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
  };

  useEffect(() => {
    if (!isResizingSplit) return;

    const handleMouseMove = (e: MouseEvent) => {
      const containerW = window.innerWidth - 52 - 320; // minus sidebar and inspector
      const leftW = e.clientX - 52;
      const ratio = Math.max(25, Math.min(75, (leftW / containerW) * 100));
      store.setSplitRatio(ratio);
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSplit, store]);

  const totalFloorArea = useMemo(() => {
    return store.activeAlternative.rooms.reduce((sum, r) => sum + r.area, 0);
  }, [store.activeAlternative.rooms]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-neutral-950 font-sans text-neutral-100">
      {/* 1. TOP NAVIGATION BAR */}
      <TopNavbar
        project={store.project}
        activeAlternative={store.activeAlternative}
        viewMode={store.viewMode}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        totalBudget={totalBudget}
        onUndo={store.undo}
        onRedo={store.redo}
        onSelectViewMode={store.setViewMode}
        onSelectPresetProject={store.loadPresetProject}
        onSelectAlternative={store.setActiveAlternative}
        onCreateAlternative={store.createAlternative}
        onOpenBomModal={() => setIsBomModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* 2. MAIN WORKSPACE ROW */}
      <div className="flex-1 flex w-full overflow-hidden relative">
        {/* Left Toolbar */}
        <LeftSidebar
          activeTool={store.activeTool}
          isCatalogOpen={isCatalogOpen}
          onSelectTool={(tool) => {
            store.setActiveTool(tool);
            if (tool !== 'furniture') setIsCatalogOpen(false);
          }}
          onToggleCatalog={() => setIsCatalogOpen((prev) => !prev)}
        />

        {/* Floating Catalog Flyout Drawer */}
        <CatalogDrawer
          isOpen={isCatalogOpen}
          onClose={() => setIsCatalogOpen(false)}
          onSelectItem={(id) => {
            store.setSelectedCatalogId(id);
          }}
          onAddItemToCenter={handleAddCatalogItemToCenter}
        />

        {/* Central Dual Synchronized View Area */}
        <div className="flex-1 flex relative overflow-hidden bg-neutral-950">
          {/* 2D Plan View (SVG) */}
          {(store.viewMode === 'split' || store.viewMode === '2d') && (
            <div
              style={{
                width: store.viewMode === 'split' ? `${store.splitRatio}%` : '100%',
              }}
              className="h-full relative border-r border-neutral-800/80 transition-[width] duration-75"
            >
              <Canvas2D
                vertices={store.activeAlternative.vertices}
                walls={store.activeAlternative.walls}
                openings={store.activeAlternative.openings}
                furniture={store.activeAlternative.furniture}
                rooms={store.activeAlternative.rooms}
                settings={store.project.settings}
                selection={store.selection}
                activeTool={store.activeTool}
                onSelect={store.setSelection}
                onAddWall={store.addWall}
                onMoveVertex={store.moveVertex}
                onMoveFurniture={store.moveFurniture}
                onRotateFurniture={store.rotateFurniture}
                onAddOpening={store.addOpening}
                onMoveOpening={store.moveOpening}
                onFlipOpening={store.flipOpening}
                onUpdateSettings={store.updateSettings}
                onCursorMove={setCursorWorld}
              />
            </div>
          )}

          {/* Draggable Divider in Split Mode */}
          {store.viewMode === 'split' && (
            <div
              onMouseDown={handleSplitMouseDown}
              className="w-1.5 h-full bg-neutral-800/80 hover:bg-blue-500 cursor-col-resize flex items-center justify-center transition-colors z-20 group"
            >
              <div className="w-0.5 h-8 bg-neutral-600 group-hover:bg-white rounded-full" />
            </div>
          )}

          {/* 3D Real-time Scene View (Three.js) */}
          {(store.viewMode === 'split' || store.viewMode === '3d') && (
            <div
              style={{
                width: store.viewMode === 'split' ? `${100 - store.splitRatio}%` : '100%',
              }}
              className="h-full relative transition-[width] duration-75"
            >
              <ThreeScene
                ref={threeSceneRef}
                alternative={store.activeAlternative}
                settings={store.project.settings}
                selection={store.selection}
                onSelect={store.setSelection}
                onUpdateSettings={store.updateSettings}
              />
            </div>
          )}
        </div>

        {/* Right Property Inspector Drawer */}
        <InspectorDrawer
          selection={store.selection}
          alternative={store.activeAlternative}
          settings={store.project.settings}
          onUpdateFurniture={store.updateFurniture}
          onUpdateWall={store.updateWall}
          onUpdateOpening={store.updateOpening}
          onUpdateRoom={store.updateRoom}
          onDeleteSelection={store.deleteSelection}
          onDuplicateSelection={store.duplicateSelection}
          onClose={() => store.setSelection({ type: null, id: null })}
        />
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <StatusBar
        cursorWorld={cursorWorld}
        activeTool={store.activeTool}
        settings={store.project.settings}
        wallCount={store.activeAlternative.walls.length}
        furnitureCount={store.activeAlternative.furniture.length}
        roomCount={store.activeAlternative.rooms.length}
        totalArea={totalFloorArea}
      />

      {/* 4. MODALS */}
      <BomModal
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        alternative={store.activeAlternative}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={store.project}
        activeAlternative={store.activeAlternative}
        onImportProject={store.importProject}
        onCapture3DSnapshot={() => threeSceneRef.current?.captureSnapshot() || ''}
      />
    </div>
  );
};
