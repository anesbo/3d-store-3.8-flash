import React from 'react';
import { Wall, Vertex, Opening } from '../types/model';
import { distance } from '../math/geometry';

interface DimensionOverlayProps {
  walls: Wall[];
  vertices: Vertex[];
  openings: Opening[];
  selectedWallId: string | null;
}

export const DimensionOverlay: React.FC<DimensionOverlayProps> = ({
  walls,
  vertices,
  selectedWallId,
}) => {
  const vertexMap = new Map(vertices.map((v) => [v.id, v]));

  return (
    <g className="pointer-events-none select-none">
      {walls.map((wall) => {
        const v1 = vertexMap.get(wall.startVertexId);
        const v2 = vertexMap.get(wall.endVertexId);
        if (!v1 || !v2) return null;

        const len = distance(v1, v2);
        if (len < 0.2) return null;

        const isSelected = wall.id === selectedWallId;
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const nx = -dy / len;
        const ny = dx / len;

        // Dimension line offset from wall centerline
        const offset = (wall.thickness / 2 + 0.32) * (isSelected ? 1.1 : 1.0);

        const p1x = v1.x + nx * offset;
        const p1y = v1.y + ny * offset;
        const p2x = v2.x + nx * offset;
        const p2y = v2.y + ny * offset;

        // Angle in degrees for readable text rotation
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (angle > 90 || angle < -90) {
          angle += 180;
        }

        const midX = (p1x + p2x) / 2;
        const midY = (p1y + p2y) / 2;

        const tickLen = 0.08;
        const tickDx = (dx / len + nx) * tickLen * 0.7;
        const tickDy = (dy / len + ny) * tickLen * 0.7;

        return (
          <g key={`dim-${wall.id}`} opacity={isSelected ? 1 : 0.75}>
            {/* Witness extension lines */}
            <line
              x1={v1.x + nx * (wall.thickness / 2 + 0.05)}
              y1={v1.y + ny * (wall.thickness / 2 + 0.05)}
              x2={p1x + nx * 0.08}
              y2={p1y + ny * 0.08}
              stroke={isSelected ? '#38bdf8' : '#64748b'}
              strokeWidth={0.015}
            />
            <line
              x1={v2.x + nx * (wall.thickness / 2 + 0.05)}
              y1={v2.y + ny * (wall.thickness / 2 + 0.05)}
              x2={p2x + nx * 0.08}
              y2={p2y + ny * 0.08}
              stroke={isSelected ? '#38bdf8' : '#64748b'}
              strokeWidth={0.015}
            />

            {/* Main dimension line */}
            <line
              x1={p1x}
              y1={p1y}
              x2={p2x}
              y2={p2y}
              stroke={isSelected ? '#38bdf8' : '#64748b'}
              strokeWidth={0.018}
            />

            {/* 45° Architectural slash ticks */}
            <line
              x1={p1x - tickDx}
              y1={p1y - tickDy}
              x2={p1x + tickDx}
              y2={p1y + tickDy}
              stroke={isSelected ? '#38bdf8' : '#94a3b8'}
              strokeWidth={0.025}
            />
            <line
              x1={p2x - tickDx}
              y1={p2y - tickDy}
              x2={p2x + tickDx}
              y2={p2y + tickDy}
              stroke={isSelected ? '#38bdf8' : '#94a3b8'}
              strokeWidth={0.025}
            />

            {/* Dimension Text Pill */}
            <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
              <rect
                x={-0.38}
                y={-0.12}
                width={0.76}
                height={0.24}
                rx={0.04}
                fill="#0f172a"
                stroke={isSelected ? '#38bdf8' : '#334155'}
                strokeWidth={0.015}
              />
              <text
                x={0}
                y={0.045}
                fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                fontSize={0.11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                textAnchor="middle"
              >
                {len.toFixed(2)} m
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

