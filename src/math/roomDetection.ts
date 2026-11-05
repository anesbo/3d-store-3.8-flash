import { Vertex, Wall, Room, FlooringFinish } from '../types/model';
import { distance, polygonArea, polygonPerimeter, polygonCentroid, Point2D } from './geometry';

interface DirectedEdge {
  fromId: string;
  toId: string;
  wallId: string;
  angle: number; // Angle in radians from 'from' to 'to'
}

export function detectRooms(
  vertices: Vertex[],
  walls: Wall[],
  existingRooms: Room[] = []
): Room[] {
  if (vertices.length < 3 || walls.length < 3) {
    return [];
  }

  const vertexMap = new Map<string, Vertex>();
  vertices.forEach((v) => vertexMap.set(v.id, v));

  // Build adjacency list with directed edges
  const adj = new Map<string, DirectedEdge[]>();
  vertices.forEach((v) => adj.set(v.id, []));

  for (const wall of walls) {
    const v1 = vertexMap.get(wall.startVertexId);
    const v2 = vertexMap.get(wall.endVertexId);
    if (!v1 || !v2) continue;

    const angle12 = Math.atan2(v2.y - v1.y, v2.x - v1.x);
    const angle21 = Math.atan2(v1.y - v2.y, v1.x - v2.x);

    adj.get(v1.id)?.push({
      fromId: v1.id,
      toId: v2.id,
      wallId: wall.id,
      angle: angle12,
    });

    adj.get(v2.id)?.push({
      fromId: v2.id,
      toId: v1.id,
      wallId: wall.id,
      angle: angle21,
    });
  }

  // Sort edges around each vertex counter-clockwise
  adj.forEach((edges) => {
    edges.sort((a, b) => a.angle - b.angle);
  });

  const visitedEdges = new Set<string>();
  const detectedCycles: { vertexIds: string[]; points: Point2D[]; area: number }[] = [];

  adj.forEach((edges) => {
    for (const startEdge of edges) {
      const edgeKey = `${startEdge.fromId}->${startEdge.toId}`;
      if (visitedEdges.has(edgeKey)) continue;

      const cycleVertexIds: string[] = [];
      let currentEdge: DirectedEdge = startEdge;
      let validCycle = false;

      while (true) {
        const curKey = `${currentEdge.fromId}->${currentEdge.toId}`;
        if (visitedEdges.has(curKey)) {
          // If we looped back to the start, mark valid
          if (currentEdge.fromId === startEdge.fromId && currentEdge.toId === startEdge.toId) {
            validCycle = true;
          }
          break;
        }

        visitedEdges.add(curKey);
        cycleVertexIds.push(currentEdge.fromId);

        const nextVertexId = currentEdge.toId;
        const outgoing = adj.get(nextVertexId);
        if (!outgoing || outgoing.length === 0) break;

        // In incoming edge perspective, the back angle is angle + PI
        const backAngle = currentEdge.angle + Math.PI;
        const normalizedBackAngle = Math.atan2(Math.sin(backAngle), Math.cos(backAngle));

        // Find the edge that is next in counter-clockwise order from backAngle
        // i.e., sharpest left turn
        let nextEdgeIndex = -1;
        for (let i = 0; i < outgoing.length; i++) {
          if (outgoing[i].angle > normalizedBackAngle) {
            nextEdgeIndex = i;
            break;
          }
        }
        if (nextEdgeIndex === -1) {
          nextEdgeIndex = 0;
        }

        currentEdge = outgoing[nextEdgeIndex];

        if (currentEdge.fromId === startEdge.fromId && currentEdge.toId === startEdge.toId) {
          validCycle = true;
          break;
        }

        // Safety break for overly long loops
        if (cycleVertexIds.length > 50) break;
      }

      if (validCycle && cycleVertexIds.length >= 3) {
        const points = cycleVertexIds
          .map((id) => vertexMap.get(id))
          .filter((v): v is Vertex => v !== undefined)
          .map((v) => ({ x: v.x, y: v.y }));

        // Compute signed area (using standard SVG coordinate system, check orientation)
        let signedArea = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          signedArea += points[i].x * points[j].y - points[j].x * points[i].y;
        }
        signedArea /= 2;

        // Interior faces in standard CCW traversal have negative signedArea when Y is down,
        // or positive when Y is up. Let's make sure only bounded interior faces with area > 0.5m² are kept.
        // We know the unbounded outer face has opposite orientation and typically very large area,
        // or the sign is opposite to the interior faces.
        if (signedArea > 0.1 && points.length >= 3) {
          detectedCycles.push({
            vertexIds: cycleVertexIds,
            points,
            area: Math.abs(signedArea),
          });
        }
      }
    }
  });

  // Also check if any cycles were inverted due to winding
  // If no cycles detected or only 1 with inverted sign, handle fallback
  const rooms: Room[] = [];
  const defaultFinishes: FlooringFinish[] = [
    'hardwood_natural',
    'polished_concrete',
    'ceramic_tile',
    'terrazzo_light',
    'hardwood_herringbone',
  ];

  detectedCycles.forEach((cycle, index) => {
    const area = polygonArea(cycle.points);
    if (area < 0.5) return; // ignore slivers

    const perimeter = polygonPerimeter(cycle.points);
    const centroid = polygonCentroid(cycle.points);

    // Try to match with existing room close to this centroid
    const existingMatch = existingRooms.find((r) => {
      const c = polygonCentroid(r.polygon);
      return distance(c, centroid) < 1.0;
    });

    const roomName = existingMatch?.name ?? (index === 0 ? 'Main Space' : `Room ${index + 1}`);
    const flooring = existingMatch?.flooringMaterial ?? defaultFinishes[index % defaultFinishes.length];
    const unitCost = existingMatch?.unitCostPerSqMeter ?? 65;

    rooms.push({
      id: existingMatch?.id ?? `room-${index + 1}-${Math.round(centroid.x * 10)}_${Math.round(centroid.y * 10)}`,
      name: roomName,
      vertexIds: cycle.vertexIds,
      polygon: cycle.points,
      area: Math.round(area * 100) / 100,
      perimeter: Math.round(perimeter * 100) / 100,
      flooringMaterial: flooring,
      unitCostPerSqMeter: unitCost,
    });
  });

  return rooms;
}
