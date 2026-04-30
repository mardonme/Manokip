// Plan 03-06 Task 6.2 — Cascade-fallback notice banner (SRCH-02 UI).
//
// Pure presentational RSC. Rendered above the search results grid when
// searchProducts returned a non-null fallbackLocale (D-05 cascade fired).
// Copy is composed by the parent page using next-intl ICU placeholders so
// uz/ru/en variants don't leak through this component.

export interface SearchFallbackBannerProps {
  fallbackLocale: string;
  currentLocale: string;
  message: string;
}

export function SearchFallbackBanner({ message }: SearchFallbackBannerProps) {
  return (
    <div
      role="status"
      data-testid="search-fallback-banner"
      className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900"
    >
      {message}
    </div>
  );
}
