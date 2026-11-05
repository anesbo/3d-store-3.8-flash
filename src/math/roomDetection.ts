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
  const rawCycles: { vertexIds: string[]; points: Point2D[]; signedArea: number; area: number }[] = [];

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

        if (cycleVertexIds.length > 50) break;
      }

      if (validCycle && cycleVertexIds.length >= 3) {
        const points = cycleVertexIds
          .map((id) => vertexMap.get(id))
          .filter((v): v is Vertex => v !== undefined)
          .map((v) => ({ x: v.x, y: v.y }));

        let signedArea = 0;
        const n = points.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          signedArea += points[i].x * points[j].y - points[j].x * points[i].y;
        }
        signedArea /= 2;

        const area = Math.abs(signedArea);
        if (area >= 0.5) {
          rawCycles.push({
            vertexIds: cycleVertexIds,
            points,
            signedArea,
            area,
          });
        }
      }
    }
  });

  // Canonicalize cycle keys so same cycle in different starting positions is deduplicated
  const uniqueCycles: typeof rawCycles = [];
  const seenCycleKeys = new Set<string>();

  for (const c of rawCycles) {
    const sortedIds = [...c.vertexIds].sort().join(',');
    if (!seenCycleKeys.has(sortedIds)) {
      seenCycleKeys.add(sortedIds);
      uniqueCycles.push(c);
    }
  }

  // Filter out the outer unbounded boundary face.
  let validRoomCycles: typeof rawCycles = [];
  if (uniqueCycles.length <= 1) {
    validRoomCycles = uniqueCycles;
  } else {
    const posCycles = uniqueCycles.filter((c) => c.signedArea > 0);
    const negCycles = uniqueCycles.filter((c) => c.signedArea < 0);

    if (posCycles.length > 0 && negCycles.length > 0) {
      if (posCycles.length >= negCycles.length) {
        validRoomCycles = posCycles;
      } else {
        validRoomCycles = negCycles;
      }
    } else {
      validRoomCycles = uniqueCycles;
    }
  }

  const rooms: Room[] = [];
  const defaultFinishes: FlooringFinish[] = [
    'hardwood_natural',
    'polished_concrete',
    'ceramic_tile',
    'terrazzo_light',
    'hardwood_herringbone',
    'slate_stone',
  ];

  validRoomCycles.forEach((cycle, index) => {
    const area = polygonArea(cycle.points);
    if (area < 0.5) return;

    const perimeter = polygonPerimeter(cycle.points);
    const centroid = polygonCentroid(cycle.points);

    // Match with existing room
    const existingMatch = existingRooms.find((r) => {
      const c = polygonCentroid(r.polygon);
      return distance(c, centroid) < 1.2;
    });

    const roomName = existingMatch?.name ?? (index === 0 ? 'Main Space' : `Room ${index + 1}`);
    const flooring = existingMatch?.flooringMaterial ?? defaultFinishes[index % defaultFinishes.length];
    const unitCost = existingMatch?.unitCostPerSqMeter ?? 65;

    rooms.push({
      id: existingMatch?.id ?? `room_${index + 1}_${Math.round(centroid.x * 10)}_${Math.round(centroid.y * 10)}`,
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
