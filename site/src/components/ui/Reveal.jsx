import React, { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal wrapper — fades/slides children in once they enter the viewport.
 * Dependency-free (IntersectionObserver). Honors prefers-reduced-motion via CSS.
 *
 * Props:
 *  - as:       element/component to render (default 'div')
 *  - variant:  'up' | 'fade' | 'left' | 'scale'
 *  - index:    stagger position (multiplied by 60ms in CSS via --reveal-i)
 *  - once:     reveal a single time (default true)
 */
const VARIANT_CLASS = { up: '', fade: 'reveal-fade', left: 'reveal-left', scale: 'reveal-scale' };

export default function Reveal({
  as: Tag = 'div',
  variant = 'up',
  index = 0,
  once = true,
  className = '',
  style,
  children,
  ...rest
}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already-visible content (or no IO support) reveals immediately.
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShown(true);
            if (once) io.unobserve(entry.target);
          } else if (!once) {
            setShown(false);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  const cls = ['reveal', VARIANT_CLASS[variant] || '', shown ? 'is-revealed' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag ref={ref} className={cls} style={{ '--reveal-i': index, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
