import { useRef, useState, type PointerEvent } from 'react';
import { appendDot } from '../domain/patterns';
import { dotsOnSegment } from '../domain/patternInput';

interface PatternGridProps {
  sequence: number[];
  onChange: (sequence: number[]) => void;
  mode: 'draw' | 'tap';
}

const point = (dot: number) => ({ x: 50 + (dot % 3) * 100, y: 50 + Math.floor(dot / 3) * 100 });

export function PatternGrid({ sequence, onChange, mode }: PatternGridProps) {
  const container = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const sequenceRef = useRef(sequence);
  const gestureOrigin = useRef<{ x: number; y: number } | null>(null);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);
  const startDot = useRef<number | null>(null);
  const moved = useRef(false);
  const suppressClick = useRef(false);
  const [cancelled, setCancelled] = useState(false);

  sequenceRef.current = sequence;

  const commit = (next: number[]) => {
    sequenceRef.current = next;
    onChange(next);
  };

  const add = (dot: number) => {
    const current = sequenceRef.current;
    if (current.includes(dot)) return;
    commit(appendDot(current, dot));
  };

  const localPoint = (event: PointerEvent<HTMLDivElement>) => {
    const rect = container.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((event.clientX - rect.left) / rect.width) * 300, y: ((event.clientY - rect.top) / rect.height) * 300 };
  };

  const hitDot = (x: number, y: number) => {
    let closest: { dot: number; distance: number } | null = null;
    for (let dot = 0; dot < 9; dot++) {
      const p = point(dot);
      const distance = Math.hypot(x - p.x, y - p.y);
      if (distance <= 31 && (!closest || distance < closest.distance)) closest = { dot, distance };
    }
    return closest?.dot ?? null;
  };

  const processSegment = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    let next = sequenceRef.current;
    for (const dot of dotsOnSegment(from, to)) if (!next.includes(dot)) next = appendDot(next, dot);
    if (next !== sequenceRef.current) commit(next);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (mode === 'tap') return;
    if (activePointer.current !== null || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const at = localPoint(event);
    const dot = at && hitDot(at.x, at.y);
    if (dot == null) return;
    event.preventDefault();
    activePointer.current = event.pointerId;
    setCancelled(false);
    gestureOrigin.current = at;
    previousPoint.current = at;
    startDot.current = dot;
    moved.current = false;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const at = localPoint(event);
    if (!at || !previousPoint.current) return;
    if (!moved.current && gestureOrigin.current && Math.hypot(at.x - gestureOrigin.current.x, at.y - gestureOrigin.current.y) >= 8) {
      moved.current = true;
      suppressClick.current = true;
      commit(startDot.current === null ? [] : [startDot.current]);
      processSegment(gestureOrigin.current, at);
    } else if (moved.current) processSegment(previousPoint.current, at);
    previousPoint.current = at;
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    const at = localPoint(event);
    if (!moved.current && at && gestureOrigin.current && startDot.current !== null && Math.hypot(at.x - gestureOrigin.current.x, at.y - gestureOrigin.current.y) >= 8) {
      moved.current = true;
      commit([startDot.current]);
      processSegment(gestureOrigin.current, at);
    } else if (moved.current && at && previousPoint.current) processSegment(previousPoint.current, at);
    if (moved.current) suppressClick.current = true;
    activePointer.current = null;
    gestureOrigin.current = null;
    previousPoint.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => { suppressClick.current = false; }, 80);
  };

  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    gestureOrigin.current = null;
    previousPoint.current = null;
    startDot.current = null;
    moved.current = false;
    suppressClick.current = true;
    setCancelled(true);
    commit([]);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onLostPointerCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    gestureOrigin.current = null;
    previousPoint.current = null;
    startDot.current = null;
    moved.current = false;
    suppressClick.current = true;
    setCancelled(true);
    commit([]);
  };

  return (
    <div className="grid-shell">
      <div
        className="pattern-grid"
        ref={container}
        role="group"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        aria-label={mode === 'draw' ? 'Interactive three by three pattern grid. Drag across dots to start a new path.' : 'Three by three pattern grid. Tap dots to append.'}
      >
        <svg className="pattern-lines" viewBox="0 0 300 300" aria-hidden="true">
          {sequence.length > 1 && sequence.slice(1).map((dot, index) => {
            const from = point(sequence[index]);
            const to = point(dot);
            return <line key={`${sequence[index]}-${dot}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
          {sequence.map((dot, index) => {
            const p = point(dot);
            return <circle className="path-node" key={`${dot}-${index}`} cx={p.x} cy={p.y} r="8" />;
          })}
        </svg>
        {Array.from({ length: 9 }, (_, dot) => {
          const p = point(dot);
          const order = sequence.indexOf(dot);
          return (
            <button
              type="button"
              className={`grid-dot${order >= 0 ? ' selected' : ''}`}
              key={dot}
              style={{ left: `${p.x / 3}%`, top: `${p.y / 3}%` }}
              aria-label={`Dot ${dot + 1}${order >= 0 ? `, point ${order + 1} in pattern` : ''}`}
              aria-pressed={order >= 0}
              onClick={() => {
                if (suppressClick.current) { suppressClick.current = false; return; }
                add(dot);
              }}
            >
              <span>{order >= 0 ? order + 1 : dot + 1}</span>
            </button>
          );
        })}
      </div>
      <div className="sequence-readout" aria-live="polite">
        {sequence.length ? sequence.map((dot, index) => <span key={`${dot}-${index}`}>{index > 0 && <b aria-hidden="true">·</b>}{dot + 1}</span>) : <span className="sequence-empty">{cancelled ? 'Gesture cancelled. Draw again.' : 'Your path appears here as you draw'}</span>}
      </div>
    </div>
  );
}
