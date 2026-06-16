export function Skeleton({
  width = '100%',
  height = '20px',
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <Skeleton width="100%" height="180px" />
          <div style={{ padding: '12px', display: 'grid', gap: '8px' }}>
            <Skeleton width="80%" height="16px" />
            <Skeleton width="60%" height="14px" />
            <Skeleton width="40%" height="20px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 3 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ borderRadius: '12px', overflow: 'hidden', background: 'var(--surface)', border: '1px solid var(--line)' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px', padding: '12px', borderBottom: i < rows - 1 ? '1px solid var(--line)' : 'none' }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} width="100%" height="16px" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, widths = ['100%', '100%', '80%'] }: { lines?: number; widths?: string[] }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={widths[i] || '100%'} height="16px" />
      ))}
    </div>
  );
}
