"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {};

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="d-flex flex-column gap-3">
      <input type="hidden" name="next" value={next} />

      <div className="sb-form-group mb-0">
        <label htmlFor="password" className="sb-label">
          Shop password
        </label>
        <input
          type="password"
          name="password"
          id="password"
          className="sb-input"
          autoComplete="current-password"
          autoFocus
          required
        />
        <div className="sb-input-hint">
          This is the APP_PASSWORD value set on the server.
        </div>
      </div>

      {state.error && (
        <div className="sb-alert sb-alert-danger p-2 small" role="alert">
          <span>{state.error}</span>
        </div>
      )}

      <button type="submit" className="sb-btn sb-btn-primary w-100" disabled={pending}>
        {pending ? "Checking..." : "Open ReidBiz"}
      </button>
    </form>
  );
}
