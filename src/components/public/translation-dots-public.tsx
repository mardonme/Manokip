// Plan 03-03 Task 3.2 — public-namespace re-export of TranslationDots.
//
// Same component as the admin product list uses — Phase-3 listing pages
// surface translation completeness in the sidebar / product card meta.
// Re-export exists so public components can import from
// `@/components/public/translation-dots-public` without reaching into the
// admin namespace, preserving the public/admin module boundary established
// in Phase 2.

export { TranslationDots } from '@/components/admin/translation-completeness';
export type { TranslationDotsProps } from '@/components/admin/translation-completeness';
