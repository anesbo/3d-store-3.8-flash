import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import {
  DesignAlternative,
  ProjectSettings,
  SelectionState,
  Camera3DMode,
} from '../types/model';
import { buildFurnitureMesh, buildWallMesh, buildRoomFloorMesh } from './proceduralMeshes';
import { FpsControls } from './FpsControls';
import { Eye, Move3d, Compass, Sun, Maximize2, Layers } from 'lucide-react';

export interface ThreeSceneHandle {
  captureSnapshot: () => string;
}

interface ThreeSceneProps {
  alternative: DesignAlternative;
  settings: ProjectSettings;
  selection: SelectionState;
  onSelect: (selection: SelectionState) => void;
  onUpdateSettings?: (updater: (prev: ProjectSettings) => ProjectSettings) => void;
}

export const ThreeScene = forwardRef<ThreeSceneHandle, ThreeSceneProps>(function ThreeScene(
  { alternative, settings, selection, onSelect, onUpdateSettings },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cameraMode, setCameraMode] = useState<Camera3DMode>('orbit');
  const [isFpsLocked, setIsFpsLocked] = useState(false);
  const [sunAngle, setSunAngle] = useState(settings.sunElevation ?? 45);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const fpsControlsRef = useRef<FpsControls | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  // Dynamic mesh root groups
  const wallsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const roomsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const furnitureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const selectionHighlightRef = useRef<THREE.BoxHelper | null>(null);

  // Orbit navigation state
  const orbitRef = useRef({
    target: new THREE.Vector3(0, 0, 0),
    radius: 18,
    theta: Math.PI / 4, // azimuth
    phi: Math.PI / 3,   // elevation
    isDragging: false,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  // Provide snapshot export to parent
  useImperativeHandle(ref, () => ({
    captureSnapshot: () => {
      if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return '';
      // Force a render
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      return rendererRef.current.domElement.toDataURL('image/png');
    },
  }));

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c0e14');
    scene.fog = new THREE.FogExp2('#0c0e14', 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(12, 14, 16);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // Lighting
    const hemiLight = new THREE.HemisphereLight('#f4f6fc', '#252830', settings.ambientIntensity3D || 0.65);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const dirLight = new THREE.DirectionalLight('#fffaf0', settings.sunIntensity3D || 1.2);
    dirLight.position.set(18, 26, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.bias = -0.0004;
    const d = 25;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    // Ambient subtle studio point light
    const fillLight = new THREE.PointLight('#a3c2e8', 0.35, 40);
    fillLight.position.set(-10, 15, -10);
    scene.add(fillLight);

    // Infinite ground plane grid
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#10121a'),
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.005;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(60, 60, '#262938', '#1a1c27');
    gridHelper.position.y = 0.001;
    scene.add(gridHelper);

    // Add main procedural groups
    scene.add(roomsGroupRef.current);
    scene.add(wallsGroupRef.current);
    scene.add(furnitureGroupRef.current);

    // FPS controls
    const fps = new FpsControls(camera, canvasRef.current);
    fps.onUnlock(() => {
      setIsFpsLocked(false);
    });
    fpsControlsRef.current = fps;

    // Animation & render loop
    let reqId: number;
    let lastTime = performance.now();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (cameraMode === 'walkthrough' && fpsControlsRef.current?.isLocked) {
        fpsControlsRef.current.update(delta);
      } else {
        // Orbit camera update
        const orbit = orbitRef.current;
        const x = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
        const y = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
        const z = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
        camera.position.set(x, y, z);
        camera.lookAt(orbit.target);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      fps.dispose();
      renderer.dispose();
    };
  }, []);

  // Sync FPS wall collision geometry whenever walls change
  useEffect(() => {
    if (fpsControlsRef.current) {
      fpsControlsRef.current.setWalls(alternative.walls, alternative.vertices);
    }
  }, [alternative.walls, alternative.vertices]);

  // Sync procedural scene meshes when alternative updates
  useEffect(() => {
    if (!sceneRef.current) return;

    // 1. Rebuild Rooms (flooring)
    while (roomsGroupRef.current.children.length > 0) {
      roomsGroupRef.current.remove(roomsGroupRef.current.children[0]);
    }
    alternative.rooms.forEach((room) => {
      const roomMesh = buildRoomFloorMesh(room);
      roomsGroupRef.current.add(roomMesh);
    });

    // 2. Rebuild Walls & Openings
    while (wallsGroupRef.current.children.length > 0) {
      wallsGroupRef.current.remove(wallsGroupRef.current.children[0]);
    }
    const vertexMap = new Map(alternative.vertices.map((v) => [v.id, v]));

    alternative.walls.forEach((wall) => {
      const vStart = vertexMap.get(wall.startVertexId);
      const vEnd = vertexMap.get(wall.endVertexId);
      if (!vStart || !vEnd) return;

      const wallMesh = buildWallMesh(
        wall,
        vStart,
        vEnd,
        alternative.openings,
        settings.showWallTransparency3D
      );
      wallsGroupRef.current.add(wallMesh);
    });

    // 3. Rebuild Furniture items
    while (furnitureGroupRef.current.children.length > 0) {
      furnitureGroupRef.current.remove(furnitureGroupRef.current.children[0]);
    }
    alternative.furniture.forEach((item) => {
      const itemGroup = buildFurnitureMesh(item);
      furnitureGroupRef.current.add(itemGroup);
    });

    // 4. Update Selection Bounding Box Highlight
    if (selectionHighlightRef.current) {
      sceneRef.current.remove(selectionHighlightRef.current);
      selectionHighlightRef.current = null;
    }

    if (selection.id) {
      let targetObj: THREE.Object3D | null = null;
      if (selection.type === 'furniture') {
        targetObj = furnitureGroupRef.current.children.find(
          (c) => c.userData?.id === selection.id
        ) || null;
      } else if (selection.type === 'wall') {
        targetObj = wallsGroupRef.current.children.find(
          (c) => c.userData?.id === selection.id
        ) || null;
      }

      if (targetObj) {
        const box = new THREE.BoxHelper(targetObj, new THREE.Color('#38bdf8'));
        sceneRef.current.add(box);
        selectionHighlightRef.current = box;
      }
    }
  }, [alternative, settings.showWallTransparency3D, selection]);

  // Adjust Sun & Ambient light settings
  useEffect(() => {
    if (dirLightRef.current) {
      dirLightRef.current.intensity = settings.sunIntensity3D || 1.2;
      const rad = (sunAngle * Math.PI) / 180;
      dirLightRef.current.position.set(
        24 * Math.cos(rad),
        Math.max(8, 28 * Math.sin(rad)),
        20 * Math.sin(rad)
      );
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = settings.ambientIntensity3D || 0.65;
    }
  }, [sunAngle, settings.sunIntensity3D, settings.ambientIntensity3D]);

  // Mouse interaction for Orbit camera & 3D Raycasting selection
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (cameraMode === 'walkthrough') {
      if (!isFpsLocked && fpsControlsRef.current) {
        fpsControlsRef.current.lock();
        setIsFpsLocked(true);
      }
      return;
    }

    const orbit = orbitRef.current;
    orbit.lastMouseX = e.clientX;
    orbit.lastMouseY = e.clientY;

    if (e.button === 0) {
      orbit.isDragging = true;
    } else if (e.button === 1 || e.button === 2) {
      orbit.isPanning = true;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const orbit = orbitRef.current;
    if (!orbit.isDragging && !orbit.isPanning) return;

    const dx = e.clientX - orbit.lastMouseX;
    const dy = e.clientY - orbit.lastMouseY;
    orbit.lastMouseX = e.clientX;
    orbit.lastMouseY = e.clientY;

    if (orbit.isDragging) {
      orbit.theta -= dx * 0.008;
      orbit.phi -= dy * 0.008;
      // Clamp phi to avoid pole flip
      orbit.phi = Math.max(0.1, Math.min(Math.PI / 2.05, orbit.phi));
    } else if (orbit.isPanning && cameraRef.current) {
      // Pan target
      const forward = new THREE.Vector3();
      cameraRef.current.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

      const panSpeed = orbit.radius * 0.0015;
      orbit.target.addScaledVector(right, -dx * panSpeed);
      orbit.target.addScaledVector(forward, dy * panSpeed);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const orbit = orbitRef.current;
    const wasDragging = Math.abs(e.clientX - orbit.lastMouseX) > 2 || Math.abs(e.clientY - orbit.lastMouseY) > 2;
    orbit.isDragging = false;
    orbit.isPanning = false;

    // Raycast on clean click
    if (!wasDragging && e.button === 0 && cameraMode !== 'walkthrough') {
      performRaycastSelection(e);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (cameraMode === 'walkthrough') return;
    const orbit = orbitRef.current;
    orbit.radius += e.deltaY * 0.015;
    orbit.radius = Math.max(2, Math.min(60, orbit.radius));
  };

  const performRaycastSelection = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !cameraRef.current || !sceneRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // Raycast against furniture and walls
    const candidates = [
      ...furnitureGroupRef.current.children,
      ...wallsGroupRef.current.children,
      ...roomsGroupRef.current.children,
    ];

    const intersects = raycaster.intersectObjects(candidates, true);
    if (intersects.length > 0) {
      let topHit: THREE.Object3D | null = intersects[0].object;
      while (topHit && !topHit.userData?.type && topHit.parent && topHit.parent !== sceneRef.current) {
        topHit = topHit.parent;
      }

      if (topHit?.userData?.type && topHit.userData.id) {
        onSelect({
          type: topHit.userData.type,
          id: topHit.userData.id,
        });
        return;
      }
    }

    // Clicked empty floor/void: deselect
    onSelect({ type: null, id: null });
  };

  // View preset switchers
  const setPresetView = (preset: 'perspective' | 'isometric' | 'topdown') => {
    setCameraMode('orbit');
    const orbit = orbitRef.current;
    if (preset === 'perspective') {
      orbit.theta = Math.PI / 4;
      orbit.phi = Math.PI / 3;
      orbit.radius = 18;
    } else if (preset === 'isometric') {
      orbit.theta = Math.PI / 4;
      orbit.phi = Math.PI / 3.4;
      orbit.radius = 24;
    } else if (preset === 'topdown') {
      orbit.theta = 0;
      orbit.phi = 0.01;
      orbit.radius = 25;
    }
  };

  const enterWalkthrough = () => {
    setCameraMode('walkthrough');
    if (fpsControlsRef.current) {
      // Find a good starting room or center
      const startX = alternative.rooms[0]?.polygon[0]?.x ?? 0;
      const startZ = alternative.rooms[0]?.polygon[0]?.y ?? 0;
      fpsControlsRef.current.setPosition(startX, startZ);
      fpsControlsRef.current.lock();
      setIsFpsLocked(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-neutral-950 select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Floating 3D Control Bar */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1.5 bg-neutral-900/85 backdrop-blur-md border border-neutral-800 rounded-lg shadow-xl text-neutral-300 text-xs z-10">
        <button
          onClick={() => setPresetView('perspective')}
          title="3D Studio Perspective"
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded transition ${
            cameraMode === 'orbit' ? 'bg-blue-600 text-white font-medium' : 'hover:bg-neutral-800'
          }`}
        >
          <Move3d className="w-3.5 h-3.5" />
          <span>Orbit</span>
        </button>

        <button
          onClick={() => setPresetView('isometric')}
          title="Isometric Studio View"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-neutral-800 transition"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Iso</span>
        </button>

        <button
          onClick={() => setPresetView('topdown')}
          title="Top-Down 3D Plan"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded hover:bg-neutral-800 transition"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Plan 3D</span>
        </button>

        <div className="w-[1px] h-4 bg-neutral-700 mx-1" />

        <button
          onClick={enterWalkthrough}
          title="First-Person Walkthrough (WASD + Mouse)"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition ${
            cameraMode === 'walkthrough'
              ? 'bg-emerald-600 text-white font-medium'
              : 'hover:bg-neutral-800 text-emerald-400'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Walkthrough</span>
        </button>

        <div className="w-[1px] h-4 bg-neutral-700 mx-1" />

        {/* Wall Transparency Toggle */}
        <button
          onClick={() => {
            onUpdateSettings?.((s) => ({
              ...s,
              showWallTransparency3D: !s.showWallTransparency3D,
            }));
          }}
          title="Toggle Wall Cutaway / Transparency"
          className={`px-2.5 py-1.5 rounded transition ${
            settings.showWallTransparency3D
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'hover:bg-neutral-800 text-neutral-400'
          }`}
        >
          X-Ray Walls
        </button>
      </div>

      {/* Sun / Lighting Quick Dial */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-neutral-900/85 backdrop-blur-md border border-neutral-800 rounded-lg shadow-xl text-neutral-300 text-xs z-10">
        <Sun className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] text-neutral-400">Sun:</span>
        <input
          type="range"
          min="10"
          max="80"
          value={sunAngle}
          onChange={(e) => setSunAngle(Number(e.target.value))}
          className="w-20 accent-amber-400 cursor-pointer h-1.5"
          title={`Sun angle: ${sunAngle}°`}
        />
        <span className="text-[11px] font-mono text-neutral-400 w-6 text-right">{sunAngle}°</span>
      </div>

      {/* Walkthrough Mode HUD instructions */}
      {cameraMode === 'walkthrough' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-neutral-900/90 backdrop-blur-md border border-emerald-500/30 rounded-full shadow-2xl text-xs z-10 animate-fade-in">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Walkthrough Active</span>
          </div>
          <div className="text-neutral-400 flex items-center gap-2">
            <span><kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200">W</kbd><kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 ml-1">A</kbd><kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 ml-1">S</kbd><kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200 ml-1">D</kbd> Move</span>
            <span>•</span>
            <span>Mouse Look</span>
            <span>•</span>
            <span><kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200">Shift</kbd> Sprint</span>
            <span>•</span>
            <span><kbd className="px-1.5 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-neutral-200">Esc</kbd> Exit</span>
          </div>
          <button
            onClick={() => {
              fpsControlsRef.current?.unlock();
              setCameraMode('orbit');
            }}
            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-md text-[11px] font-medium"
          >
            Leave Walk
          </button>
        </div>
      )}

      {/* Reticle for Walkthrough mode */}
      {cameraMode === 'walkthrough' && isFpsLocked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-white/70 shadow-sm" />
        </div>
      )}
    </div>
  );
});
