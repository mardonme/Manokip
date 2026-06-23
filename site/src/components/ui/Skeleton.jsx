import React from 'react';

/** Single shimmer block. Width/height accept any CSS length. */
export function Skeleton({ w = '100%', h = 16, r = 6, style, className = '' }) {
  return (
    <div
      className={`mk-skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: r, ...style }}
      aria-hidden="true"
    />
  );
}

/** Loading placeholder shaped like a ProductCard, so grids don't shift (CLS). */
export function ProductCardSkeleton({ compact = false }) {
  return (
    <div className="mk-card" aria-hidden="true">
      <div style={{ padding: 18, borderBottom: '1px solid var(--line-soft)' }}>
        <Skeleton h={compact ? 150 : 180} r={4} />
      </div>
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton w="40%" h={10} />
        <Skeleton w="70%" h={16} />
        <Skeleton w="55%" h={12} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          <Skeleton w={64} h={14} />
          <Skeleton w={56} h={14} />
        </div>
      </div>
    </div>
  );
}

/** N skeleton cards for grid loading states. */
export function ProductGridSkeleton({ count = 8, compact = false }) {
  return Array.from({ length: count }).map((_, i) => (
    <ProductCardSkeleton key={i} compact={compact} />
  ));
}

export default Skeleton;
