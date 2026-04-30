// Plan 03-04 Task 4.2 — Product card RSC for the catalog grid (CAT-03 / D-02).
//
// Pure RSC — no client interactivity needed. Renders a Card with a 4:3
// CldImage thumb (lazy-loaded, NOT priority — only the page hero is
// `priority`), localized name + manufacturer chip + SKU + clamped 2-line
// short description.
//
// Image strategy per RESEARCH.md Pattern 6:
//   - width=400 / height=300 (4:3 aspect)
//   - sizes: "(max-width: 900px) 50vw, 33vw" (≈ 3-col grid above 900, 2-col below)
//   - loading="lazy" (listing thumbs are below the fold for most viewports)

import { CldImage } from 'next-cloudinary';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <div className="relative aspect-[4/3] w-full bg-slate-50">
          {product.heroPublicId ? (
            <CldImage
              src={product.heroPublicId}
              alt={product.name}
              width={400}
              height={300}
              loading="lazy"
              sizes="(max-width: 900px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              {/* Placeholder when product has no image */}
              ◯
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 pt-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {product.manufacturerName ? (
              <Badge
                variant="outline"
                className="h-5 px-1.5 text-[10px] uppercase tracking-wide"
              >
                {product.manufacturerName}
              </Badge>
            ) : null}
            {product.sku ? (
              <span className="tabular-nums">{product.sku}</span>
            ) : null}
          </div>
          <h3 className="font-medium text-slate-900 line-clamp-2">
            {product.name}
          </h3>
          {product.shortDesc ? (
            <p className="text-xs text-slate-600 line-clamp-2">
              {product.shortDesc}
            </p>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}
