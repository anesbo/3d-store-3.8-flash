import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Project,
  DesignAlternative,
  SelectionState,
  ToolMode,
  ViewMode,
  ProjectSettings,
  Wall,
  Vertex,
  Opening,
  FurnitureItem,
  Room,
} from '../types/model';
import { PRESET_PROJECTS } from '../presets/defaultProjects';
import { detectRooms } from '../math/roomDetection';
import { Point2D, distance } from '../math/geometry';
import { FURNITURE_CATALOG } from '../catalog/furnitureCatalog';

const STORAGE_KEY = 'forma_commercial_project_v1';
const MAX_HISTORY = 80;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function useProjectStore() {
  // Load initial project from localStorage or default preset (The Sunday Cafe)
  const [project, setProject] = useState<Project>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id && parsed.alternatives && parsed.alternatives.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved project from localStorage:', e);
    }
    return deepClone(PRESET_PROJECTS[0]);
  });

  const [history, setHistory] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);

  // UI States
  const [selection, setSelection] = useState<SelectionState>({ type: null, id: null });
  const [activeTool, setActiveTool] = useState<ToolMode>('select');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [splitRatio, setSplitRatio] = useState<number>(50); // 50% split

  // Current active alternative
  const activeAlternative = useMemo<DesignAlternative>(() => {
    const found = project.alternatives.find((a) => a.id === project.activeAlternativeId);
    return found || project.alternatives[0];
  }, [project.alternatives, project.activeAlternativeId]);

  // Persist project changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (e) {
      console.error('Failed to auto-save project to localStorage:', e);
    }
  }, [project]);

  // Push new project state into transaction history
  const commitProjectChange = useCallback(
    (newProject: Project) => {
      setHistory((prev) => {
        const next = [...prev, deepClone(project)];
        if (next.length > MAX_HISTORY) next.shift();
        return next;
      });
      setFuture([]); // clear redo stack on new action
      setProject(newProject);
    },
    [project]
  );

  // Undo transaction
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, history.length - 1);

    setFuture((prev) => [deepClone(project), ...prev]);
    setHistory(newHistory);
    setProject(previous);
    setSelection({ type: null, id: null });
  }, [history, project]);

  // Redo transaction
  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setHistory((prev) => [...prev, deepClone(project)]);
    setFuture(newFuture);
    setProject(next);
    setSelection({ type: null, id: null });
  }, [future, project]);

  // Mutate active alternative helper
  const mutateActiveAlternative = useCallback(
    (mutator: (alt: DesignAlternative) => DesignAlternative) => {
      const clonedProject = deepClone(project);
      const altIndex = clonedProject.alternatives.findIndex(
        (a: DesignAlternative) => a.id === clonedProject.activeAlternativeId
      );
      if (altIndex === -1) return;

      const updatedAlt = mutator(clonedProject.alternatives[altIndex]);
      clonedProject.alternatives[altIndex] = updatedAlt;
      clonedProject.updatedAt = new Date().toISOString();

      commitProjectChange(clonedProject);
    },
    [project, commitProjectChange]
  );

  // Switch active design alternative
  const setActiveAlternative = useCallback(
    (altId: string) => {
      if (project.alternatives.some((a) => a.id === altId)) {
        setProject((prev) => ({
          ...prev,
          activeAlternativeId: altId,
        }));
        setSelection({ type: null, id: null });
      }
    },
    [project.alternatives]
  );

  // Create new alternative (blank or cloned from current)
  const createAlternative = useCallback(
    (name: string, cloneCurrent = true) => {
      const newAltId = `alt-${Date.now()}`;
      const baseAlt = cloneCurrent ? activeAlternative : PRESET_PROJECTS[3].alternatives[0];
      const newAlt: DesignAlternative = {
        ...deepClone(baseAlt),
        id: newAltId,
        name: name || `Option ${String.fromCharCode(65 + project.alternatives.length)}`,
        description: `Design alternative created on ${new Date().toLocaleDateString()}`,
      };

      const updated = {
        ...project,
        alternatives: [...project.alternatives, newAlt],
        activeAlternativeId: newAltId,
        updatedAt: new Date().toISOString(),
      };
      commitProjectChange(updated);
    },
    [project, activeAlternative, commitProjectChange]
  );

  // Delete alternative
  const deleteAlternative = useCallback(
    (altId: string) => {
      if (project.alternatives.length <= 1) return; // Keep at least one
      const updatedAlternatives = project.alternatives.filter((a) => a.id !== altId);
      const newActiveId =
        project.activeAlternativeId === altId
          ? updatedAlternatives[0].id
          : project.activeAlternativeId;

      const updated = {
        ...project,
        alternatives: updatedAlternatives,
        activeAlternativeId: newActiveId,
        updatedAt: new Date().toISOString(),
      };
      commitProjectChange(updated);
      setSelection({ type: null, id: null });
    },
    [project, commitProjectChange]
  );

  // Switch / Load Project preset
  const loadPresetProject = useCallback(
    (presetId: string) => {
      const preset = PRESET_PROJECTS.find((p) => p.id === presetId);
      if (preset) {
        commitProjectChange(deepClone(preset));
        setSelection({ type: null, id: null });
      }
    },
    [commitProjectChange]
  );

  // Import raw project from JSON
  const importProject = useCallback(
    (imported: Project) => {
      if (!imported.alternatives || imported.alternatives.length === 0) {
        throw new Error('Invalid project file: Missing design alternatives.');
      }
      commitProjectChange(deepClone(imported));
      setSelection({ type: null, id: null });
    },
    [commitProjectChange]
  );

  // ADD WALL
  const addWall = useCallback(
    (p1: Point2D, p2: Point2D, existingStartId?: string, existingEndId?: string) => {
      if (distance(p1, p2) < 0.1) return;

      mutateActiveAlternative((alt) => {
        const vertices = [...alt.vertices];
        let v1Id = existingStartId;
        let v2Id = existingEndId;

        // Find or create v1
        if (!v1Id) {
          const match1 = vertices.find((v) => distance(v, p1) < 0.1);
          if (match1) {
            v1Id = match1.id;
          } else {
            v1Id = `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            vertices.push({ id: v1Id, x: p1.x, y: p1.y });
          }
        }

        // Find or create v2
        if (!v2Id) {
          const match2 = vertices.find((v) => distance(v, p2) < 0.1);
          if (match2) {
            v2Id = match2.id;
          } else {
            v2Id = `v_${Date.now() + 1}_${Math.floor(Math.random() * 1000)}`;
            vertices.push({ id: v2Id, x: p2.x, y: p2.y });
          }
        }

        if (v1Id === v2Id) return alt;

        // Prevent duplicate wall
        const exists = alt.walls.some(
          (w) =>
            (w.startVertexId === v1Id && w.endVertexId === v2Id) ||
            (w.startVertexId === v2Id && w.endVertexId === v1Id)
        );
        if (exists) return alt;

        const newWall: Wall = {
          id: `w_${Date.now()}`,
          startVertexId: v1Id,
          endVertexId: v2Id,
          thickness: project.settings.wallDefaultThickness,
          height: project.settings.wallDefaultHeight,
          material: { finish: 'drywall_white' },
        };

        const updatedWalls = [...alt.walls, newWall];
        const updatedRooms = detectRooms(vertices, updatedWalls, alt.rooms);

        return {
          ...alt,
          vertices,
          walls: updatedWalls,
          rooms: updatedRooms,
        };
      });
    },
    [mutateActiveAlternative, project.settings]
  );

  // MOVE VERTEX
  const moveVertex = useCallback(
    (vertexId: string, newPos: Point2D) => {
      mutateActiveAlternative((alt) => {
        const vertices = alt.vertices.map((v) =>
          v.id === vertexId ? { ...v, x: newPos.x, y: newPos.y } : v
        );
        const rooms = detectRooms(vertices, alt.walls, alt.rooms);
        return {
          ...alt,
          vertices,
          rooms,
        };
      });
    },
    [mutateActiveAlternative]
  );

  // MOVE FURNITURE
  const moveFurniture = useCallback(
    (id: string, newPos: Point2D) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        furniture: alt.furniture.map((f) =>
          f.id === id ? { ...f, x: newPos.x, y: newPos.y } : f
        ),
      }));
    },
    [mutateActiveAlternative]
  );

  // ROTATE FURNITURE
  const rotateFurniture = useCallback(
    (id: string, newRotation: number) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        furniture: alt.furniture.map((f) =>
          f.id === id ? { ...f, rotation: (newRotation % 360 + 360) % 360 } : f
        ),
      }));
    },
    [mutateActiveAlternative]
  );

  // ADD FURNITURE FROM CATALOG
  const addFurnitureFromCatalog = useCallback(
    (catalogId: string, worldPos: Point2D) => {
      const def = FURNITURE_CATALOG.find((item) => item.id === catalogId);
      if (!def) return;

      const newItem: FurnitureItem = {
        id: `f_${Date.now()}`,
        catalogId: def.id,
        name: def.name,
        category: def.category,
        x: worldPos.x,
        y: worldPos.y,
        elevation: def.defaultElevation,
        rotation: 0,
        width: def.defaultWidth,
        depth: def.defaultDepth,
        height: def.defaultHeight,
        color: def.defaultColor,
        unitPrice: def.defaultPrice,
      };

      mutateActiveAlternative((alt) => ({
        ...alt,
        furniture: [...alt.furniture, newItem],
      }));

      setSelection({ type: 'furniture', id: newItem.id });
    },
    [mutateActiveAlternative]
  );

  // UPDATE FURNITURE PROPERTIES
  const updateFurniture = useCallback(
    (id: string, updates: Partial<FurnitureItem>) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        furniture: alt.furniture.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
    },
    [mutateActiveAlternative]
  );

  // ADD OPENING (Door / Window)
  const addOpening = useCallback(
    (wallId: string, offset: number, type: 'door' | 'window') => {
      const newOpening: Opening = {
        id: `op_${Date.now()}`,
        wallId,
        type,
        offset: Math.max(0.1, offset),
        width: type === 'door' ? 0.9 : 1.5,
        height: type === 'door' ? 2.1 : 1.8,
        sillHeight: type === 'door' ? 0 : 0.8,
        swingAngle: type === 'door' ? 90 : 0,
        flipSwing: false,
        flipSide: false,
      };

      mutateActiveAlternative((alt) => ({
        ...alt,
        openings: [...alt.openings, newOpening],
      }));

      setSelection({ type: 'opening', id: newOpening.id });
    },
    [mutateActiveAlternative]
  );

  // MOVE OPENING
  const moveOpening = useCallback(
    (openingId: string, newOffset: number) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        openings: alt.openings.map((o) =>
          o.id === openingId ? { ...o, offset: newOffset } : o
        ),
      }));
    },
    [mutateActiveAlternative]
  );

  // FLIP OPENING
  const flipOpening = useCallback(
    (openingId: string, prop: 'flipSwing' | 'flipSide') => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        openings: alt.openings.map((o) =>
          o.id === openingId ? { ...o, [prop]: !o[prop] } : o
        ),
      }));
    },
    [mutateActiveAlternative]
  );

  // UPDATE OPENING
  const updateOpening = useCallback(
    (openingId: string, updates: Partial<Opening>) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        openings: alt.openings.map((o) =>
          o.id === openingId ? { ...o, ...updates } : o
        ),
      }));
    },
    [mutateActiveAlternative]
  );

  // UPDATE WALL
  const updateWall = useCallback(
    (wallId: string, updates: Partial<Wall>) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        walls: alt.walls.map((w) => (w.id === wallId ? { ...w, ...updates } : w)),
      }));
    },
    [mutateActiveAlternative]
  );

  // UPDATE ROOM
  const updateRoom = useCallback(
    (roomId: string, updates: Partial<Room>) => {
      mutateActiveAlternative((alt) => ({
        ...alt,
        rooms: alt.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r)),
      }));
    },
    [mutateActiveAlternative]
  );

  // DELETE SELECTION
  const deleteSelection = useCallback(() => {
    if (!selection.id || !selection.type) return;

    mutateActiveAlternative((alt) => {
      if (selection.type === 'furniture') {
        return {
          ...alt,
          furniture: alt.furniture.filter((f) => f.id !== selection.id),
        };
      }
      if (selection.type === 'wall') {
        const remainingWalls = alt.walls.filter((w) => w.id !== selection.id);
        const remainingOpenings = alt.openings.filter((o) => o.wallId !== selection.id);
        const updatedRooms = detectRooms(alt.vertices, remainingWalls, alt.rooms);
        return {
          ...alt,
          walls: remainingWalls,
          openings: remainingOpenings,
          rooms: updatedRooms,
        };
      }
      if (selection.type === 'opening') {
        return {
          ...alt,
          openings: alt.openings.filter((o) => o.id !== selection.id),
        };
      }
      if (selection.type === 'vertex') {
        // Remove connected walls
        const remainingWalls = alt.walls.filter(
          (w) => w.startVertexId !== selection.id && w.endVertexId !== selection.id
        );
        const remainingVertices = alt.vertices.filter((v) => v.id !== selection.id);
        const wallIds = new Set(remainingWalls.map((w) => w.id));
        const remainingOpenings = alt.openings.filter((o) => wallIds.has(o.wallId));
        const updatedRooms = detectRooms(remainingVertices, remainingWalls, alt.rooms);
        return {
          ...alt,
          vertices: remainingVertices,
          walls: remainingWalls,
          openings: remainingOpenings,
          rooms: updatedRooms,
        };
      }
      return alt;
    });

    setSelection({ type: null, id: null });
  }, [selection, mutateActiveAlternative]);

  // DUPLICATE SELECTION
  const duplicateSelection = useCallback(() => {
    if (!selection.id || selection.type !== 'furniture') return;
    const item = activeAlternative.furniture.find((f) => f.id === selection.id);
    if (!item) return;

    const dup: FurnitureItem = {
      ...deepClone(item),
      id: `f_${Date.now()}`,
      name: `${item.name} (Copy)`,
      x: item.x + 0.6,
      y: item.y + 0.6,
    };

    mutateActiveAlternative((alt) => ({
      ...alt,
      furniture: [...alt.furniture, dup],
    }));

    setSelection({ type: 'furniture', id: dup.id });
  }, [selection, activeAlternative.furniture, mutateActiveAlternative]);

  // UPDATE SETTINGS
  const updateSettings = useCallback(
    (updater: (prev: ProjectSettings) => ProjectSettings) => {
      setProject((prev) => ({
        ...prev,
        settings: updater(prev.settings),
      }));
    },
    []
  );

  return {
    project,
    activeAlternative,
    selection,
    activeTool,
    selectedCatalogId,
    viewMode,
    splitRatio,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    setSelection,
    setActiveTool,
    setSelectedCatalogId,
    setViewMode,
    setSplitRatio,
    undo,
    redo,
    setActiveAlternative,
    createAlternative,
    deleteAlternative,
    loadPresetProject,
    importProject,
    addWall,
    moveVertex,
    moveFurniture,
    rotateFurniture,
    addFurnitureFromCatalog,
    updateFurniture,
    addOpening,
    moveOpening,
    flipOpening,
    updateOpening,
    updateWall,
    updateRoom,
    deleteSelection,
    duplicateSelection,
    updateSettings,
  };
}
