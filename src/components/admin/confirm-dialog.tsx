"use client";

// Plan 02-11 Task 11.1 — ConfirmDialog primitive (D-06 / D-07).
//
// AlertDialog wrapper used by the spec-fields editor for:
//   - Rename (D-06): impact-preview body + "Type the new key to confirm"
//     gated input (Confirm disabled until typed === expected).
//   - Soft-delete / Hard-delete (D-07): destructive variant + impact-count
//     body. Hard-delete optionally uses the typed-confirm input.
//
// Reused later by:
//   - 02-13b product lifecycle actions (publish/unpublish/duplicate/delete)
//   - 02-16 audit-log viewer's bulk actions (if any)
//
// API contract:
//   - `trigger`         — the element that opens the dialog (rendered via
//                         AlertDialogTrigger asChild).
//   - `title` / `description` — header copy. `description` may be a node so
//                         callers can embed counts, links, code spans.
//   - `confirmInput?`   — when set, renders an Input below the description.
//                         The Confirm button is disabled until the user
//                         types the `expected` string verbatim.
//   - `onConfirm`       — async or sync callback fired when Confirm is
//                         clicked AND the typed-confirm gate (if any) passes.
//   - `destructive?`    — switches the Confirm button variant to destructive.
//
// data-testid attributes (`confirm-input`, `confirm-action`) are stable
// hooks for E2E tests.

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * When provided, renders an Input below the description. The Confirm
   * button stays disabled until the user types `expected` exactly. Used by
   * the rename (D-06) and hard-delete (D-07) flows.
   */
  confirmInput?: { expected: string; placeholder: string };
  onConfirm: () => Promise<void> | void;
  destructive?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmInput,
  onConfirm,
  destructive,
}: ConfirmDialogProps) {
  const [typed, setTyped] = React.useState("");
  const matches = !confirmInput || typed === confirmInput.expected;

  // Reset typed-confirm state when the dialog re-opens; otherwise a stale
  // match value persists across opens.
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  async function handleConfirm() {
    if (!matches) return;
    await onConfirm();
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmInput ? (
          <div className="grid gap-2">
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmInput.placeholder}
              data-testid="confirm-input"
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!matches}
            variant={destructive ? "destructive" : "default"}
            data-testid="confirm-action"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
