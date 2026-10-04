interface PatternPreviewProps {
  sequence: readonly number[];
  className?: string;
  label?: string;
}

export function PatternPreview({ sequence, className = '', label = 'Pattern preview' }: PatternPreviewProps) {
  const point = (dot: number) => ({ x: 25 + (dot % 3) * 50, y: 25 + Math.floor(dot / 3) * 50 });
  return (
    <svg className={`pattern-preview ${className}`} viewBox="0 0 150 150" role="img" aria-label={`${label}: ${sequence.map((dot) => dot + 1).join(', ')}`}>
      {sequence.slice(1).map((dot, index) => {
        const from = point(sequence[index]);
        const to = point(dot);
        return <line key={`${sequence[index]}-${dot}-${index}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
      })}
      {Array.from({ length: 9 }, (_, dot) => {
        const p = point(dot);
        return <circle className={sequence.includes(dot) ? 'preview-dot active' : 'preview-dot'} key={dot} cx={p.x} cy={p.y} r={sequence.includes(dot) ? 4 : 3} />;
      })}
      {sequence.map((dot, index) => {
        const p = point(dot);
        return <text className="preview-order" key={`order-${dot}`} x={p.x} y={p.y - 9} textAnchor="middle">{index + 1}</text>;
      })}
    </svg>
  );
}
