// Phase 6 plan 06-04 — REUSE-01 ProductCard reskin (in place; props frozen).
//
// Pure RSC — no client interactivity needed. v1.1 design canvas reskin:
//   - Image wrapper aspect-square (1:1 per REUSE-01 verbatim).
//   - Manufacturer label uses `<span className="mk-eyebrow">` (D-03 helper),
//     replacing the prior shadcn <Badge variant="outline">.
//   - Placeholder branch (heroPublicId === null) uses `.mk-ph .mk-ph-corners`
//     cross-hatched pattern + corner brackets (D-03 helpers), replacing the
//     prior `◯` Unicode glyph.
//   - Title uses text-ink, short description uses text-ink-2; SKU wears
//     .mk-mono tabular-nums (D-04 alias resolves to JetBrains Mono inside .mk).
//   - ZERO commerce tokens (CLAUDE.md guardrail #3) — Manometr is not e-commerce.
//
// Props interface (ProductCardProps) is FROZEN per REUSE-01 — only
// className strings and the manufacturer/placeholder JSX changed.

import { CldImage } from 'next-cloudinary';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import type { Locale } from '@/lib/metadata';

export interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDesc: string | null;
    heroPublicId: string | null;
    manufacturerName: string | null;
    sku: string | null;
  };
  locale: Locale;
}

export function ProductCard({ product, locale }: ProductCardProps) {
  return (
    <Card
      size="sm"
      className="group/product-card overflow-hidden"
      data-testid="product-card"
    >
      <Link
        href={`/products/${product.slug}`}
        locale={locale}
        className="block"
      >
        <div className="relative aspect-square w-full bg-surface ring-1 ring-inset ring-line">
          {product.heroPublicId ? (
            <CldImage
              src={product.heroPublicId}
              alt={product.name}
              width={400}
              height={400}
              loading="lazy"
              sizes="(max-width: 900px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="mk-ph mk-ph-corners absolute inset-0 flex items-center justify-center text-xs text-ink-3">
              {/* v1.1 placeholder: cross-hatched pattern + corner brackets (D-03) */}
              no image
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 pt-3">
          <div className="flex items-center gap-2 text-xs text-ink-3">
            {product.manufacturerName ? (
              <span className="mk-eyebrow">{product.manufacturerName}</span>
            ) : null}
            {product.sku ? (
              <span className="mk-mono tabular-nums">{product.sku}</span>
            ) : null}
          </div>
          <h3 className="font-medium text-ink line-clamp-2">
            {product.name}
          </h3>
          {product.shortDesc ? (
            <p className="text-xs text-ink-2 line-clamp-2">
              {product.shortDesc}
            </p>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}
