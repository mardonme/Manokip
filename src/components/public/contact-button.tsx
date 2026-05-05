'use client';

// Phase 5 plan 05-03 task 3.2 — ContactButton (modal trigger) for SiteHeader.
//
// Single-source modal mounted right of LocaleSwitcher in SiteHeader (D-01).
// Reused by StickyCtaContactButton on product detail pages (with productContext
// pre-filled). The Dialog body is the SAME ContactForm SSOT used on the
// canonical /[locale]/contact page (mode="page"); here mode="modal" so on
// success the form fires onSuccess and the parent closes the dialog.

import * as React from 'react';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ContactForm } from './contact-form';

export interface ContactButtonProps {
  locale: 'uz' | 'ru' | 'en';
  /** Pre-resolved 'Name (SKU)' string when launched from a product CTA. */
  productContext?: string;
  className?: string;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm';
}

export function ContactButton({
  locale,
  productContext,
  className,
  variant = 'default',
  size = 'sm',
}: ContactButtonProps) {
  const t = useTranslations('public.contact');
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={variant}
            size={size}
            className={className}
            data-testid="contact-button"
          >
            {t('cta')}
          </Button>
        }
      />
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('pageTitle')}</DialogTitle>
        </DialogHeader>
        <ContactForm
          locale={locale}
          mode="modal"
          productContext={productContext}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
