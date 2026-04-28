"use client";

// Plan 02-11 Task 11.4 — spec-field-groups list client island.
//
// Renders one card per category with the groups laid out in sort_order.
// Each row offers Edit + Soft-delete (ConfirmDialog destructive variant).
// Reorder is exposed via inline number inputs that flush via the
// reorderGroups Server Action on blur (the plan's <action> mentions
// dnd-kit, deferred to Phase 5 polish).

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  reorderGroups,
  deleteSpecFieldGroup,
} from "@/actions/spec-field-groups";

export interface GroupRow {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  categoryId: string;
  categoryName: string;
}

interface Props {
  locale: string;
  data: GroupRow[];
}

export function GroupsList({ locale, data }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  // Bucket by category for the per-category cards.
  const byCategory = React.useMemo(() => {
    const map = new Map<string, { name: string; groups: GroupRow[] }>();
    for (const g of data) {
      const bucket = map.get(g.categoryId) ?? {
        name: g.categoryName,
        groups: [],
      };
      bucket.groups.push(g);
      map.set(g.categoryId, bucket);
    }
    return Array.from(map.entries());
  }, [data]);

  const handleDelete = React.useCallback(
    (id: string) => {
      setPendingId(id);
      startTransition(async () => {
        const result = await deleteSpecFieldGroup({ id });
        setPendingId(null);
        if (result.ok) router.refresh();
        else
          window.alert(
            result.error === "unauthorized"
              ? "Your session expired. Please sign in again."
              : "Could not soft-delete this group.",
          );
      });
    },
    [router],
  );

  const handleSortChange = React.useCallback(
    (categoryId: string, groups: GroupRow[]) => {
      const ordering = groups.map((g) => ({
        id: g.id,
        sortOrder: g.sortOrder,
      }));
      startTransition(async () => {
        const result = await reorderGroups({ categoryId, ordering });
        if (result.ok) router.refresh();
      });
    },
    [router],
  );

  if (byCategory.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No groups yet. Create one to start grouping spec fields by section.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {byCategory.map(([categoryId, { name, groups }]) => (
        <div key={categoryId} className="rounded-md border p-4 space-y-2">
          <h2 className="font-semibold">{name}</h2>
          <div className="grid gap-2">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 border rounded-md p-2"
              >
                <Input
                  type="number"
                  className="w-16"
                  defaultValue={g.sortOrder}
                  onBlur={(e) => {
                    const next = Number(e.target.value);
                    if (next === g.sortOrder) return;
                    const updated = groups.map((x) =>
                      x.id === g.id ? { ...x, sortOrder: next } : x,
                    );
                    handleSortChange(categoryId, updated);
                  }}
                  data-testid={`sort-input-${g.id}`}
                />
                <span className="font-medium flex-1">{g.label}</span>
                <code className="text-xs text-muted-foreground">{g.key}</code>
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={`/${locale}/admin/spec-fields/groups/${g.id}/edit`}
                    >
                      Edit
                    </Link>
                  }
                />
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pendingId === g.id}
                    >
                      Delete
                    </Button>
                  }
                  title={`Delete group "${g.label}"?`}
                  description={
                    <>
                      The group is soft-deleted. Spec fields with this group
                      keep their <code className="font-mono">group_id</code>;
                      they render as ungrouped on the public detail page.
                    </>
                  }
                  confirmLabel="Soft-delete"
                  destructive
                  onConfirm={() => handleDelete(g.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
