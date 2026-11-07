import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { toggleUserStatus } from "@/app/actions/admin";

export const metadata = { title: "Confirm Merchant Account Change | ReidBiz Admin" };
export const dynamic = "force-dynamic";

export default async function ToggleUserStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getSessionUser();
  if (!(admin.isStaff || admin.isSuperuser)) redirect("/dashboard");

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id: Number(id), isStaff: false, isSuperuser: false },
  });
  if (!user) notFound();

  return (
    <div className="py-3" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="mb-3">
        <Link
          href="/admin-users"
          className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Merchant Accounts
        </Link>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h1 className="h5 mb-0">Confirm Status Change</h1>
          <span
            className={`sb-badge ${
              user.isActive ? "sb-badge-in-stock" : "sb-badge-out-of-stock"
            }`}
          >
            Current: {user.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div className="sb-card-body p-4">
          <div className="p-3 bg-light border rounded mb-4">
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted small">Merchant</span>
              <strong className="text-dark">{user.username}</strong>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted small">Email</span>
              <span className="text-dark">{user.email || "None"}</span>
            </div>
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted small">New Action</span>
              {user.isActive ? (
                <span className="text-danger fw-semibold">Deactivate Store Account</span>
              ) : (
                <span className="text-success fw-semibold">Reactivate Store Account</span>
              )}
            </div>
          </div>

          <p className="text-muted small mb-4">
            {user.isActive
              ? "Deactivating this merchant will prevent them from signing in or adding new sales until re-enabled."
              : "Reactivating this merchant will restore their full dashboard access."}
          </p>

          <form action={toggleUserStatus}>
            <input type="hidden" name="id" value={user.id} />
            <div className="d-flex flex-column gap-2">
              <button
                type="submit"
                className={`sb-btn ${user.isActive ? "sb-btn-danger" : "sb-btn-primary"} w-100`}
              >
                {user.isActive ? "Confirm Account Deactivation" : "Confirm Account Reactivation"}
              </button>
              <Link href="/admin-users" className="sb-btn sb-btn-secondary text-center">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
