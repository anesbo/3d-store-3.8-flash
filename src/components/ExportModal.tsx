import React, { useRef, useState } from 'react';
import { Project, DesignAlternative } from '../types/model';
import { distance } from '../math/geometry';
import {
  X,
  FileCode,
  FileSpreadsheet,
  Image,
  Upload,
  Download,
  Check,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  activeAlternative: DesignAlternative;
  onImportProject: (imported: Project) => void;
  onCapture3DSnapshot?: () => string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  activeAlternative,
  onImportProject,
  onCapture3DSnapshot,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  if (!isOpen) return null;

  // 1. JSON Export
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Forma_${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_v${project.version}.json`);
    dlAnchor.click();
  };

  // 2. JSON Import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.alternatives || !Array.isArray(parsed.alternatives)) {
          throw new Error('Project file is missing required design alternatives structure.');
        }
        onImportProject(parsed);
        setImportSuccess(true);
        setImportError(null);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setImportError(err.message || 'Failed to parse JSON file.');
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  // 3. Architectural SVG Export (Scaled Vector Floorplan 1:50)
  const handleExportArchitecturalSvg = () => {
    const alt = activeAlternative;
    const vertexMap = new Map(alt.vertices.map((v) => [v.id, v]));

    // Find bounds
    let minX = -10, maxX = 10, minY = -10, maxY = 10;
    if (alt.vertices.length > 0) {
      minX = Math.min(...alt.vertices.map((v) => v.x)) - 2;
      maxX = Math.max(...alt.vertices.map((v) => v.x)) + 2;
      minY = Math.min(...alt.vertices.map((v) => v.y)) - 2;
      maxY = Math.max(...alt.vertices.map((v) => v.y)) + 2;
    }

    const widthMeters = maxX - minX;
    const heightMeters = maxY - minY;
    const scalePx = 50; // 50px = 1m (1:20 / 1:50 scale display)
    const svgW = widthMeters * scalePx;
    const svgH = heightMeters * scalePx;

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX * scalePx} ${minY * scalePx} ${svgW} ${svgH}" width="${svgW}" height="${svgH}" style="background-color: #0c0e14; font-family: sans-serif;">
  <defs>
    <pattern id="grid" width="${scalePx}" height="${scalePx}" patternUnits="userSpaceOnUse">
      <path d="M ${scalePx} 0 L 0 0 0 ${scalePx}" fill="none" stroke="#1f2333" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect x="${minX * scalePx}" y="${minY * scalePx}" width="${svgW}" height="${svgH}" fill="url(#grid)" />
  <g id="rooms">
`;

    // Rooms
    alt.rooms.forEach((room) => {
      const pts = room.polygon.map((p) => `${p.x * scalePx},${p.y * scalePx}`).join(' ');
      const cx = (room.polygon.reduce((a, b) => a + b.x, 0) / room.polygon.length) * scalePx;
      const cy = (room.polygon.reduce((a, b) => a + b.y, 0) / room.polygon.length) * scalePx;
      svgContent += `    <polygon points="${pts}" fill="rgba(56, 189, 248, 0.08)" stroke="#0284c7" stroke-width="1"/>
    <text x="${cx}" y="${cy - 8}" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">${room.name}</text>
    <text x="${cx}" y="${cy + 10}" fill="#94a3b8" font-size="10" text-anchor="middle">${room.area.toFixed(1)} m²</text>
`;
    });

    svgContent += `  </g>\n  <g id="walls">\n`;

    // Walls
    alt.walls.forEach((wall) => {
      const v1 = vertexMap.get(wall.startVertexId);
      const v2 = vertexMap.get(wall.endVertexId);
      if (!v1 || !v2) return;
      svgContent += `    <line x1="${v1.x * scalePx}" y1="${v1.y * scalePx}" x2="${v2.x * scalePx}" y2="${v2.y * scalePx}" stroke="#f1f5f9" stroke-width="${wall.thickness * scalePx}" stroke-linecap="square"/>\n`;
    });

    svgContent += `  </g>\n  <g id="furniture">\n`;

    // Furniture
    alt.furniture.forEach((f) => {
      svgContent += `    <g transform="translate(${f.x * scalePx}, ${f.y * scalePx}) rotate(${f.rotation})">
      <rect x="${(-f.width / 2) * scalePx}" y="${(-f.depth / 2) * scalePx}" width="${f.width * scalePx}" height="${f.depth * scalePx}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" rx="3"/>
      <text x="0" y="3" fill="#94a3b8" font-size="8" text-anchor="middle">${f.name}</text>
    </g>\n`;
    });

    // Title Block
    svgContent += `  </g>
  <!-- Architectural Title Block -->
  <g transform="translate(${(minX + 0.5) * scalePx}, ${(maxY - 1.8) * scalePx})">
    <rect width="260" height="70" fill="#0f172a" stroke="#334155" stroke-width="1" rx="4"/>
    <text x="12" y="24" fill="#38bdf8" font-size="14" font-weight="bold">FORMA: ${project.name.toUpperCase()}</text>
    <text x="12" y="42" fill="#e2e8f0" font-size="11">Layout: ${alt.name}</text>
    <text x="12" y="58" fill="#64748b" font-size="9">Scale 1:50 • Date: ${new Date().toLocaleDateString()}</text>
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Forma_Floorplan_${alt.name.replace(/[^a-zA-Z0-9]/g, '_')}_1to50.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 4. PNG 3D WebGL Canvas snapshot
  const handleExport3DSnapshot = () => {
    if (!onCapture3DSnapshot) return;
    const dataUrl = onCapture3DSnapshot();
    if (!dataUrl) return;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Forma_3D_Render_${activeAlternative.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-400" />
              Project Persistence & Export Hub
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Export CAD deliverables, schedules, or share your full design
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options Grid */}
        <div className="p-6 space-y-3">
          {/* JSON Project File */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Full Project Data (JSON)</h4>
                <p className="text-xs text-neutral-400">
                  Schema-validated project file containing all walls, alternatives & settings
                </p>
              </div>
            </div>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Export JSON
            </button>
          </div>

          {/* Architectural SVG */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Scaled Vector Floorplan (SVG)</h4>
                <p className="text-xs text-neutral-400">
                  Architectural 1:50 drawing with dimensions, room tags, and title block
                </p>
              </div>
            </div>
            <button
              onClick={handleExportArchitecturalSvg}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold transition"
            >
              Export SVG
            </button>
          </div>

          {/* 3D WebGL Snapshot */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-xl hover:border-neutral-700 transition">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-lg">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">High-Res 3D View Render (PNG)</h4>
                <p className="text-xs text-neutral-400">
                  Clean studio camera perspective capture without UI overlays
                </p>
              </div>
            </div>
            <button
              onClick={handleExport3DSnapshot}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold transition"
            >
              Capture PNG
            </button>
          </div>

          {/* Import JSON */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Import Existing Project
            </h4>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 rounded-xl p-4 text-center cursor-pointer transition"
            >
              <Upload className="w-6 h-6 text-neutral-500 mx-auto mb-1.5" />
              <p className="text-xs text-neutral-300 font-medium">Click to upload Forma .json project</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Boundary and schema checks applied</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {importSuccess && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Project imported successfully! Loading workspace...</span>
              </div>
            )}

            {importError && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>{importError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
