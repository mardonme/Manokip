// Plan 04-10 Task 10.1 — Industry card RSC for the index grid + Used-In section reuse.
//
// Pure RSC mirror of src/components/public/recipe-card.tsx (Plan 04-09 Task 9.1).
// Same shape: Card primitive + 16:9 CldImage + h3 + 2-line excerpt clamp.
// Reused by:
//   - /[locale]/industries index page (grid view) — Plan 04-10 Task 10.2
//   - The "Used in" section on product detail — Plan 04-11
//
// The duplication vs RecipeCard is intentional (per plan 04-10 objective):
// each card type evolves independently if entity-specific affordances are
// added in v1.1 (e.g. industries might show a "vertical" facet tag,
// recipes might show a "difficulty" tag).
//
// Image strategy: identical to RecipeCard — 16:9 aspect, w=480/h=270,
// sizes="(max-width: 900px) 50vw, 33vw", loading=lazy.
// Routing: uses Link from @/i18n/navigation so the locale prefix is applied
// without us hand-building `/{locale}/industries/<slug>` URLs.

import { CldImage } from 'next-cloudinary';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import type { Locale } from '@/lib/metadata';

export interface IndustryCardProps {
  industry: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImagePublicId: string | null;
  };
  locale: Locale;
}

export function IndustryCard({ industry, locale }: IndustryCardProps) {
  return (
    <Card
      size="sm"
      className="group/industry-card overflow-hidden"
      data-testid="industry-card"
    >
      <Link
        href={`/industries/${industry.slug}`}
        locale={locale}
        className="block"
      >
        <div className="relative aspect-[16/9] w-full bg-slate-50">
          {industry.featuredImagePublicId ? (
            <CldImage
              src={industry.featuredImagePublicId}
              alt={industry.title}
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
            {industry.title}
          </h3>
          {industry.excerpt ? (
            <p className="text-xs text-slate-600 line-clamp-2">
              {industry.excerpt}
            </p>
          ) : null}
        </CardContent>
      </Link>
    </Card>
  );
}
