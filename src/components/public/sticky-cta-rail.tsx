// Plan 03-05 Task 5.2b — Sticky CTA rail RSC (sketch 003 380px right-rail).
//
// Visual contract from sketch 003:
//   - 380px wide right-rail.
//   - Eyebrow text + headline + 4 trust bullets + 3 stacked CTA buttons.
//   - Phone/email block + trust strip + downloads list slot + dark help-card.
//   - Below 1100px viewport (approx Tailwind `lg:` 1024px) the rail collapses
//     and renders below the main content as a stacked card per D-01.
//
// Phase 5 plan 05-03: replaced the placeholder `#contact` anchor with the
// live <StickyCtaContactButton /> client island that opens the same shadcn
// Dialog used in the SiteHeader (CTA-01 / CTA-03). The remaining tel: and
// mailto: anchors stay static — they don't need the modal.
//
// The rail now accepts `locale` so the embedded client island can pass it
// through to ContactButton -> ContactForm. `labels.requestPrice` is no longer
// rendered (ContactButton sources its own label from public.contact.cta) but
// the prop is preserved on the Labels interface to avoid breaking page
// callers; consumers may stop passing it without a TS break next phase.

import type { ReactNode } from 'react';
import type { Locale } from '@/lib/metadata';
import { StickyCtaContactButton } from './sticky-cta-contact-button';

export interface StickyCtaRailLabels {
  /** Retained for back-compat — the live ContactButton supplies its own copy from `public.contact.cta`. */
  requestPrice: string;
  downloads: string;
}

export interface StickyCtaRailProps {
  productName: string;
  sku: string | null;
  locale: Locale;
  labels: StickyCtaRailLabels;
  /** DownloadsList is composed in by the page so this component stays presentational. */
  children?: ReactNode;
}

export function StickyCtaRail({
  productName,
  sku,
  locale,
  labels,
  children,
}: StickyCtaRailProps) {
  return (
    <aside
      className="lg:sticky lg:top-20 w-full lg:w-[380px] space-y-4"
      data-testid="sticky-cta-rail"
    >
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-wide text-blue-700">
          Manometr
        </div>
        <h2 className="mt-1 text-lg font-semibold leading-tight text-slate-900">
          {productName}
        </h2>
        {sku ? (
          <p className="mt-0.5 text-xs tabular-nums text-slate-500">SKU: {sku}</p>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
            <span>Texnik mutaxassis bilan maslahat / Технические консультации</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
            <span>Sertifikatlangan yetkazib berish / Сертифицированная поставка</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
            <span>Texnik hujjatlar / Техническая документация</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-emerald-600" />
            <span>O&apos;rnatish va xizmat / Установка и обслуживание</span>
          </li>
        </ul>
        <div className="mt-4 space-y-2">
          {/* Phase-5 plan 05-03: live contact-form modal trigger replacing the
              placeholder `#contact` anchor. Same Dialog/ContactForm SSOT used
              by SiteHeader; productContext pre-filled to "<name> (<sku>)". */}
          <StickyCtaContactButton
            locale={locale}
            productName={productName}
            productSku={sku}
          />
          <a
            href="tel:+998000000000"
            className="block w-full rounded-md border border-slate-200 bg-white py-2.5 text-center text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            +998 (00) 000-00-00
          </a>
          <a
            href="mailto:info@manometr.uz"
            className="block w-full rounded-md border border-slate-200 bg-white py-2.5 text-center text-sm font-medium text-slate-900 transition-colors hover:bg-slate-50"
          >
            info@manometr.uz
          </a>
        </div>
      </div>

      {children ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {labels.downloads}
          </div>
          <div className="mt-3">{children}</div>
        </div>
      ) : null}

      <div className="rounded-xl bg-slate-900 p-5 text-slate-100">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Texnik mutaxassis
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">
          Spetsifikatsiya bo&apos;yicha savollarmi? / Вопросы по спецификации?
          Бизга murojaat qiling — javobni 1 ish kunida olasiz.
        </p>
      </div>
    </aside>
  );
}
