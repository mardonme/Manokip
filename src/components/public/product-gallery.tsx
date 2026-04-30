// Plan 03-05 Task 5.2a — Product gallery client island (CAT-06 + SEO-05 LCP).
//
// Hero + thumbs visual contract from sketch 003 (4:3 aspect, rounded card,
// bordered thumbs). The hero CldImage is `priority` so Next.js prepends
// preload <link> hints — the LCP image candidate per Phase-3 SEO-05.
// Subsequent thumbs are `loading="lazy"` so they don't compete for
// bandwidth during the initial paint.
//
// Client component because the active-thumb state needs `useState`. Stays
// small (~30 LOC of JSX) so the hydration cost is negligible.
//
// `sizes` prop drives the responsive image set the browser picks. Below the
// 1100px sticky-rail breakpoint the hero spans the viewport (`100vw`); above
// it the hero is the page width minus the 380px rail + 40px gutter.

'use client';

import { useState } from 'react';
import { CldImage } from 'next-cloudinary';
import { cn } from '@/lib/utils';

export interface ProductGalleryProps {
  publicIds: string[];
  alt: string;
}

export function ProductGallery({ publicIds, alt }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (publicIds.length === 0) {
    // Empty-state placeholder matches the 4:3 aspect so the layout doesn't
    // shift when we later seed an image.
    return (
      <div
        className="aspect-[4/3] w-full rounded-xl border border-slate-200 bg-slate-50"
        aria-label={alt}
        data-testid="product-gallery-empty"
      />
    );
  }

  const safeIdx = activeIdx < publicIds.length ? activeIdx : 0;
  const heroPid = publicIds[safeIdx]!;

  return (
    <div data-testid="product-gallery">
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <CldImage
          src={heroPid}
          alt={alt}
          width={960}
          height={720}
          priority={safeIdx === 0}
          sizes="(max-width: 1100px) 100vw, calc(100vw - 420px)"
          className="h-full w-full object-cover"
        />
      </div>
      {publicIds.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {publicIds.map((pid, i) => (
            <button
              key={pid}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`View image ${i + 1}`}
              aria-pressed={i === safeIdx}
              className={cn(
                'aspect-[4/3] overflow-hidden rounded-md border-2 transition-colors',
                i === safeIdx
                  ? 'border-blue-700'
                  : 'border-transparent hover:border-slate-300',
              )}
            >
              <CldImage
                src={pid}
                alt=""
                width={120}
                height={90}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
