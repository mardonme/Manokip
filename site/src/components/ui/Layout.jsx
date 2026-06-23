import React from 'react';

/** Max-width content column with consistent gutters. */
export function Container({ as: Tag = 'div', className = '', style, children, ...rest }) {
  return (
    <Tag className={`mk-container ${className}`} style={style} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Vertical section rhythm. `tone="ink"` flips to the dark band style.
 * `bleed` removes the container so children can go edge-to-edge.
 */
export function Section({ as: Tag = 'section', tone, size, className = '', bleed = false, style, children, ...rest }) {
  const tones = {
    ink: { background: 'var(--ink-bg)', color: 'var(--on-ink)' },
    sunken: { background: 'var(--bg-2)' },
  };
  const sizeClass = size === 'sm' ? 'mk-section-sm' : 'mk-section';
  return (
    <Tag className={`${sizeClass} ${className}`} style={{ ...(tones[tone] || {}), ...style }} {...rest}>
      {bleed ? children : <div className="mk-container">{children}</div>}
    </Tag>
  );
}

/** Eyebrow + heading pair used at the top of most sections. */
export function SectionHead({ eyebrow, title, action, dark = false, style }) {
  return (
    <div className="mk-between mk-wrap" style={{ alignItems: 'flex-end', marginBottom: 32, gap: 16, ...style }}>
      <div>
        {eyebrow && <div className="mk-eyebrow" style={dark ? { color: 'var(--on-ink-dim)' } : undefined}>{eyebrow}</div>}
        <h2 style={{ fontSize: 'clamp(30px, 4vw, 48px)', fontWeight: 600, margin: '10px 0 0', color: dark ? 'var(--on-ink)' : 'var(--ink)' }}>
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export default Container;
