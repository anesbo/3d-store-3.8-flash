export type Unit = 'm';

export interface Vertex {
  id: string;
  x: number; // in meters
  y: number; // in meters (corresponds to Z in 3D, where X is X and Y is Z)
}

export type WallFinish = 'drywall_white' | 'drywall_dark' | 'concrete' | 'brick' | 'tile_white' | 'wood_panel';

export interface WallMaterialDef {
  finish: WallFinish;
  color?: string;
  roughness?: number;
}

export interface Wall {
  id: string;
  startVertexId: string;
  endVertexId: string;
  thickness: number; // 0.06m to 0.80m, default 0.15m
  height: number;    // 0.30m to 6.0m, default 3.0m
  material: WallMaterialDef;
}

export type OpeningType = 'door' | 'window' | 'cased_opening';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;     // distance in meters from startVertex along wall line
  width: number;      // width in meters (>= 0.3m)
  height: number;     // height in meters (>= 0.3m)
  sillHeight: number; // elevation from floor (0 for doors, ~0.9m for standard windows)
  swingAngle: number; // 0 to 110 degrees for doors
  flipSwing: boolean; // inside/outside swing side
  flipSide: boolean;  // hinge left/right
  color?: string;
}

export type FurnitureCategory = 'seating' | 'surfaces' | 'retail' | 'decor' | 'lighting';

export interface FurnitureItem {
  id: string;
  catalogId: string;
  name: string;
  category: FurnitureCategory;
  x: number;          // center X in meters
  y: number;          // center Y in meters
  elevation: number;  // height above floor (0 for floor items, >0 for suspended/wall items)
  rotation: number;   // rotation in degrees (0 - 360)
  width: number;      // dimension along local X
  depth: number;      // dimension along local Y
  height: number;     // total height in 3D
  color?: string;
  materialPreset?: string;
  unitPrice: number;  // USD
  customProps?: Record<string, any>;
}

export type FlooringFinish = 
  | 'hardwood_natural'
  | 'hardwood_herringbone'
  | 'polished_concrete'
  | 'ceramic_tile'
  | 'terrazzo_dark'
  | 'terrazzo_light'
  | 'carpet_tile'
  | 'slate_stone';

export interface Room {
  id: string;
  name: string;
  vertexIds: string[];
  polygon: { x: number; y: number }[];
  area: number;        // square meters
  perimeter: number;   // meters
  flooringMaterial: FlooringFinish;
  unitCostPerSqMeter: number; // USD per m²
}

export interface Light {
  id: string;
  type: 'point' | 'spot' | 'pendant';
  x: number;
  y: number;
  z: number;           // height in meters
  intensity: number;
  color: string;
  distance: number;
  castShadow?: boolean;
}

export interface DesignAlternative {
  id: string;
  name: string;
  description: string;
  vertices: Vertex[];
  walls: Wall[];
  openings: Opening[];
  furniture: FurnitureItem[];
  rooms: Room[];
  lights: Light[];
}

export interface ProjectSettings {
  unit: Unit;
  gridSnap: number;        // e.g. 0.1, 0.25, 0.5, 1.0
  angleSnap: number;       // e.g. 15, 45, 90 degrees
  snapToGrid: boolean;
  snapToGuides: boolean;
  wallDefaultThickness: number;
  wallDefaultHeight: number;
  currency: string;
  showDimensions: boolean;
  showGrid: boolean;
  showRoomLabels: boolean;
  showWallTransparency3D: boolean;
  ambientIntensity3D: number;
  sunIntensity3D: number;
  sunElevation: number; // sun angle / time of day
}

export interface Project {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  activeAlternativeId: string;
  alternatives: DesignAlternative[];
  settings: ProjectSettings;
}

export type ToolMode = 
  | 'select'
  | 'wall'
  | 'door'
  | 'window'
  | 'furniture'
  | 'measure'
  | 'pan';

export type ViewMode = 'split' | '2d' | '3d';

export type Camera3DMode = 'orbit' | 'walkthrough' | 'isometric' | 'topdown';

export type SelectionType = 'wall' | 'vertex' | 'opening' | 'furniture' | 'room' | 'light' | null;

export interface SelectionState {
  type: SelectionType;
  id: string | null;
}

