// Plan 04-09 Task 9.1 — Recipe card RSC for the index grid + Used-In section reuse.
//
// Pure RSC — no client interactivity. Mirrors the Phase 3 ProductCard shape:
// Card primitive + 16:9 CldImage + h3 + 2-line excerpt clamp. This component
// is reused by:
//   - /[locale]/recipes index page (grid view) — Plan 04-09 Task 9.2
//   - The "Used in" section on product detail — Plan 04-11
//
// Image strategy:
//   - 16:9 aspect (recipe heroes are landscape-cropped, vs 4:3 for products)
//   - width=480 / height=270 base size
//   - sizes="(max-width: 900px) 50vw, 33vw" — same 3-col / 2-col grid as products
//   - loading="lazy" (cards are below the fold for the index view)
//
// Routing: uses Link from @/i18n/navigation so the locale prefix is applied
// without us hand-building `/{locale}/recipes/<slug>` URLs.

import { CldImage } from 'next-cloudinary';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import type { Locale } from '@/lib/metadata';

export interface RecipeCardProps {
  recipe: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImagePublicId: string | null;
  };
  locale: Locale;
}

export function RecipeCard({ recipe, locale }: RecipeCardProps) {
  return (
    <Card
      size="sm"
      className="group/recipe-card overflow-hidden"
      data-testid="recipe-card"
    >
      <Link
        href={`/recipes/${recipe.slug}`}
        locale={locale}
        className="block"
      >
        <div className="relative aspect-[16/9] w-full bg-slate-50">
          {recipe.featuredImagePublicId ? (
            <CldImage
              src={recipe.featuredImagePublicId}
              alt={recipe.title}
              width={480}
              height={270}
              loading="lazy"
              sizes="(max-width: 900px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              ◯
            </div>
          )}
        </div>
        <CardContent className="space-y-1.5 pt-3">
          <h3 className="font-medium text-slate-900 line-clamp-2">
            {recipe.title}
          </h3>
          {recipe.excerpt ? (
            <p className="text-xs text-slate-600 line-clamp-2">
              {recipe.excerpt}
            </p>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}
