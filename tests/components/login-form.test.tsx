// Plan 02-08 Task 8.1 — LoginForm useActionState UX surface.
//
// Drives the discriminated `{ ok: true } | { ok: false; error }` return shape
// surfaced by React 19's `useActionState`. We mock the Server Action import so
// the test runs entirely in jsdom without booting Next.js / Auth.js — that's
// the only realistic way to exercise the form's three render states (idle,
// success, error) in isolation.
//
// States under test:
//   1. Idle — input + submit button render; no banners.
//   2. Success — after the action resolves `{ ok: true }`, the success banner
//      replaces the form. This is the anti-enumeration confirmation: identical
//      copy regardless of whether the email is a registered admin or not.
//   3. Error (invalid_email) — banner says "Please enter a valid email".
//   4. Error (unknown) — banner says "Something went wrong".
//
// Environment: jsdom (configured in vitest.config.ts via the `dom` project).
// React Testing Library 16+ pairs with React 19 (act-aware fireEvent).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LoginForm } from "@/app/[locale]/login/login-form";

// The action lives in a 'use server' file with a next-auth import chain that
// vitest cannot resolve (next-auth's `next/server` reference is absent outside
// a Next.js runtime). Mocking the module short-circuits the chain — the same
// posture established by tests/lib/require-admin.test.ts.
vi.mock("@/app/[locale]/login/actions", () => ({
  requestMagicLink: vi.fn(),
}));

import { requestMagicLink } from "@/app/[locale]/login/actions";

const labels = {
  email: "Your email",
  submit: "Send magic link",
  success: "Check your email — we've sent you a magic link.",
  invalidEmail: "Please enter a valid email address.",
  unknown: "Something went wrong. Please try again.",
  title: "Admin login",
  prompt: "Enter the email associated with your admin account.",
  accessDenied: "You do not have admin access.",
};

describe("LoginForm useActionState states", () => {
  it("renders email input + submit button in the idle state", () => {
    render(<LoginForm locale="uz" labels={labels} />);
    expect(screen.getByTestId("login-email")).toBeDefined();
    expect(screen.getByText("Send magic link")).toBeDefined();
    // No banners in idle state.
    expect(screen.queryByTestId("login-success")).toBeNull();
    expect(screen.queryByTestId("login-error")).toBeNull();
  });

  it("shows the success banner after the action resolves { ok: true }", async () => {
    vi.mocked(requestMagicLink).mockResolvedValueOnce({ ok: true });

    render(<LoginForm locale="uz" labels={labels} />);
    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "admin@manometr.uz" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(screen.getByTestId("login-success")).toBeDefined();
    });
    // Anti-enumeration: copy is identical regardless of whether the email is
    // a registered admin — the success banner just says "Check your email".
    expect(
      screen.getByText("Check your email — we've sent you a magic link."),
    ).toBeDefined();
  });

  it("shows the invalid_email banner when the action returns invalid_email", async () => {
    vi.mocked(requestMagicLink).mockResolvedValueOnce({
      ok: false,
      error: "invalid_email",
    });

    render(<LoginForm locale="uz" labels={labels} />);
    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeDefined();
    });
    expect(screen.getByText("Please enter a valid email address.")).toBeDefined();
  });

  it("shows the unknown-error banner for any other error code", async () => {
    vi.mocked(requestMagicLink).mockResolvedValueOnce({
      ok: false,
      error: "unknown",
    });

    render(<LoginForm locale="uz" labels={labels} />);
    fireEvent.change(screen.getByTestId("login-email"), {
      target: { value: "admin@manometr.uz" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error")).toBeDefined();
    });
    expect(screen.getByText("Something went wrong. Please try again.")).toBeDefined();
  });

  it("renders the access-denied banner when initialError='access_denied'", () => {
    render(
      <LoginForm
        locale="uz"
        labels={labels}
        initialError="access_denied"
      />,
    );
    expect(screen.getByTestId("login-access-denied")).toBeDefined();
    expect(screen.getByText("You do not have admin access.")).toBeDefined();
  });
});
