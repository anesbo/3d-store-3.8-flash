import React from 'react';
import { FurnitureItem } from '../types/model';

interface FurnitureSvgProps {
  item: FurnitureItem;
  isSelected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onStartDrag: (e: React.MouseEvent, handle: 'move' | 'rotate') => void;
}

export const FurnitureSvg: React.FC<FurnitureSvgProps> = ({
  item,
  isSelected,
  onSelect,
  onStartDrag,
}) => {
  const w = item.width;
  const d = item.depth;
  const rad = (item.rotation * Math.PI) / 180;

  // Render top-down blueprint graphic depending on catalogId
  const renderGlyph = () => {
    switch (item.catalogId) {
      case 'chair-dining':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              rx={0.06}
              className="fill-amber-950/40 stroke-amber-500/80"
              strokeWidth={0.02}
            />
            {/* Curved backrest */}
            <path
              d={`M ${-w * 0.45} ${-d * 0.35} Q 0 ${-d * 0.55} ${w * 0.45} ${-d * 0.35}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={0.03}
              strokeLinecap="round"
            />
            {/* Front indicator notch */}
            <circle cx={0} cy={d * 0.25} r={0.02} fill="#f59e0b" opacity={0.6} />
          </g>
        );

      case 'chair-armchair':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              rx={0.12}
              className="fill-emerald-950/50 stroke-emerald-500/80"
              strokeWidth={0.025}
            />
            {/* Seat cushion */}
            <rect
              x={-w * 0.32}
              y={-d * 0.28}
              width={w * 0.64}
              height={d * 0.62}
              rx={0.06}
              className="fill-emerald-800/30 stroke-emerald-400/50"
              strokeWidth={0.015}
            />
            {/* Arms */}
            <path
              d={`M ${-w / 2 + 0.05} ${-d / 2 + 0.08} L ${-w / 2 + 0.05} ${d / 2 - 0.08}`}
              stroke="#34d399"
              strokeWidth={0.04}
              strokeLinecap="round"
            />
            <path
              d={`M ${w / 2 - 0.05} ${-d / 2 + 0.08} L ${w / 2 - 0.05} ${d / 2 - 0.08}`}
              stroke="#34d399"
              strokeWidth={0.04}
              strokeLinecap="round"
            />
          </g>
        );

      case 'stool-bar':
        return (
          <g>
            <circle
              cx={0}
              cy={0}
              r={w / 2}
              className="fill-neutral-800 stroke-neutral-400"
              strokeWidth={0.02}
            />
            <circle cx={0} cy={0} r={w * 0.36} fill="none" stroke="#60a5fa" strokeWidth={0.015} />
            <line x1={-w * 0.3} y1={0} x2={w * 0.3} y2={0} stroke="#60a5fa" strokeWidth={0.012} />
            <line x1={0} y1={-w * 0.3} x2={0} y2={w * 0.3} stroke="#60a5fa" strokeWidth={0.012} />
          </g>
        );

      case 'bench-banquette':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              rx={0.04}
              className="fill-red-950/40 stroke-rose-500/80"
              strokeWidth={0.025}
            />
            {/* Fluted back lines */}
            {Array.from({ length: 8 }).map((_, i) => {
              const x = -w / 2 + (i + 1) * (w / 9);
              return (
                <line
                  key={i}
                  x1={x}
                  y1={-d / 2}
                  x2={x}
                  y2={-d * 0.15}
                  stroke="#fb7185"
                  strokeWidth={0.015}
                  strokeDasharray="0.03,0.015"
                />
              );
            })}
            <line
              x1={-w / 2}
              y1={-d * 0.15}
              x2={w / 2}
              y2={-d * 0.15}
              stroke="#fb7185"
              strokeWidth={0.02}
            />
          </g>
        );

      case 'table-bistro-round':
        return (
          <g>
            <circle
              cx={0}
              cy={0}
              r={w / 2}
              className="fill-slate-800/80 stroke-slate-300"
              strokeWidth={0.025}
            />
            <circle cx={0} cy={0} r={w * 0.18} fill="#475569" stroke="#94a3b8" strokeWidth={0.015} />
          </g>
        );

      case 'table-dining-rect':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              rx={0.04}
              className="fill-amber-950/30 stroke-amber-400"
              strokeWidth={0.025}
            />
            {/* Corner leg indications */}
            {[-w / 2 + 0.04, w / 2 - 0.08].map((lx, i) =>
              [-d / 2 + 0.04, d / 2 - 0.08].map((ly, j) => (
                <rect
                  key={`${i}-${j}`}
                  x={lx}
                  y={ly}
                  width={0.04}
                  height={0.04}
                  fill="#f59e0b"
                />
              ))
            )}
            {/* Diagonal subtle grain hint */}
            <line
              x1={-w * 0.4}
              y1={0}
              x2={w * 0.4}
              y2={0}
              stroke="#f59e0b"
              strokeWidth={0.015}
              strokeDasharray="0.08,0.04"
              opacity={0.4}
            />
          </g>
        );

      case 'table-bar-high':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              rx={0.02}
              className="fill-zinc-800/80 stroke-zinc-400"
              strokeWidth={0.02}
            />
            <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#a1a1aa" strokeWidth={0.02} />
          </g>
        );

      case 'counter-pos':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              className="fill-stone-800 stroke-stone-300"
              strokeWidth={0.03}
            />
            {/* POS terminal box */}
            <rect
              x={w * 0.1}
              y={-d * 0.3}
              width={0.3}
              height={0.22}
              className="fill-sky-500/50 stroke-sky-400"
              strokeWidth={0.015}
            />
            {/* Barista prep divider */}
            <line
              x1={-w * 0.15}
              y1={-d / 2}
              x2={-w * 0.15}
              y2={d / 2}
              stroke="#a8a29e"
              strokeWidth={0.02}
              strokeDasharray="0.04,0.03"
            />
            <text
              x={-w * 0.32}
              y={0.04}
              fill="#e7e5e4"
              fontSize={0.12}
              fontWeight="bold"
              textAnchor="middle"
            >
              BAR / POS
            </text>
          </g>
        );

      case 'shelving-modular':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              className="fill-neutral-800 stroke-neutral-400"
              strokeWidth={0.02}
            />
            {/* Shelving lines */}
            <line
              x1={-w / 2}
              y1={-d * 0.2}
              x2={w / 2}
              y2={-d * 0.2}
              stroke="#9ca3af"
              strokeWidth={0.015}
            />
            <line
              x1={-w / 2}
              y1={d * 0.2}
              x2={w / 2}
              y2={d * 0.2}
              stroke="#9ca3af"
              strokeWidth={0.015}
            />
          </g>
        );

      case 'case-pastry':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              className="fill-cyan-950/40 stroke-cyan-400"
              strokeWidth={0.025}
            />
            <rect
              x={-w / 2 + 0.04}
              y={-d / 2 + 0.04}
              width={w - 0.08}
              height={d - 0.08}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={0.015}
              strokeDasharray="0.04,0.02"
            />
            <text
              x={0}
              y={0.04}
              fill="#38bdf8"
              fontSize={0.1}
              fontWeight="bold"
              textAnchor="middle"
            >
              PASTRY CASE
            </text>
          </g>
        );

      case 'rack-clothing':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              rx={0.02}
              fill="none"
              stroke="#eab308"
              strokeWidth={0.02}
            />
            <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#fde047" strokeWidth={0.03} />
            {[-w * 0.35, -w * 0.12, w * 0.12, w * 0.35].map((gx, idx) => (
              <line
                key={idx}
                x1={gx}
                y1={-d * 0.3}
                x2={gx}
                y2={d * 0.3}
                stroke="#eab308"
                strokeWidth={0.015}
              />
            ))}
          </g>
        );

      case 'partition-crittall':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              className="fill-cyan-950/30 stroke-neutral-200"
              strokeWidth={0.025}
            />
            <line
              x1={-w / 2}
              y1={0}
              x2={w / 2}
              y2={0}
              stroke="#38bdf8"
              strokeWidth={0.015}
              strokeDasharray="0.05,0.02"
            />
          </g>
        );

      case 'pillar-column':
        return (
          <g>
            <circle
              cx={0}
              cy={0}
              r={w / 2}
              className="fill-neutral-700 stroke-neutral-300"
              strokeWidth={0.03}
            />
            <circle cx={0} cy={0} r={w * 0.4} fill="none" stroke="#e5e7eb" strokeWidth={0.015} />
          </g>
        );

      case 'plant-potted':
        return (
          <g>
            <circle
              cx={0}
              cy={0}
              r={w / 2}
              className="fill-emerald-950/60 stroke-emerald-500"
              strokeWidth={0.025}
            />
            <circle
              cx={0}
              cy={0}
              r={w * 0.35}
              fill="#14532d"
              stroke="#4ade80"
              strokeWidth={0.015}
            />
            {/* Leaf petals */}
            {Array.from({ length: 6 }).map((_, i) => {
              const a = (i / 6) * Math.PI * 2;
              const lx = Math.cos(a) * w * 0.38;
              const ly = Math.sin(a) * w * 0.38;
              return (
                <ellipse
                  key={i}
                  cx={lx}
                  cy={ly}
                  rx={0.08}
                  ry={0.04}
                  transform={`rotate(${(a * 180) / Math.PI}, ${lx}, ${ly})`}
                  className="fill-emerald-400/80"
                />
              );
            })}
          </g>
        );

      case 'light-pendant':
        return (
          <g>
            <circle
              cx={0}
              cy={0}
              r={w / 2}
              className="fill-amber-500/20 stroke-amber-400"
              strokeWidth={0.02}
              strokeDasharray="0.04,0.02"
            />
            <circle cx={0} cy={0} r={0.06} fill="#fbbf24" />
            <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#f59e0b" strokeWidth={0.01} />
            <line x1={0} y1={-w / 2} x2={0} y2={w / 2} stroke="#f59e0b" strokeWidth={0.01} />
          </g>
        );

      case 'light-track':
        return (
          <g>
            <rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              className="fill-neutral-800 stroke-neutral-400"
              strokeWidth={0.015}
            />
            {[-w * 0.35, 0, w * 0.35].map((sx, idx) => (
              <circle
                key={idx}
                cx={sx}
                cy={0}
                r={0.05}
                className="fill-amber-400 stroke-amber-300"
                strokeWidth={0.01}
              />
            ))}
          </g>
        );

      default:
        return (
          <rect
            x={-w / 2}
            y={-d / 2}
            width={w}
            height={d}
            rx={0.02}
            className="fill-neutral-800 stroke-neutral-400"
            strokeWidth={0.02}
          />
        );
    }
  };

  return (
    <g
      transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation})`}
      className="cursor-move group"
      onMouseDown={(e) => {
        onSelect(e);
        onStartDrag(e, 'move');
      }}
    >
      {/* Underlying selection bounding box / glow */}
      {isSelected && (
        <rect
          x={-w / 2 - 0.06}
          y={-d / 2 - 0.06}
          width={w + 0.12}
          height={d + 0.12}
          rx={0.04}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={0.03}
          strokeDasharray="0.08,0.04"
          className="animate-pulse"
        />
      )}

      {/* Main item glyph */}
      {renderGlyph()}

      {/* Name and dimensions tag if selected */}
      {isSelected && (
        <g transform={`translate(0, ${d / 2 + 0.22})`}>
          <rect
            x={-0.6}
            y={-0.12}
            width={1.2}
            height={0.24}
            rx={0.04}
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth={0.015}
          />
          <text
            x={0}
            y={0.04}
            fill="#38bdf8"
            fontSize={0.09}
            fontWeight="bold"
            textAnchor="middle"
          >
            {item.name} ({item.width.toFixed(2)}m × {item.depth.toFixed(2)}m)
          </text>
        </g>
      )}

      {/* Rotation handle on top when selected */}
      {isSelected && (
        <g
          transform={`translate(0, ${-d / 2 - 0.28})`}
          className="cursor-crosshair"
          onMouseDown={(e) => {
            e.stopPropagation();
            onStartDrag(e, 'rotate');
          }}
        >
          <line x1={0} y1={0.28} x2={0} y2={0} stroke="#38bdf8" strokeWidth={0.02} strokeDasharray="0.04,0.02" />
          <circle cx={0} cy={0} r={0.09} fill="#0284c7" stroke="#ffffff" strokeWidth={0.02} />
          {/* Circular arrow icon */}
          <path
            d="M -0.04 -0.02 A 0.04 0.04 0 1 1 0.04 0.02"
            fill="none"
            stroke="#ffffff"
            strokeWidth={0.015}
          />
        </g>
      )}
    </g>
  );
};
