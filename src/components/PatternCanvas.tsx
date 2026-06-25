import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import type { Pattern, GridTile } from '../types';
import { DOT_SHORTS, getTileName, getTileStyle } from '../utils';
import { ZoomIn, ZoomOut, Compass, Eye, EyeOff } from 'lucide-react';

const TILE_SIZE = 400;
const DOT_SPACING = 65;
const DOT_RADIUS = 7;
const HIT_RADIUS = 26;

export const PatternCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store actions and state
  const {
    patterns,
    offset,
    zoom,
    gridLinesVisible,
    setOffset,
    setZoom,
    setGridLinesVisible,
    addPattern,
    selectedPatternId,
    setSelectedPatternId
  } = useStore();

  // Local drawing/panning state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTile, setActiveTile] = useState<GridTile | null>(null);
  const [currentSeq, setCurrentSeq] = useState<number[]>([]);
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });
  const [hoveredDot, setHoveredDot] = useState<{ x: number; y: number; dotIndex: number } | null>(null);

  // Coordinate transformations
  const getMouseWorldCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    return {
      x: (screenX - offset.x) / zoom,
      y: (screenY - offset.y) / zoom
    };
  }, [offset, zoom]);

  // Convert screen coordinates to Tile/Grid and Dot Index (if near any dot)
  const getGridAndDotAt = useCallback((worldX: number, worldY: number) => {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    const localX = worldX - tileX * TILE_SIZE;
    const localY = worldY - tileY * TILE_SIZE;

    const centerX = TILE_SIZE / 2;
    const centerY = TILE_SIZE / 2;

    for (let i = 0; i < 9; i++) {
      const col = (i % 3) - 1;
      const row = Math.floor(i / 3) - 1;
      const dotX = centerX + col * DOT_SPACING;
      const dotY = centerY + row * DOT_SPACING;

      const distance = Math.hypot(localX - dotX, localY - dotY);
      if (distance < HIT_RADIUS) {
        return {
          tile: { x: tileX, y: tileY } as GridTile,
          dotIndex: i,
          dotWorldX: tileX * TILE_SIZE + dotX,
          dotWorldY: tileY * TILE_SIZE + dotY
        };
      }
    }
    return null;
  }, []);

  // Set up resize observer to dynamically adjust canvas bounds
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Main Draw Call
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and translate viewport
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw viewport static background grid if active
    if (gridLinesVisible) {
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const bgGridSize = 50 * zoom;
      
      const startX = offset.x % bgGridSize;
      for (let x = startX; x < canvas.width; x += bgGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      const startY = offset.y % bgGridSize;
      for (let y = startY; y < canvas.height; y += bgGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Visible ranges (world coordinates)
    const worldLeft = -offset.x / zoom;
    const worldTop = -offset.y / zoom;
    const worldRight = (canvas.width - offset.x) / zoom;
    const worldBottom = (canvas.height - offset.y) / zoom;

    const startTileX = Math.floor(worldLeft / TILE_SIZE);
    const endTileX = Math.ceil(worldRight / TILE_SIZE);
    const startTileY = Math.floor(worldTop / TILE_SIZE);
    const endTileY = Math.ceil(worldBottom / TILE_SIZE);

    // Render each visible tile grid
    for (let tx = startTileX; tx <= endTileX; tx++) {
      for (let ty = startTileY; ty <= endTileY; ty++) {
        const tileStyle = getTileStyle(tx, ty);
        const tileName = getTileName(tx, ty);
        const ox = tx * TILE_SIZE;
        const oy = ty * TILE_SIZE;

        // Draw tile border guidelines if visible
        if (gridLinesVisible) {
          ctx.strokeStyle = `hsla(${tileStyle.hue}, 40%, 40%, 0.15)`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 8]);
          ctx.strokeRect(ox, oy, TILE_SIZE, TILE_SIZE);
          ctx.setLineDash([]);

          // Sector Label
          ctx.fillStyle = `hsla(${tileStyle.hue}, 40%, 65%, 0.3)`;
          ctx.font = '10px monospace';
          ctx.fillText(tileName, ox + 15, oy + 25);
        }

        // Draw ambient fill of the sector
        ctx.fillStyle = tileStyle.bgColor;
        ctx.fillRect(ox + 4, oy + 4, TILE_SIZE - 8, TILE_SIZE - 8);

        // Grid center details
        const centerX = ox + TILE_SIZE / 2;
        const centerY = oy + TILE_SIZE / 2;

        // 1. Draw existing/saved patterns in this tile
        const tilePatterns = patterns.filter(p => p.gridTile.x === tx && p.gridTile.y === ty);
        tilePatterns.forEach(p => {
          const isSelected = p.id === selectedPatternId;
          const strokeColor = isSelected 
            ? `hsla(${tileStyle.hue}, 100%, 65%, 0.85)` 
            : p.status === 'successful' 
              ? 'rgba(16, 185, 129, 0.45)' 
              : p.status === 'failed' 
                ? 'rgba(239, 68, 68, 0.45)' 
                : `hsla(${tileStyle.hue}, 70%, 55%, 0.35)`;
          
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = isSelected ? 4.5 : 3.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();

          p.dotSequence.forEach((dot, index) => {
            const col = (dot % 3) - 1;
            const row = Math.floor(dot / 3) - 1;
            const dx = centerX + col * DOT_SPACING;
            const dy = centerY + row * DOT_SPACING;
            if (index === 0) ctx.moveTo(dx, dy);
            else ctx.lineTo(dx, dy);
          });
          ctx.stroke();

          // Highlight starting dot of completed patterns
          if (p.dotSequence.length > 0) {
            const startDot = p.dotSequence[0];
            const col = (startDot % 3) - 1;
            const row = Math.floor(startDot / 3) - 1;
            ctx.fillStyle = isSelected ? '#38bdf8' : p.status === 'successful' ? '#34d399' : '#f87171';
            ctx.beginPath();
            ctx.arc(centerX + col * DOT_SPACING, centerY + row * DOT_SPACING, DOT_RADIUS + 2, 0, Math.PI * 2);
            ctx.fill();
          }

          // Render directional index sequences on connection vertices
          p.dotSequence.forEach((dot, index) => {
            const col = (dot % 3) - 1;
            const row = Math.floor(dot / 3) - 1;
            const dx = centerX + col * DOT_SPACING;
            const dy = centerY + row * DOT_SPACING;
            
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.beginPath();
            ctx.arc(dx, dy, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
            ctx.font = 'bold 8px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((index + 1).toString(), dx, dy);
          });
        });

        // 2. Draw currently active drawing pattern in this tile
        const isDrawingInThisTile = isDrawing && activeTile?.x === tx && activeTile?.y === ty;
        if (isDrawingInThisTile && currentSeq.length > 0) {
          ctx.strokeStyle = '#38bdf8'; // Active electric cyan drawing line
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();

          currentSeq.forEach((dot, index) => {
            const col = (dot % 3) - 1;
            const row = Math.floor(dot / 3) - 1;
            const dx = centerX + col * DOT_SPACING;
            const dy = centerY + row * DOT_SPACING;
            if (index === 0) ctx.moveTo(dx, dy);
            else ctx.lineTo(dx, dy);
          });

          // Draw the live "Ghost Line" connecting to the dragging cursor
          ctx.lineTo(mouseWorldPos.x, mouseWorldPos.y);
          ctx.stroke();

          // Highlight dots active in sequence
          currentSeq.forEach((dot) => {
            const col = (dot % 3) - 1;
            const row = Math.floor(dot / 3) - 1;
            const dx = centerX + col * DOT_SPACING;
            const dy = centerY + row * DOT_SPACING;

            // Halo pulse
            ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
            ctx.beginPath();
            ctx.arc(dx, dy, DOT_RADIUS * 2.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0ea5e9';
            ctx.beginPath();
            ctx.arc(dx, dy, DOT_RADIUS + 1, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // 3. Draw dots for this tile 3x3 grid
        for (let i = 0; i < 9; i++) {
          const col = (i % 3) - 1;
          const row = Math.floor(i / 3) - 1;
          const dx = centerX + col * DOT_SPACING;
          const dy = centerY + row * DOT_SPACING;

          const isHovered = hoveredDot && hoveredDot.x === tx && hoveredDot.y === ty && hoveredDot.dotIndex === i;
          
          // Draw outer interactive ring on hover
          if (isHovered) {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(dx, dy, HIT_RADIUS - 5, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Node style
          ctx.fillStyle = isHovered 
            ? '#38bdf8' 
            : tileStyle.dotColor;
          
          ctx.beginPath();
          ctx.arc(dx, dy, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();

          // Standard internal center core
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(dx, dy, DOT_RADIUS - 4, 0, Math.PI * 2);
          ctx.fill();

          // Sub-indicator coordinates under dot
          if (gridLinesVisible && zoom > 0.65) {
            ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(DOT_SHORTS[i], dx, dy + DOT_RADIUS + 12);
          }
        }
      }
    }

    ctx.restore();
  }, [offset, zoom, gridLinesVisible, patterns, activeTile, currentSeq, isDrawing, mouseWorldPos, hoveredDot, selectedPatternId]);

  // RequestAnimationFrame sync
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      draw();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [draw]);

  // Touch gesture state refs for mobile pinch-to-zoom
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const touchStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const touchStartRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchMoveRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchEndRef = useRef<((e: TouchEvent) => void) | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleStart(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2) {
      // Two-finger pinch-zoom start
      setIsDrawing(false);
      setIsPanning(false);
      setActiveTile(null);
      setCurrentSeq([]);

      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
      touchStartOffsetRef.current = { ...offset };
      touchStartCenterRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / touchStartDistRef.current;

      const newZoom = Math.min(Math.max(touchStartZoomRef.current * scale, 0.15), 3.5);
      
      const centerX = touchStartCenterRef.current.x;
      const centerY = touchStartCenterRef.current.y;
      
      const worldX = (centerX - touchStartOffsetRef.current.x) / touchStartZoomRef.current;
      const worldY = (centerY - touchStartOffsetRef.current.y) / touchStartZoomRef.current;

      setZoom(newZoom);
      setOffset({
        x: centerX - worldX * newZoom,
        y: centerY - worldY * newZoom
      });
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    handleEnd();
    touchStartDistRef.current = null;
  };

  // Keep touch event refs updated on every render
  useEffect(() => {
    touchStartRef.current = handleTouchStart;
    touchMoveRef.current = handleTouchMove;
    touchEndRef.current = handleTouchEnd;
  });

  // Attach non-passive touch listeners directly to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onStart = (e: TouchEvent) => touchStartRef.current?.(e);
    const onMove = (e: TouchEvent) => touchMoveRef.current?.(e);
    const onEnd = (e: TouchEvent) => touchEndRef.current?.(e);

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  // Touch and Mouse handlers
  const handleStart = (clientX: number, clientY: number, isRightClick: boolean = false) => {
    const world = getMouseWorldCoords(clientX, clientY);
    const hit = getGridAndDotAt(world.x, world.y);

    if (hit && !isRightClick) {
      // Start drawing a pattern lock sequence
      setIsDrawing(true);
      setActiveTile(hit.tile);
      setCurrentSeq([hit.dotIndex]);
      setMouseWorldPos(world);
    } else {
      // Start panning the infinite 2D canvas
      setIsPanning(true);
      setPanStart({ x: clientX - offset.x, y: clientY - offset.y });
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    const world = getMouseWorldCoords(clientX, clientY);
    setMouseWorldPos(world);

    if (isPanning) {
      setOffset({
        x: clientX - panStart.x,
        y: clientY - panStart.y
      });
    } else if (isDrawing && activeTile) {
      const hit = getGridAndDotAt(world.x, world.y);
      // Ensure hit is inside the currently drawing tile grid and does not double-add consecutive duplicates
      if (hit && hit.tile.x === activeTile.x && hit.tile.y === activeTile.y) {
        if (!currentSeq.includes(hit.dotIndex)) {
          setCurrentSeq(prev => [...prev, hit.dotIndex]);
        }
      }
    } else {
      // Track hover feedback
      const hit = getGridAndDotAt(world.x, world.y);
      if (hit) {
        setHoveredDot({ x: hit.tile.x, y: hit.tile.y, dotIndex: hit.dotIndex });
      } else {
        setHoveredDot(null);
      }
    }
  };

  const handleEnd = () => {
    if (isDrawing && activeTile && currentSeq.length >= 2) {
      // Check if this exact sequence already exists anywhere in the entire canvas
      const existingPattern = patterns.find(p => 
        p.dotSequence.length === currentSeq.length &&
        p.dotSequence.every((val, index) => val === currentSeq[index])
      );

      if (existingPattern) {
        // Pattern already exists: highlight it and auto-center viewport on it
        setSelectedPatternId(existingPattern.id);
        
        const canvas = canvasRef.current;
        if (canvas) {
          const targetZoom = 1;
          const worldCenterX = existingPattern.gridTile.x * TILE_SIZE + TILE_SIZE / 2;
          const worldCenterY = existingPattern.gridTile.y * TILE_SIZE + TILE_SIZE / 2;
          setZoom(targetZoom);
          setOffset({
            x: canvas.width / 2 - worldCenterX * targetZoom,
            y: canvas.height / 2 - worldCenterY * targetZoom
          });
        }
      } else {
        // Finalize pattern sequence
        const dirs = ['TL', 'TC', 'TR', 'ML', 'C', 'MR', 'BL', 'BC', 'BR'];
        const startingIndex = currentSeq[0];
        const startingDirection = dirs[startingIndex] || 'N/A';

        const newPattern: Pattern = {
          id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          gridTile: activeTile,
          dotSequence: currentSeq,
          startingDot: startingIndex,
          startingDirection,
          timestamp: Date.now(),
          status: 'attempted'
        };

        addPattern(newPattern);
      }
    }

    setIsDrawing(false);
    setIsPanning(false);
    setActiveTile(null);
    setCurrentSeq([]);
  };

  // Zoom manipulation with mouse scroll wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom centering logic: maintain mouse position in world space after zoom scale update
    const worldX = (mouseX - offset.x) / zoom;
    const worldY = (mouseY - offset.y) / zoom;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.15), 3.5);
    
    setZoom(newZoom);
    setOffset({
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom
    });
  };

  // Utility to auto center canvas back to (0,0) tile
  const autoCenter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setZoom(1);
    setOffset({
      x: canvas.width / 2 - TILE_SIZE / 2,
      y: canvas.height / 2 - TILE_SIZE / 2
    });
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex-1 overflow-hidden select-none outline-none"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY, e.button === 2)}
        onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}

        style={{ cursor: isPanning ? 'grabbing' : isDrawing ? 'crosshair' : 'grab' }}
        className="w-full h-full bg-slate-950 block"
      />

      {/* Floating Canvas Diagnostics overlay */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none font-mono text-[10px] text-slate-500 bg-slate-950/70 py-1.5 px-3 rounded-lg backdrop-blur border border-slate-800/60 shadow-lg">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Compass className="w-3.5 h-3.5 text-blue-400" />
          <span>Viewport Diagnostics</span>
        </div>
        <div className="mt-1">Zoom Factor: {zoom.toFixed(2)}x</div>
        <div>Pan Offset: ({Math.round(offset.x)}, {Math.round(offset.y)})</div>
        {isDrawing && activeTile && (
          <div className="text-blue-400 animate-pulse font-medium">
            Active Tile: Sector ({activeTile.x}, {activeTile.y})
          </div>
        )}
      </div>

      {/* Floating Controls Overlay */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-2xl z-20">
        <button 
          onClick={() => setZoom(zoom * 1.2)} 
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setZoom(zoom / 1.2)} 
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button 
          onClick={autoCenter} 
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          title="Recenter Camera"
        >
          <Compass className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800 mx-1" />
        <button 
          onClick={() => setGridLinesVisible(!gridLinesVisible)} 
          className={`p-1.5 rounded-lg transition-all ${gridLinesVisible ? 'text-blue-400 bg-slate-800/80' : 'text-slate-500 hover:text-slate-300'}`}
          title={gridLinesVisible ? "Hide Sector Grids" : "Show Sector Grids"}
        >
          {gridLinesVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
