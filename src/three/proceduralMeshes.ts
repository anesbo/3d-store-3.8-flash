import * as THREE from 'three';
import { FurnitureItem, Wall, Vertex, Opening, Room } from '../types/model';
import {
  getWallPbrMaterial,
  getFlooringPbrMaterial,
  architecturalGlassMaterial,
  blackSteelMaterial,
  brassMaterial,
  warmBulbMaterial,
} from '../materials/materialLibrary';
import { distance } from '../math/geometry';

// Shared geometries for performance reuse
const unitBoxGeom = new THREE.BoxGeometry(1, 1, 1);
const unitCylGeom = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);

// Helper to create positioned mesh with custom scaling
function createBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  castShadow = true,
  receiveShadow = true
): THREE.Mesh {
  const mesh = new THREE.Mesh(unitBoxGeom, mat);
  mesh.scale.set(w, h, d);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function createCyl(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  mat: THREE.Material,
  segments = 16,
  castShadow = true
): THREE.Mesh {
  const geom = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  return mesh;
}

// ----------------------------------------------------
// FURNITURE PROCEDURAL GENERATORS
// ----------------------------------------------------

export function buildFurnitureMesh(item: FurnitureItem): THREE.Group {
  const group = new THREE.Group();
  group.name = `furniture_${item.id}`;
  group.userData = { id: item.id, type: 'furniture', catalogId: item.catalogId };

  const w = item.width;
  const d = item.depth;
  const h = item.height;

  // Material helpers
  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(item.color || '#8c7355'),
    roughness: 0.45,
    metalness: 0.1,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#222326'),
    roughness: 0.5,
    metalness: 0.5,
  });

  const cushionMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(item.color || '#3b5443'),
    roughness: 0.85,
    metalness: 0.02,
  });

  switch (item.catalogId) {
    case 'chair-dining': {
      // 4 tapered legs
      const legR = 0.02;
      const legH = h * 0.52;
      const legX = w * 0.4;
      const legZ = d * 0.4;

      const leg1 = createCyl(legR, legR * 0.7, legH, darkMat);
      leg1.position.set(legX, legH / 2, legZ);
      const leg2 = createCyl(legR, legR * 0.7, legH, darkMat);
      leg2.position.set(-legX, legH / 2, legZ);
      const leg3 = createCyl(legR, legR * 0.7, legH, darkMat);
      leg3.position.set(legX, legH / 2, -legZ);
      const leg4 = createCyl(legR, legR * 0.7, legH, darkMat);
      leg4.position.set(-legX, legH / 2, -legZ);
      group.add(leg1, leg2, leg3, leg4);

      // Seat cushion
      const seat = createBox(w * 0.95, 0.05, d * 0.95, cushionMat);
      seat.position.set(0, legH + 0.025, 0);
      group.add(seat);

      // Backrest posts & curved back
      const backPostH = h * 0.45;
      const bp1 = createBox(0.03, backPostH, 0.03, darkMat);
      bp1.position.set(legX, legH + backPostH / 2, -legZ);
      const bp2 = createBox(0.03, backPostH, 0.03, darkMat);
      bp2.position.set(-legX, legH + backPostH / 2, -legZ);
      group.add(bp1, bp2);

      const backSplat = createBox(w * 0.9, 0.16, 0.03, primaryMat);
      backSplat.position.set(0, h - 0.1, -legZ);
      group.add(backSplat);
      break;
    }

    case 'chair-armchair': {
      // 4 brass angled legs
      const legH = h * 0.32;
      const leg1 = createCyl(0.02, 0.012, legH, brassMaterial);
      leg1.position.set(w * 0.38, legH / 2, d * 0.38);
      const leg2 = createCyl(0.02, 0.012, legH, brassMaterial);
      leg2.position.set(-w * 0.38, legH / 2, d * 0.38);
      const leg3 = createCyl(0.02, 0.012, legH, brassMaterial);
      leg3.position.set(w * 0.38, legH / 2, -d * 0.38);
      const leg4 = createCyl(0.02, 0.012, legH, brassMaterial);
      leg4.position.set(-w * 0.38, legH / 2, -d * 0.38);
      group.add(leg1, leg2, leg3, leg4);

      // Main tub body & deep cushion
      const bodyH = h * 0.68;
      const bodyY = legH + bodyH / 2;
      const baseSeat = createBox(w * 0.95, bodyH * 0.4, d * 0.95, cushionMat);
      baseSeat.position.set(0, legH + (bodyH * 0.4) / 2, 0);
      group.add(baseSeat);

      // Left & right arms
      const armW = 0.12;
      const armL = createBox(armW, bodyH, d * 0.9, cushionMat);
      armL.position.set(-w / 2 + armW / 2, bodyY, 0);
      const armR = createBox(armW, bodyH, d * 0.9, cushionMat);
      armR.position.set(w / 2 - armW / 2, bodyY, 0);
      group.add(armL, armR);

      // Back cushion
      const back = createBox(w * 0.96, bodyH, 0.16, cushionMat);
      back.position.set(0, bodyY, -d / 2 + 0.08);
      group.add(back);
      break;
    }

    case 'stool-bar': {
      // Pedestal base & footrest ring
      const base = createCyl(w * 0.42, w * 0.44, 0.025, blackSteelMaterial);
      base.position.set(0, 0.0125, 0);
      const stem = createCyl(0.035, 0.035, h * 0.88, blackSteelMaterial);
      stem.position.set(0, (h * 0.88) / 2, 0);
      const ring = createCyl(w * 0.32, w * 0.32, 0.02, blackSteelMaterial, 24);
      ring.position.set(0, h * 0.35, 0);
      group.add(base, stem, ring);

      // Round cushioned seat
      const seat = createCyl(w * 0.44, w * 0.44, 0.08, cushionMat, 24);
      seat.position.set(0, h - 0.04, 0);
      group.add(seat);
      break;
    }

    case 'bench-banquette': {
      // Commercial Booth seating
      // Plinth
      const plinth = createBox(w, 0.15, d * 0.88, darkMat);
      plinth.position.set(0, 0.075, 0);
      group.add(plinth);

      // Thick seat cushion
      const seat = createBox(w, 0.35, d * 0.85, cushionMat);
      seat.position.set(0, 0.15 + 0.175, d * 0.04);
      group.add(seat);

      // Fluted Backrest (vertical channels)
      const backH = h - 0.5;
      const numFlutes = 10;
      const fluteW = w / numFlutes;
      for (let i = 0; i < numFlutes; i++) {
        const fx = -w / 2 + (i + 0.5) * fluteW;
        const flute = createCyl(fluteW * 0.48, fluteW * 0.48, backH, cushionMat, 12);
        flute.rotation.z = Math.PI / 2;
        flute.position.set(fx, 0.5 + backH / 2, -d / 2 + 0.08);
        group.add(flute);
      }
      break;
    }

    case 'table-bistro-round': {
      // Cast iron bottom disc
      const base = createCyl(w * 0.38, w * 0.4, 0.025, darkMat, 24);
      base.position.set(0, 0.0125, 0);
      // Column
      const col = createCyl(0.04, 0.045, h - 0.06, darkMat, 16);
      col.position.set(0, (h - 0.06) / 2, 0);
      // Tabletop with bevel
      const topMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color || '#f0efe9'),
        roughness: 0.2,
        metalness: 0.1,
      });
      const top = createCyl(w * 0.5, w * 0.5, 0.035, topMat, 32);
      top.position.set(0, h - 0.0175, 0);
      group.add(base, col, top);
      break;
    }

    case 'table-dining-rect': {
      // 4 rectangular solid legs
      const legW = 0.065;
      const legH = h - 0.045;
      const lx = w / 2 - legW;
      const lz = d / 2 - legW;

      const leg1 = createBox(legW, legH, legW, primaryMat);
      leg1.position.set(lx, legH / 2, lz);
      const leg2 = createBox(legW, legH, legW, primaryMat);
      leg2.position.set(-lx, legH / 2, lz);
      const leg3 = createBox(legW, legH, legW, primaryMat);
      leg3.position.set(lx, legH / 2, -lz);
      const leg4 = createBox(legW, legH, legW, primaryMat);
      leg4.position.set(-lx, legH / 2, -lz);
      group.add(leg1, leg2, leg3, leg4);

      // Apron frame
      const apronX = createBox(w - legW * 2, 0.07, 0.03, primaryMat);
      apronX.position.set(0, legH - 0.035, lz);
      const apronX2 = createBox(w - legW * 2, 0.07, 0.03, primaryMat);
      apronX2.position.set(0, legH - 0.035, -lz);
      group.add(apronX, apronX2);

      // Top
      const top = createBox(w, 0.045, d, primaryMat);
      top.position.set(0, h - 0.0225, 0);
      group.add(top);
      break;
    }

    case 'table-bar-high': {
      // Trestle legs and footrest
      const legW = 0.04;
      const legH = h - 0.05;
      const lx = w / 2 - 0.08;
      const lz = d / 2 - 0.06;

      const l1 = createBox(legW, legH, legW, blackSteelMaterial);
      l1.position.set(lx, legH / 2, lz);
      const l2 = createBox(legW, legH, legW, blackSteelMaterial);
      l2.position.set(-lx, legH / 2, lz);
      const l3 = createBox(legW, legH, legW, blackSteelMaterial);
      l3.position.set(lx, legH / 2, -lz);
      const l4 = createBox(legW, legH, legW, blackSteelMaterial);
      l4.position.set(-lx, legH / 2, -lz);

      const footrail = createBox(w - 0.16, 0.03, 0.03, blackSteelMaterial);
      footrail.position.set(0, 0.3, 0);
      group.add(l1, l2, l3, l4, footrail);

      // High table slab
      const top = createBox(w, 0.05, d, primaryMat);
      top.position.set(0, h - 0.025, 0);
      group.add(top);
      break;
    }

    case 'table-coffee': {
      const legH = h - 0.035;
      const lx = w * 0.4;
      const lz = d * 0.38;
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const leg = createCyl(0.025, 0.015, legH, primaryMat);
          leg.position.set(sx * lx, legH / 2, sz * lz);
          group.add(leg);
        }
      }
      const top = createBox(w, 0.035, d, primaryMat);
      top.position.set(0, h - 0.0175, 0);
      group.add(top);
      break;
    }

    case 'counter-pos': {
      // Main casework body
      const bodyH = h - 0.06;
      const body = createBox(w, bodyH, d * 0.95, primaryMat);
      body.position.set(0, bodyH / 2, 0);
      group.add(body);

      // Countertop with transaction overhang
      const counterTop = createBox(w + 0.06, 0.06, d + 0.06, darkMat);
      counterTop.position.set(0, h - 0.03, 0);
      group.add(counterTop);

      // POS Touchscreen Register
      const stand = createCyl(0.02, 0.02, 0.14, blackSteelMaterial);
      stand.position.set(w * 0.25, h + 0.07, 0);
      const screen = createBox(0.32, 0.22, 0.03, darkMat);
      screen.position.set(w * 0.25, h + 0.2, 0);
      screen.rotation.x = 0.3; // angled
      group.add(stand, screen);

      // Front decorative slat panels
      const numSlats = 14;
      const slatW = 0.03;
      for (let i = 0; i < numSlats; i++) {
        const sx = -w / 2 + 0.1 + (i * (w - 0.2)) / (numSlats - 1);
        const slat = createBox(slatW, bodyH * 0.85, 0.015, darkMat);
        slat.position.set(sx, bodyH / 2, d / 2 + 0.01);
        group.add(slat);
      }
      break;
    }

    case 'shelving-modular': {
      // 2 upright metal ladders
      const upH = h;
      const up1 = createBox(0.03, upH, d, blackSteelMaterial);
      up1.position.set(-w / 2 + 0.02, upH / 2, 0);
      const up2 = createBox(0.03, upH, d, blackSteelMaterial);
      up2.position.set(w / 2 - 0.02, upH / 2, 0);
      group.add(up1, up2);

      // 5 wooden shelves
      const numShelves = 5;
      for (let s = 0; s < numShelves; s++) {
        const sy = 0.2 + (s * (h - 0.35)) / (numShelves - 1);
        const shelf = createBox(w, 0.03, d * 0.95, primaryMat);
        shelf.position.set(0, sy, 0);
        group.add(shelf);

        // Display items on shelves (books/boxes)
        if (s > 0 && s < 4) {
          const item1 = createBox(0.18, 0.22, d * 0.6, cushionMat);
          item1.position.set(-w * 0.25, sy + 0.12, 0);
          const item2 = createCyl(0.06, 0.06, 0.24, darkMat);
          item2.position.set(w * 0.22, sy + 0.12, 0);
          group.add(item1, item2);
        }
      }
      break;
    }

    case 'case-pastry': {
      // Base cabinet
      const baseH = h * 0.45;
      const base = createBox(w, baseH, d, darkMat);
      base.position.set(0, baseH / 2, 0);
      group.add(base);

      // Tempered glass display cube
      const glassH = h * 0.55;
      const glassCube = createBox(w - 0.04, glassH, d - 0.04, architecturalGlassMaterial, false);
      glassCube.position.set(0, baseH + glassH / 2, 0);
      group.add(glassCube);

      // Interior tiered glass shelves
      const shelf1 = createBox(w - 0.1, 0.015, d - 0.15, architecturalGlassMaterial);
      shelf1.position.set(0, baseH + glassH * 0.4, 0);
      const shelf2 = createBox(w - 0.1, 0.015, d - 0.25, architecturalGlassMaterial);
      shelf2.position.set(0, baseH + glassH * 0.75, 0);
      group.add(shelf1, shelf2);
      break;
    }

    case 'rack-clothing': {
      // Base shoe deck
      const base = createBox(w, 0.04, d, darkMat);
      base.position.set(0, 0.02, 0);
      group.add(base);

      // Side vertical brass poles & top rail
      const pole1 = createCyl(0.016, 0.016, h - 0.04, brassMaterial);
      pole1.position.set(-w / 2 + 0.04, h / 2, 0);
      const pole2 = createCyl(0.016, 0.016, h - 0.04, brassMaterial);
      pole2.position.set(w / 2 - 0.04, h / 2, 0);
      const topRail = createCyl(0.015, 0.015, w - 0.08, brassMaterial);
      topRail.rotation.z = Math.PI / 2;
      topRail.position.set(0, h - 0.03, 0);
      group.add(pole1, pole2, topRail);

      // Hanging garment accents
      for (let g = 0; g < 4; g++) {
        const gx = -w * 0.3 + g * 0.2;
        const garment = createBox(0.04, 0.75, 0.35, primaryMat);
        garment.position.set(gx, h - 0.5, 0);
        group.add(garment);
      }
      break;
    }

    case 'counter-checkout': {
      const mainBody = createBox(w, h - 0.05, d, primaryMat);
      mainBody.position.set(0, (h - 0.05) / 2, 0);
      const topDeck = createBox(w + 0.04, 0.05, d + 0.04, darkMat);
      topDeck.position.set(0, h - 0.025, 0);
      // Small screen and pinpad
      const screen = createBox(0.24, 0.18, 0.02, darkMat);
      screen.position.set(0, h + 0.12, 0);
      group.add(mainBody, topDeck, screen);
      break;
    }

    case 'partition-crittall': {
      // Slim black steel frame and glass panes
      const frameThick = 0.04;
      const glass = createBox(w, h, 0.01, architecturalGlassMaterial, false);
      glass.position.set(0, h / 2, 0);
      group.add(glass);

      // Outer border frame
      const top = createBox(w, frameThick, frameThick, blackSteelMaterial);
      top.position.set(0, h - frameThick / 2, 0);
      const bottom = createBox(w, frameThick, frameThick, blackSteelMaterial);
      bottom.position.set(0, frameThick / 2, 0);
      const left = createBox(frameThick, h, frameThick, blackSteelMaterial);
      left.position.set(-w / 2 + frameThick / 2, h / 2, 0);
      const right = createBox(frameThick, h, frameThick, blackSteelMaterial);
      right.position.set(w / 2 - frameThick / 2, h / 2, 0);
      group.add(top, bottom, left, right);

      // Internal mullions
      const numCols = 3;
      for (let c = 1; c < numCols; c++) {
        const mx = -w / 2 + (c * w) / numCols;
        const mull = createBox(0.025, h, 0.025, blackSteelMaterial);
        mull.position.set(mx, h / 2, 0);
        group.add(mull);
      }
      const numRows = 4;
      for (let r = 1; r < numRows; r++) {
        const my = (r * h) / numRows;
        const trans = createBox(w, 0.025, 0.025, blackSteelMaterial);
        trans.position.set(0, my, 0);
        group.add(trans);
      }
      break;
    }

    case 'pillar-column': {
      // Architectural column
      const base = createBox(w, 0.15, d, darkMat);
      base.position.set(0, 0.075, 0);
      const cap = createBox(w, 0.15, d, darkMat);
      cap.position.set(0, h - 0.075, 0);
      const shaft = createCyl(w * 0.42, w * 0.42, h - 0.3, primaryMat, 24);
      shaft.position.set(0, h / 2, 0);
      group.add(base, cap, shaft);
      break;
    }

    case 'plant-potted': {
      // Ceramic pot
      const potH = h * 0.38;
      const pot = createCyl(w * 0.42, w * 0.32, potH, darkMat, 20);
      pot.position.set(0, potH / 2, 0);
      group.add(pot);

      // Stems & leaves
      const foliageH = h - potH;
      const foliageMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.color || '#2c5936'),
        roughness: 0.6,
        metalness: 0.05,
      });

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const stem = createCyl(0.015, 0.015, foliageH * 0.9, darkMat);
        stem.rotation.z = Math.sin(angle) * 0.25;
        stem.rotation.x = Math.cos(angle) * 0.25;
        stem.position.set(Math.cos(angle) * 0.08, potH + foliageH * 0.4, Math.sin(angle) * 0.08);
        group.add(stem);

        // Broad leaf plane
        const leaf = createBox(w * 0.38, 0.01, d * 0.25, foliageMat);
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.4;
        leaf.position.set(Math.cos(angle) * 0.22, potH + foliageH * 0.75, Math.sin(angle) * 0.22);
        group.add(leaf);
      }
      break;
    }

    case 'stand-menu': {
      const base = createCyl(w * 0.4, w * 0.42, 0.03, darkMat, 24);
      base.position.set(0, 0.015, 0);
      const post = createCyl(0.018, 0.018, h * 0.8, darkMat);
      post.position.set(0, (h * 0.8) / 2, 0);
      const board = createBox(w * 0.85, 0.4, 0.02, darkMat);
      board.position.set(0, h - 0.2, 0);
      board.rotation.x = 0.25;
      group.add(base, post, board);
      break;
    }

    case 'light-pendant': {
      // Ceiling canopy
      const canopy = createCyl(0.06, 0.06, 0.025, brassMaterial);
      canopy.position.set(0, h, 0);
      // Drop cord
      const cordH = h - 0.25;
      const cord = createCyl(0.005, 0.005, cordH, darkMat);
      cord.position.set(0, 0.25 + cordH / 2, 0);
      // Spun brass dome shade
      const shade = createCyl(0.08, w * 0.45, 0.22, brassMaterial, 24);
      shade.position.set(0, 0.15, 0);
      // Glowing bulb
      const bulb = createCyl(0.05, 0.05, 0.07, warmBulbMaterial, 16, false);
      bulb.position.set(0, 0.08, 0);
      group.add(canopy, cord, shade, bulb);
      break;
    }

    case 'light-track': {
      // Linear aluminum ceiling rail
      const rail = createBox(w, 0.03, 0.04, blackSteelMaterial);
      rail.position.set(0, h, 0);
      group.add(rail);

      // 3 spot canisters
      for (const offset of [-w * 0.35, 0, w * 0.35]) {
        const arm = createCyl(0.008, 0.008, 0.06, blackSteelMaterial);
        arm.position.set(offset, h - 0.04, 0);
        const canister = createCyl(0.04, 0.045, 0.12, blackSteelMaterial, 16);
        canister.rotation.x = 0.4;
        canister.position.set(offset, h - 0.09, 0.02);
        const lens = createCyl(0.038, 0.038, 0.01, warmBulbMaterial, 16, false);
        lens.rotation.x = 0.4;
        lens.position.set(offset, h - 0.14, 0.04);
        group.add(arm, canister, lens);
      }
      break;
    }

    default: {
      // Fallback clean bounding box
      const box = createBox(w, h, d, primaryMat);
      box.position.set(0, h / 2, 0);
      group.add(box);
    }
  }

  // Set position and rotation in Three.js coordinates
  // (In our 2D coordinates: x -> X, y -> Z)
  group.position.set(item.x, item.elevation, item.y);
  group.rotation.y = -(item.rotation * Math.PI) / 180;

  return group;
}

// ----------------------------------------------------
// PROCEDURAL WALL GENERATION WITH OPENINGS
// ----------------------------------------------------

export function buildWallMesh(
  wall: Wall,
  vStart: Vertex,
  vEnd: Vertex,
  openings: Opening[] = [],
  isTransparent = false
): THREE.Group {
  const group = new THREE.Group();
  group.name = `wall_${wall.id}`;
  group.userData = { id: wall.id, type: 'wall' };

  const wallLength = distance(vStart, vEnd);
  if (wallLength < 0.05) return group;

  const wallHeight = wall.height || 3.0;
  const wallThick = wall.thickness || 0.15;
  const wallMat = getWallPbrMaterial(wall.material.finish, wall.material.color, isTransparent);

  // Filter openings on this wall, clamped within wall length
  const wallOpenings = openings
    .filter((o) => o.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);

  // Create wall segments
  let curX = 0;

  for (const op of wallOpenings) {
    const opStart = Math.max(0, Math.min(wallLength, op.offset));
    const opEnd = Math.max(opStart, Math.min(wallLength, op.offset + op.width));
    const opWidth = opEnd - opStart;

    // Segment before opening (full wall height)
    if (opStart > curX + 0.001) {
      const segLen = opStart - curX;
      const segBox = createBox(segLen, wallHeight, wallThick, wallMat);
      segBox.position.set(curX + segLen / 2, wallHeight / 2, 0);
      group.add(segBox);
    }

    // Segment above/below opening
    if (op.type === 'door' || op.type === 'cased_opening') {
      // Door lintel above door opening
      const lintelH = Math.max(0, wallHeight - op.height);
      if (lintelH > 0.01) {
        const lintel = createBox(opWidth, lintelH, wallThick, wallMat);
        lintel.position.set(opStart + opWidth / 2, op.height + lintelH / 2, 0);
        group.add(lintel);
      }

      // If it's an actual door with panel
      if (op.type === 'door' && !isTransparent) {
        // Door frame
        const frameW = 0.04;
        const fL = createBox(frameW, op.height, wallThick + 0.01, blackSteelMaterial);
        fL.position.set(opStart + frameW / 2, op.height / 2, 0);
        const fR = createBox(frameW, op.height, wallThick + 0.01, blackSteelMaterial);
        fR.position.set(opEnd - frameW / 2, op.height / 2, 0);
        const fT = createBox(opWidth, frameW, wallThick + 0.01, blackSteelMaterial);
        fT.position.set(opStart + opWidth / 2, op.height - frameW / 2, 0);
        group.add(fL, fR, fT);

        // Door leaf / panel hinged at start
        const doorPanelW = opWidth - frameW * 2;
        const doorPanelH = op.height - frameW;
        const panelMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(op.color || '#402e22'),
          roughness: 0.4,
          metalness: 0.1,
        });

        const doorPivot = new THREE.Group();
        doorPivot.position.set(opStart + frameW, 0, 0);

        const doorLeaf = createBox(doorPanelW, doorPanelH, 0.04, panelMat);
        doorLeaf.position.set(doorPanelW / 2, doorPanelH / 2, 0);

        // Door handle lever
        const handle = createBox(0.12, 0.02, 0.08, brassMaterial);
        handle.position.set(doorPanelW - 0.06, 0.95, 0.03);
        doorLeaf.add(handle);

        doorPivot.add(doorLeaf);

        // Apply swing angle
        const swingRad = ((op.swingAngle || 0) * Math.PI) / 180;
        doorPivot.rotation.y = (op.flipSwing ? -1 : 1) * swingRad;

        group.add(doorPivot);
      }
    } else if (op.type === 'window') {
      // Sill segment below window
      const sillH = op.sillHeight || 0.9;
      if (sillH > 0.01) {
        const sillSeg = createBox(opWidth, sillH, wallThick, wallMat);
        sillSeg.position.set(opStart + opWidth / 2, sillH / 2, 0);
        group.add(sillSeg);
      }

      // Lintel segment above window
      const winTop = sillH + op.height;
      const lintelH = Math.max(0, wallHeight - winTop);
      if (lintelH > 0.01) {
        const lintel = createBox(opWidth, lintelH, wallThick, wallMat);
        lintel.position.set(opStart + opWidth / 2, winTop + lintelH / 2, 0);
        group.add(lintel);
      }

      // Window frame and glass pane
      if (!isTransparent) {
        const frameW = 0.04;
        const winGlass = createBox(opWidth - frameW, op.height - frameW, 0.015, architecturalGlassMaterial, false);
        winGlass.position.set(opStart + opWidth / 2, sillH + op.height / 2, 0);
        const winL = createBox(frameW, op.height, wallThick + 0.02, blackSteelMaterial);
        winL.position.set(opStart + frameW / 2, sillH + op.height / 2, 0);
        const winR = createBox(frameW, op.height, wallThick + 0.02, blackSteelMaterial);
        winR.position.set(opEnd - frameW / 2, sillH + op.height / 2, 0);
        const winT = createBox(opWidth, frameW, wallThick + 0.02, blackSteelMaterial);
        winT.position.set(opStart + opWidth / 2, winTop - frameW / 2, 0);
        const winB = createBox(opWidth + 0.06, frameW, wallThick + 0.04, blackSteelMaterial);
        winB.position.set(opStart + opWidth / 2, sillH + frameW / 2, 0);
        group.add(winGlass, winL, winR, winT, winB);
      }
    }

    curX = opEnd;
  }

  // Final wall segment after last opening
  if (curX < wallLength - 0.001) {
    const segLen = wallLength - curX;
    const segBox = createBox(segLen, wallHeight, wallThick, wallMat);
    segBox.position.set(curX + segLen / 2, wallHeight / 2, 0);
    group.add(segBox);
  }

  // Position and orient group to span from vStart to vEnd
  const angle = Math.atan2(vEnd.y - vStart.y, vEnd.x - vStart.x);
  group.position.set(vStart.x, 0, vStart.y);
  group.rotation.y = -angle;

  return group;
}

// ----------------------------------------------------
// PROCEDURAL ROOM FLOORING GENERATION
// ----------------------------------------------------

export function buildRoomFloorMesh(room: Room): THREE.Group {
  const group = new THREE.Group();
  group.name = `room_${room.id}`;
  group.userData = { id: room.id, type: 'room' };

  if (room.polygon.length < 3) return group;

  // Build Three.js Shape
  const shape = new THREE.Shape();
  const poly = room.polygon;
  shape.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) {
    shape.lineTo(poly[i].x, poly[i].y);
  }
  shape.closePath();

  const geom = new THREE.ShapeGeometry(shape);
  const floorMat = getFlooringPbrMaterial(room.flooringMaterial);

  const floorMesh = new THREE.Mesh(geom, floorMat);
  floorMesh.rotation.x = Math.PI / 2; // Flat on X-Z floor plane
  floorMesh.position.y = 0.002;       // avoid z-fighting with global ground
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  return group;
}
