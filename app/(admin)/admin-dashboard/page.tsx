import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";

export const metadata = { title: "Platform Control Dashboard | ReidBiz Admin" };
export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!(user.isStaff || user.isSuperuser)) redirect("/dashboard");

  const owners = await prisma.user.findMany({
    where: { isStaff: false, isSuperuser: false },
    orderBy: { dateJoined: "desc" },
  });

  const totalUsers = owners.length;
  const activeUsers = owners.filter((owner) => owner.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;

  const totalProducts = await prisma.product.count();
  const totalSalesCount = await prisma.sale.count();
  const revenueAgg = await prisma.sale.aggregate({ _sum: { totalPrice: true } });
  const totalRevenue = toNumber(revenueAgg._sum.totalPrice);

  const recentMerchants = owners.slice(0, 6);

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Platform Admin Console</h1>
          <p className="text-muted small mb-0">
            Platform-wide merchant activity, catalog volume, and sales metrics.
          </p>
        </div>
        <div>
          <Link href="/admin-users" className="sb-btn sb-btn-primary sb-btn-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Manage Merchants
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Registered Merchants</span>
            <div className="sb-stat-value tabular fs-4 text-dark">{totalUsers}</div>
            <span className="sb-stat-meta positive">{activeUsers} active shops</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Platform Sales Intake</span>
            <div className="sb-stat-value tabular text-success fs-4">{rm(totalRevenue)}</div>
            <span className="sb-stat-meta positive">Gross platform volume</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Recorded Transactions</span>
            <div className="sb-stat-value tabular fs-4 text-dark">{totalSalesCount}</div>
            <span className="sb-stat-meta">Completed orders</span>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Listed Inventory Items</span>
            <div className="sb-stat-value tabular fs-4 text-dark">{totalProducts}</div>
            <span className="sb-stat-meta">Across all merchants</span>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Merchant Account Health</h2>
            </div>
            <div className="sb-card-body">
              <div className="row g-3 text-center mb-4">
                <div className="col-6">
                  <div className="p-3 border rounded bg-light">
                    <span className="text-muted small d-block mb-1">Active Accounts</span>
                    <span className="fs-3 fw-bold text-success tabular">{activeUsers}</span>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 border rounded bg-light">
                    <span className="text-muted small d-block mb-1">Deactivated</span>
                    <span className="fs-3 fw-bold text-danger tabular">{inactiveUsers}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 border rounded mb-3 small text-muted">
                <strong className="text-dark d-block mb-1">Operational Notice</strong>
                Subscription enforcement is deactivated platform-wide. All merchant accounts have
                unrestricted access to inventory and sales ledger capabilities.
              </div>

              <Link href="/admin-users" className="sb-btn sb-btn-secondary w-100 text-center">
                Review Merchant Accounts Table →
              </Link>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Recently Registered Merchants</h2>
              <Link href="/admin-users" className="text-decoration-none small text-dark fw-semibold">
                View All
              </Link>
            </div>
            <div className="sb-card-body p-0">
              {recentMerchants.length > 0 ? (
                <div className="sb-table-responsive">
                  <table className="sb-table">
                    <thead>
                      <tr>
                        <th>Shop / Username</th>
                        <th>Date Joined</th>
                        <th className="col-center">Status</th>
                        <th className="col-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentMerchants.map((merchant) => (
                        <tr key={merchant.id}>
                          <td>
                            <div className="fw-semibold text-dark">{merchant.username}</div>
                            <span className="text-muted small">
                              {merchant.email || "No email registered"}
                            </span>
                          </td>
                          <td className="text-muted small tabular">
                            {formatDate(merchant.dateJoined)}
                          </td>
                          <td className="col-center">
                            {merchant.isActive ? (
                              <span className="sb-badge sb-badge-in-stock">Active</span>
                            ) : (
                              <span className="sb-badge sb-badge-out-of-stock">Deactivated</span>
                            )}
                          </td>
                          <td className="col-right">
                            <Link
                              href="/admin-users"
                              className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2"
                            >
                              Manage
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted small">
                  No registered merchants found yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
