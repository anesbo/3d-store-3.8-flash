import * as THREE from 'three';

// Cache generated textures so we don't recreate identical canvas textures
const textureCache = new Map<string, THREE.CanvasTexture>();

function createOffscreenCanvas(width = 512, height = 512): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

export function getProceduralWoodTexture(
  color = '#a87948',
  darkColor = '#6d4b27',
  isHerringbone = false
): THREE.CanvasTexture {
  const key = `wood_${color}_${darkColor}_${isHerringbone}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  if (isHerringbone) {
    // Draw herringbone pattern
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    const plankW = 64;
    const plankH = 256;

    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;

    for (let x = -256; x < 768; x += plankW * 2) {
      for (let y = -256; y < 768; y += plankW * 2) {
        // Slanted planks
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);

        ctx.fillStyle = ((x + y) / (plankW * 2)) % 2 === 0 ? color : darkColor;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(0, 0, plankW, plankH);
        ctx.strokeRect(0, 0, plankW, plankH);

        // subtle wood lines
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        for (let l = 10; l < plankW; l += 8) {
          ctx.fillRect(l, 0, 1, plankH);
        }

        ctx.restore();
      }
    }
  } else {
    // Straight hardwood planks
    const plankHeight = 32;
    const numPlanks = 512 / plankHeight;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < numPlanks; i++) {
      const y = i * plankHeight;
      // Vary plank base tone slightly
      const toneShift = (Math.random() - 0.5) * 20;
      ctx.fillStyle = `rgba(${toneShift > 0 ? 255 : 0}, ${toneShift > 0 ? 255 : 0}, ${toneShift > 0 ? 255 : 0}, ${Math.abs(toneShift) / 255})`;
      ctx.fillRect(0, y, 512, plankHeight);

      // Plank grain lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let g = 0; g < 15; g++) {
        const gy = y + Math.random() * plankHeight;
        ctx.fillRect(0, gy, 512, 1 + Math.random() * 1.5);
      }

      // Horizontal groove seam between planks
      ctx.fillStyle = 'rgba(20, 10, 5, 0.45)';
      ctx.fillRect(0, y, 512, 2);

      // Vertical staggered butt joints
      const staggerX = ((i * 187) % 350) + 80;
      ctx.fillRect(staggerX, y, 2, plankHeight);
      if (staggerX + 240 < 512) {
        ctx.fillRect(staggerX + 240, y, 2, plankHeight);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

export function getProceduralConcreteTexture(baseColor = '#808287'): THREE.CanvasTexture {
  const key = `concrete_${baseColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Add micro-noise and flecks
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 28;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Soft cloudy patches
  for (let p = 0; p < 30; p++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 30 + Math.random() * 80;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const alpha = 0.04 + Math.random() * 0.05;
    grad.addColorStop(0, Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

export function getProceduralTileTexture(
  tileColor = '#f2f2f4',
  groutColor = '#9a9ca1',
  tileSize = 64
): THREE.CanvasTexture {
  const key = `tile_${tileColor}_${groutColor}_${tileSize}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 512);

  // Grout background
  ctx.fillStyle = groutColor;
  ctx.fillRect(0, 0, 512, 512);

  const groutWidth = 3;
  const step = tileSize;

  for (let x = 0; x < 512; x += step) {
    for (let y = 0; y < 512; y += step) {
      ctx.fillStyle = tileColor;
      ctx.fillRect(x + groutWidth, y + groutWidth, step - groutWidth * 2, step - groutWidth * 2);

      // Subtle bevel highlight on top/left of each tile
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(x + groutWidth, y + groutWidth, step - groutWidth * 2, 2);
      ctx.fillRect(x + groutWidth, y + groutWidth, 2, step - groutWidth * 2);

      // Subtle shadow on bottom/right of each tile
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x + groutWidth, y + step - groutWidth - 2, step - groutWidth * 2, 2);
      ctx.fillRect(x + step - groutWidth - 2, y + groutWidth, 2, step - groutWidth * 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

export function getProceduralTerrazzoTexture(baseColor = '#dedede'): THREE.CanvasTexture {
  const key = `terrazzo_${baseColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Aggregate stone fleck colors
  const fleckColors = [
    '#2c3038', '#8a4b38', '#c9a265', '#4a6b5d', '#e8dfd5', '#1a1a1c', '#9b8c82'
  ];

  for (let i = 0; i < 900; i++) {
    const fx = Math.random() * 512;
    const fy = Math.random() * 512;
    const radius = 1.5 + Math.random() * 4.5;
    const color = fleckColors[Math.floor(Math.random() * fleckColors.length)];

    ctx.fillStyle = color;
    ctx.beginPath();
    // irregular polygonal chip
    const numSides = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < numSides; s++) {
      const angle = (s / numSides) * Math.PI * 2;
      const r = radius * (0.6 + Math.random() * 0.8);
      const px = fx + Math.cos(angle) * r;
      const py = fy + Math.sin(angle) * r;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

export function getProceduralDrywallTexture(baseColor = '#f5f4f0'): THREE.CanvasTexture {
  const key = `drywall_${baseColor}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(256, 256);
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);

  // Delicate micro-stipple
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const val = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, data[i] + val));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + val));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + val));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}

export function getProceduralBrickTexture(): THREE.CanvasTexture {
  const key = 'brick_exposed';
  if (textureCache.has(key)) return textureCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(512, 512);
  ctx.fillStyle = '#6e6962'; // mortar
  ctx.fillRect(0, 0, 512, 512);

  const rowHeight = 28;
  const brickWidth = 64;
  const mortar = 4;

  const numRows = 512 / rowHeight;
  for (let r = 0; r < numRows; r++) {
    const y = r * rowHeight;
    const offset = (r % 2) * (brickWidth / 2);
    for (let x = -brickWidth; x < 512 + brickWidth; x += brickWidth) {
      const bx = x + offset;
      // Brick color variation (reddish, terracotta, clay)
      const rVal = 140 + Math.floor(Math.random() * 40);
      const gVal = 60 + Math.floor(Math.random() * 30);
      const bVal = 45 + Math.floor(Math.random() * 20);

      ctx.fillStyle = `rgb(${rVal},${gVal},${bVal})`;
      ctx.fillRect(bx + mortar, y + mortar, brickWidth - mortar, rowHeight - mortar);

      // subtle texture inside brick
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let s = 0; s < 5; s++) {
        ctx.fillRect(bx + mortar + Math.random() * (brickWidth - mortar), y + mortar + Math.random() * (rowHeight - mortar), 2, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(key, texture);
  return texture;
}
