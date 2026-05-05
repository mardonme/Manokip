'use client';

// Phase 5 plan 05-03 task 3.2 — product-detail variant of ContactButton.
//
// Small client island composed inside the existing sticky-cta-rail RSC. Wraps
// ContactButton with productContext pre-filled to "<name> (<sku>)" so the modal
// shows the inline "Inquiry about: …" prefill (CTA-03 / D-03).
//
// Visual contract preserves the original blue-700 anchor pill exactly so the
// sticky rail layout doesn't shift after the swap; the wrapping div carries
// the legacy data-testid="cta-request-price" so any e2e specs on Phase 3 stay
// addressable.

import { ContactButton } from './contact-button';

export interface StickyCtaContactButtonProps {
  locale: 'uz' | 'ru' | 'en';
  productName: string;
  productSku: string | null;
}

export function StickyCtaContactButton({
  locale,
  productName,
  productSku,
}: StickyCtaContactButtonProps) {
  const productContext = productSku
    ? `${productName} (${productSku})`
    : productName;

  return (
    <div data-testid="cta-request-price">
      <ContactButton
        locale={locale}
        productContext={productContext}
        variant="default"
        size="default"
        className="block w-full rounded-md bg-blue-700 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800"
      />
    </div>
  );
}
