import * as THREE from 'three';
import { FlooringFinish, WallFinish } from '../types/model';
import {
  getProceduralWoodTexture,
  getProceduralConcreteTexture,
  getProceduralTileTexture,
  getProceduralTerrazzoTexture,
  getProceduralDrywallTexture,
  getProceduralBrickTexture,
} from './proceduralTextures';

export function getWallPbrMaterial(
  finish: WallFinish,
  customColor?: string,
  isTransparent = false
): THREE.Material {
  let mat: THREE.MeshStandardMaterial;

  switch (finish) {
    case 'drywall_white': {
      const tex = getProceduralDrywallTexture('#faf8f5');
      tex.repeat.set(2, 2);
      mat = new THREE.MeshStandardMaterial({
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#f4f3ee'),
        map: tex,
        roughness: 0.88,
        metalness: 0.02,
      });
      break;
    }
    case 'drywall_dark': {
      const tex = getProceduralDrywallTexture('#24262b');
      tex.repeat.set(2, 2);
      mat = new THREE.MeshStandardMaterial({
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#22242a'),
        map: tex,
        roughness: 0.82,
        metalness: 0.05,
      });
      break;
    }
    case 'concrete': {
      const tex = getProceduralConcreteTexture('#7c7f85');
      tex.repeat.set(2, 2);
      mat = new THREE.MeshStandardMaterial({
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#83868c'),
        map: tex,
        roughness: 0.55,
        metalness: 0.08,
      });
      break;
    }
    case 'brick': {
      const tex = getProceduralBrickTexture();
      tex.repeat.set(3, 3);
      mat = new THREE.MeshStandardMaterial({
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#d47b67'),
        map: tex,
        roughness: 0.92,
        metalness: 0.02,
      });
      break;
    }
    case 'tile_white': {
      const tex = getProceduralTileTexture('#ffffff', '#c2c4cb', 48);
      tex.repeat.set(4, 4);
      mat = new THREE.MeshStandardMaterial({
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#ffffff'),
        map: tex,
        roughness: 0.22,
        metalness: 0.06,
      });
      break;
    }
    case 'wood_panel': {
      const tex = getProceduralWoodTexture('#b88b58', '#7a542b', false);
      tex.repeat.set(2, 2);
      mat = new THREE.MeshStandardMaterial({
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#a87747'),
        map: tex,
        roughness: 0.5,
        metalness: 0.04,
      });
      break;
    }
    default: {
      mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(customColor || '#f0ede6'),
        roughness: 0.8,
        metalness: 0.05,
      });
    }
  }

  if (isTransparent) {
    mat.transparent = true;
    mat.opacity = 0.35;
    mat.depthWrite = false;
  }

  return mat;
}

export function getFlooringPbrMaterial(
  finish: FlooringFinish,
  customColor?: string
): THREE.Material {
  switch (finish) {
    case 'hardwood_natural': {
      const tex = getProceduralWoodTexture('#a87c4f', '#6b4725', false);
      tex.repeat.set(1.5, 1.5);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#ffffff'),
        roughness: 0.38,
        metalness: 0.03,
      });
    }
    case 'hardwood_herringbone': {
      const tex = getProceduralWoodTexture('#b58352', '#724b26', true);
      tex.repeat.set(2, 2);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#ffffff'),
        roughness: 0.36,
        metalness: 0.03,
      });
    }
    case 'polished_concrete': {
      const tex = getProceduralConcreteTexture('#7d8087');
      tex.repeat.set(3, 3);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#94979e'),
        roughness: 0.28,
        metalness: 0.12,
      });
    }
    case 'ceramic_tile': {
      const tex = getProceduralTileTexture('#eaecef', '#989aa0', 64);
      tex.repeat.set(3, 3);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#ffffff'),
        roughness: 0.18,
        metalness: 0.08,
      });
    }
    case 'terrazzo_light': {
      const tex = getProceduralTerrazzoTexture('#e8e5dc');
      tex.repeat.set(2.5, 2.5);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#ffffff'),
        roughness: 0.25,
        metalness: 0.08,
      });
    }
    case 'terrazzo_dark': {
      const tex = getProceduralTerrazzoTexture('#2c2d33');
      tex.repeat.set(2.5, 2.5);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#ffffff'),
        roughness: 0.25,
        metalness: 0.08,
      });
    }
    case 'carpet_tile': {
      const tex = getProceduralDrywallTexture('#383a42');
      tex.repeat.set(8, 8);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#32353b'),
        roughness: 0.96,
        metalness: 0.01,
      });
    }
    case 'slate_stone': {
      const tex = getProceduralConcreteTexture('#2b2e34');
      tex.repeat.set(4, 4);
      return new THREE.MeshStandardMaterial({
        map: tex,
        color: customColor ? new THREE.Color(customColor) : new THREE.Color('#2e323a'),
        roughness: 0.65,
        metalness: 0.05,
      });
    }
  }
}

// Architectural glass
export const architecturalGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color('#cbe3eb'),
  transparent: true,
  opacity: 0.35,
  roughness: 0.06,
  metalness: 0.1,
  transmission: 0.9,
  ior: 1.52,
  thickness: 0.02,
  depthWrite: false,
});

// Metal materials
export const blackSteelMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#1c1d21'),
  roughness: 0.32,
  metalness: 0.85,
});

export const brassMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#d4af37'),
  roughness: 0.28,
  metalness: 0.88,
});

export const chromeMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color('#f0f0f5'),
  roughness: 0.12,
  metalness: 0.95,
});

// Glowing bulb material
export const warmBulbMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color('#fff4db'),
});
