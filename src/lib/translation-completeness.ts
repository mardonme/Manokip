// D-04 / ADMIN-10: server-side helpers wrapping the
// `product_translation_completeness` pgView (created by plan 02-01).
//
// RED stub — the GREEN commit wires the actual db.select against the pgView.
// Returning all-zeros makes the integration test in
// tests/db/translation-completeness-view.test.ts fail on the 25/50/100
// assertions, which is the gate we want for TDD RED.
export type LocaleKey = 'uz' | 'ru' | 'en';
export type CompletenessByLocale = Record<LocaleKey, number>;

function emptyCompleteness(): CompletenessByLocale {
  return { uz: 0, ru: 0, en: 0 };
}

export async function findProductCompleteness(
  _productId: string,
): Promise<CompletenessByLocale> {
  return emptyCompleteness();
}

export async function findCompletenessForProducts(
  productIds: string[],
): Promise<Record<string, CompletenessByLocale>> {
  const out: Record<string, CompletenessByLocale> = {};
  for (const id of productIds) out[id] = emptyCompleteness();
  return out;
}
