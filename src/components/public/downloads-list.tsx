// Plan 03-05 Task 5.2b — Downloads list RSC (sketch 003 datasheet PDFs).
//
// Renders an unordered list of datasheet links, each pointing to the
// Cloudinary URL for the public_id (PDFs go through Cloudinary's
// `image/upload` resource type per the Phase-2 admin upload widget).
//
// Each item shows the prettified document name (last segment of the
// public_id, kebab→title-case) plus a localized download CTA.
//
// Cloudinary URL convention: https://res.cloudinary.com/<cloud>/image/upload/<public_id>
// The cloud name is the same `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` env that
// drives <CldImage> elsewhere on the page.

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

export interface DownloadsListProps {
  datasheetPublicIds: string[];
  /** Localized "Download" label from public.product.download. */
  downloadLabel: string;
}

function prettifyName(publicId: string): string {
  // Strip any folder prefixes and the file extension if Cloudinary returned one.
  const last = publicId.split('/').pop() ?? publicId;
  const noExt = last.replace(/\.[a-z0-9]{2,4}$/i, '');
  return noExt
    .split(/[-_]/)
    .map((part) => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ''))
    .join(' ');
}

export function DownloadsList({
  datasheetPublicIds,
  downloadLabel,
}: DownloadsListProps) {
  if (datasheetPublicIds.length === 0) return null;
  return (
    <ul className="space-y-2" data-testid="downloads-list">
      {datasheetPublicIds.map((pid) => {
        const url = `https://res.cloudinary.com/${CLOUD}/image/upload/${pid}`;
        return (
          <li key={pid} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate text-slate-700">
              {prettifyName(pid)}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-50"
            >
              {downloadLabel}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
