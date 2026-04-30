// Plan 03-05 Task 5.2b — KeyFactsRibbon RSC (sketch 003 6-tile strip).
//
// 6-tile horizontal strip below the gallery: each tile shows label-above-value
// in a slate-50 rounded card. Sourced from the top-N spec rows of the first
// spec_field_group (typically the 6 most prominent specs). Pure RSC.

export interface KeyFact {
  label: string;
  value: string;
}

export interface KeyFactsRibbonProps {
  facts: KeyFact[];
}

export function KeyFactsRibbon({ facts }: KeyFactsRibbonProps) {
  if (facts.length === 0) return null;
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
      data-testid="key-facts-ribbon"
    >
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            {fact.label}
          </div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
            {fact.value}
          </div>
        </div>
      ))}
    </div>
  );
}
