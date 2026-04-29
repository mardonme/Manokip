"use client";

// Plan 02-13b Task 13b.3 — MachineTranslatedToggle (D-05).
//
// Per-(productId, locale, fieldName) MT flag toggle. Stored on the form as
// `mtFlags.${locale}.${fieldName}` boolean; persisted by saveProduct as a
// row in product_translation_field_flags (replace-on-save inside the tx).
//
// UI guideline (D-05): every translatable field renders the toggle inline
// alongside the field. When `mtFlags.${locale}.${fieldName}` is true the
// caller should also paint a left-border + 'MT' badge — this component is
// the toggle ONLY (the visual cue is applied by the field wrapper that
// reads the same RHF path via useWatch).
//
// Reused later by recipes (Phase 2 plan 02-17) and industries (02-18) which
// both consume the same product_translation_field_flags-shaped sibling.

import { useFormContext, Controller } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import type { Locale } from "@/components/admin/locale-tabs";

export interface MachineTranslatedToggleProps {
  /** RHF field name (e.g. 'name', 'shortDesc', 'longDesc'). */
  fieldName: string;
  locale: Locale;
}

export function MachineTranslatedToggle({
  fieldName,
  locale,
}: MachineTranslatedToggleProps) {
  const { control } = useFormContext();
  const path = `mtFlags.${locale}.${fieldName}` as const;
  return (
    <Controller
      name={path}
      control={control}
      render={({ field }) => (
        <label
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-testid={`mt-toggle-${locale}-${fieldName}`}
        >
          <Checkbox
            checked={!!field.value}
            onCheckedChange={(v) => field.onChange(!!v)}
          />
          MT
        </label>
      )}
    />
  );
}
