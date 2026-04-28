'use client';

// Plan 02-07 Task 7.3 — admins list client island.
//
// Two responsibilities:
//   1. Render the server-paginated admin_user slice via the generic
//      DataTable<TData> primitive from plan 02-06.
//   2. Provide an "Invite admin" Dialog that calls the inviteAdmin Server
//      Action from src/actions/admins.ts. The Server Action returns the
//      discriminated AdminActionResult shape (`{ ok:true, data } | { ok:false,
//      error }`), so we narrow on `.ok` and surface a toast / inline error.
//
// Closest analog: 02-PATTERNS.md §`src/app/[locale]/admin/products/page.tsx
// (NEW — RSC list with DataTable)` — the products-table sibling does the
// same RSC-feeds-data + client-island-renders-DataTable split.
//
// The DataTable primitive owns nuqs URL state for page/pageSize/q/sort. This
// island only owns ephemeral form state (open/close dialog, pending email
// input) — nothing that should survive a hard refresh, so plain useState is
// correct.

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { type ColumnDef } from '@tanstack/react-table';

import { DataTable } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { inviteAdmin } from '@/actions/admins';

// RSC-side row shape. Dates are serialised ISO strings at the server/client
// boundary (parent page maps Drizzle Date -> r.toISOString()) so this
// component never touches non-serialisable values.
export interface AdminRow {
  email: string;
  role: string;
  active: boolean;
  invitedBy: string | null;
  invitedAt: string | null;
  createdAt: string;
}

interface AdminsTableProps {
  data: AdminRow[];
  rowCount: number;
}

export function AdminsTable({ data, rowCount }: AdminsTableProps) {
  const columns = React.useMemo<ColumnDef<AdminRow, unknown>[]>(
    () => [
      {
        id: 'email',
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.email}</span>
        ),
      },
      {
        id: 'role',
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.role}</Badge>
        ),
      },
      {
        id: 'active',
        accessorKey: 'active',
        header: 'Status',
        cell: ({ row }) =>
          row.original.active ? (
            <Badge variant="default">Active</Badge>
          ) : (
            <Badge variant="secondary">Pending</Badge>
          ),
      },
      {
        id: 'invitedBy',
        accessorKey: 'invitedBy',
        header: 'Invited by',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.invitedBy ?? '—'}
          </span>
        ),
      },
      {
        id: 'invitedAt',
        accessorKey: 'invitedAt',
        header: 'Invited at',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.invitedAt
              ? new Date(row.original.invitedAt).toLocaleString()
              : '—'}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <DataTable<AdminRow>
      columns={columns}
      data={data}
      rowCount={rowCount}
      searchPlaceholder="Search admins by email…"
      toolbarSlot={<InviteAdminDialog />}
    />
  );
}

// ---------------------------------------------------------------------------
// InviteAdminDialog — small form bound to inviteAdmin Server Action.
//
// We don't use React 19's useActionState here because the action takes an
// unknown payload (Zod-parsed `{ email }`) rather than a FormData object,
// and the discriminated AdminActionResult is more ergonomic to handle via a
// straight-up await + transition than via the (state, formData) reducer.
// ---------------------------------------------------------------------------
function InviteAdminDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteAdmin({ email });
      if (result.ok) {
        // Reset + close + refresh the RSC slice so the new admin_user(active=
        // false) row shows up in the list immediately.
        setEmail('');
        setOpen(false);
        router.refresh();
      } else {
        setError(
          result.error === 'validation'
            ? 'Please enter a valid email address.'
            : result.error === 'unauthorized'
              ? 'Your session expired. Please sign in again.'
              : 'Could not send the invite. Please try again.',
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button">Invite admin</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new admin</DialogTitle>
          <DialogDescription>
            They&apos;ll receive a 48-hour single-use invite link by email.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new-admin@manometr.uz"
              disabled={pending}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" disabled={pending}>
                  Cancel
                </Button>
              }
            />
            <Button type="submit" disabled={pending || !email}>
              {pending ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
