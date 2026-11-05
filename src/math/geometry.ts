export interface Point2D {
  x: number;
  y: number;
}

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSq(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

export function angleDeg(from: Point2D, to: Point2D): number {
  const rad = Math.atan2(to.y - from.y, to.x - from.x);
  let deg = (rad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function snapToGridValue(val: number, step: number): number {
  if (step <= 0) return val;
  return Math.round(val / step) * step;
}

export function snapPointToGrid(pt: Point2D, step: number): Point2D {
  return {
    x: snapToGridValue(pt.x, step),
    y: snapToGridValue(pt.y, step),
  };
}

export function snapToOrthoAngles(from: Point2D, to: Point2D, angleStepDeg = 45): Point2D {
  const dist = distance(from, to);
  if (dist < 0.001) return to;

  const currentAngle = angleDeg(from, to);
  const snappedAngle = Math.round(currentAngle / angleStepDeg) * angleStepDeg;
  const rad = (snappedAngle * Math.PI) / 180;

  return {
    x: from.x + dist * Math.cos(rad),
    y: from.y + dist * Math.sin(rad),
  };
}

export function projectPointOntoSegment(
  p: Point2D,
  a: Point2D,
  b: Point2D
): { point: Point2D; t: number; dist: number } {
  const l2 = distanceSq(a, b);
  if (l2 === 0) {
    return { point: { ...a }, t: 0, dist: distance(p, a) };
  }

  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  const proj: Point2D = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return { point: proj, t, dist: distance(p, proj) };
}

export function polygonSignedArea(points: Point2D[]): number {
  let area = 0;
  const n = points.length;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area / 2;
}

export function polygonArea(points: Point2D[]): number {
  return Math.abs(polygonSignedArea(points));
}

export function polygonPerimeter(points: Point2D[]): number {
  let perim = 0;
  const n = points.length;
  if (n < 2) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perim += distance(points[i], points[j]);
  }
  return perim;
}

export function polygonCentroid(points: Point2D[]): Point2D {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...points[0] };
  if (n === 2) return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };

  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const factor = points[i].x * points[j].y - points[j].x * points[i].y;
    cx += (points[i].x + points[j].x) * factor;
    cy += (points[i].y + points[j].y) * factor;
    signedArea += factor;
  }

  signedArea *= 0.5;
  if (Math.abs(signedArea) < 1e-5) {
    // Fallback: simple average
    let sx = 0;
    let sy = 0;
    for (const p of points) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / n, y: sy / n };
  }

  cx = cx / (6 * signedArea);
  cy = cy / (6 * signedArea);
  return { x: cx, y: cy };
}

export function isPointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface SnapGuide {
  type: 'x' | 'y';
  value: number;
  originVertexId?: string;
}

export function findGuidelineSnaps(
  cursor: Point2D,
  vertices: { id: string; x: number; y: number }[],
  ignoreVertexId?: string,
  threshold = 0.15
): { snapped: Point2D; guides: SnapGuide[] } {
  let sx = cursor.x;
  let sy = cursor.y;
  const guides: SnapGuide[] = [];

  let minDiffX = threshold;
  let snapXVal: number | null = null;
  let snapXOrigin: string | undefined;

  let minDiffY = threshold;
  let snapYVal: number | null = null;
  let snapYOrigin: string | undefined;

  for (const v of vertices) {
    if (v.id === ignoreVertexId) continue;
    const dx = Math.abs(cursor.x - v.x);
    if (dx < minDiffX) {
      minDiffX = dx;
      snapXVal = v.x;
      snapXOrigin = v.id;
    }
    const dy = Math.abs(cursor.y - v.y);
    if (dy < minDiffY) {
      minDiffY = dy;
      snapYVal = v.y;
      snapYOrigin = v.id;
    }
  }

  if (snapXVal !== null) {
    sx = snapXVal;
    guides.push({ type: 'x', value: snapXVal, originVertexId: snapXOrigin });
  }
  if (snapYVal !== null) {
    sy = snapYVal;
    guides.push({ type: 'y', value: snapYVal, originVertexId: snapYOrigin });
  }

  return { snapped: { x: sx, y: sy }, guides };
}

