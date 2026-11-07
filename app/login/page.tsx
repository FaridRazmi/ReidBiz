import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { authEnabled } from "@/lib/session";
import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Sign in | ReidBiz" };
export const dynamic = "force-dynamic";

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "/dashboard" } = await searchParams;
  if (await isAuthenticated()) redirect(safeNext(next));

  return (
    <main className="d-flex align-items-center justify-content-center p-3" style={{ minHeight: "100dvh" }}>
      <div className="sb-card w-100" style={{ maxWidth: 420 }}>
        <div className="sb-card-header">
          <div className="d-flex align-items-center gap-2">
            <img src="/icons/icon-192.png" alt="" width={32} height={32} className="sb-brand-mark sb-brand-logo" />
            <div>
              <h1 className="h6 mb-0">ReidBiz</h1>
              <span className="text-muted small">Shop ledger and rentals</span>
            </div>
          </div>
        </div>
        <div className="sb-card-body p-4">
          {authEnabled() ? (
            <LoginForm next={safeNext(next)} />
          ) : (
            <p className="small text-muted mb-0">
              Login is not configured. Set <code>APP_PASSWORD</code> in the deployment
              environment, then reload this page.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
