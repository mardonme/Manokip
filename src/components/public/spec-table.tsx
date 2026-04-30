// Plan 03-05 Task 5.2a — Spec table RSC for the product detail page (CAT-06).
//
// Visual contract from sketch 003:
//   - Each spec_field_group renders as a section: H3 group label + a table.
//   - Table is 44%/56% column split (key column / value column) per the
//     fiztech-density information layout.
//   - Bottom borders are dashed (border-dashed border-slate-200), row hover
//     bg slate-50.
//   - The value column uses Tailwind's `tabular-nums` so numeric values align
//     consistently across rows (the engineer-buyer reading experience).
//
// Pure RSC — no client interactivity. Receives the resolved
// ProductDetailData['specGroups'] from the lib helper (Task 5.1).

import type { ProductDetailData } from '@/lib/product-detail';

export interface SpecTableProps {
  groups: ProductDetailData['specGroups'];
}

export function SpecTable({ groups }: SpecTableProps) {
  if (groups.length === 0) return null;
  return (
    <div className="space-y-8" data-testid="spec-table">
      {groups.map((group) => (
        <section key={group.id}>
          <h3 className="mb-3 text-base font-semibold tracking-tight text-slate-900">
            {group.label}
          </h3>
          <table className="w-full text-sm">
            {/* 44%/56% column split per sketch 003 spec table */}
            <colgroup>
              <col style={{ width: '44%' }} />
              <col style={{ width: '56%' }} />
            </colgroup>
            <tbody>
              {group.rows.map((row) => (
                <tr
                  key={row.fieldKey}
                  className="border-b border-dashed border-slate-200 transition-colors hover:bg-slate-50"
                >
                  <td className="py-2 pr-4 align-top text-slate-600">
                    {row.fieldLabel}
                  </td>
                  <td className="py-2 align-top font-medium tabular-nums text-slate-900">
                    {row.displayValue}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
