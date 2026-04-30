// Plan 03-05 Task 5.2b — Manufacturer card RSC (D-10 + D-11 Verified pill).
//
// Renders the manufacturer card inside the product detail main column:
//   - Cloudinary logo (CldImage, lazy) when logoPublicId is present
//   - Manufacturer name as a Link to /[locale]/manufacturers/<slug> (Plan 07
//     ships the landing page; the link target exists from Wave 2 routing)
//   - "Authorized representative" Badge when isOfficialRep === true (D-11)
//   - relationshipNote (per-locale) rendered as small italic paragraph below
//     the badge — only when populated for the current locale

import { CldImage } from 'next-cloudinary';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import type { Locale } from '@/lib/metadata';
import type { ProductDetailManufacturer } from '@/lib/product-detail';

export interface ManufacturerCardProps {
  manufacturer: ProductDetailManufacturer;
  locale: Locale;
  /** Localized "Authorized representative" / "Verified" label from public.product namespace. */
  officialRepLabel: string;
}

export function ManufacturerCard({
  manufacturer,
  locale,
  officialRepLabel,
}: ManufacturerCardProps) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5"
      data-testid="manufacturer-card"
    >
      <div className="flex items-start gap-4">
        {manufacturer.logoPublicId ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-50">
            <CldImage
              src={manufacturer.logoPublicId}
              alt={manufacturer.name}
              width={48}
              height={48}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400">
            {manufacturer.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <Link
            href={`/manufacturers/${manufacturer.slug}`}
            locale={locale}
            className="text-base font-semibold text-slate-900 hover:text-blue-700"
          >
            {manufacturer.name}
          </Link>
          {manufacturer.isOfficialRep ? (
            <div className="mt-1.5">
              <Badge
                variant="default"
                className="bg-emerald-600 text-white hover:bg-emerald-700"
                data-testid="manufacturer-verified-badge"
              >
                {officialRepLabel}
              </Badge>
            </div>
          ) : null}
          {manufacturer.relationshipNote ? (
            <p className="mt-2 text-xs italic text-slate-600">
              {manufacturer.relationshipNote}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
