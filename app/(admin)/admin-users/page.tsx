import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm } from "@/lib/format";
import { AdminStatusFilter } from "@/components/admin-nav";

export const metadata = { title: "Merchant Accounts | ReidBiz Admin" };
export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getSessionUser();
  if (!(user.isStaff || user.isSuperuser)) redirect("/dashboard");

  const { status = "all" } = await searchParams;

  const owners = await prisma.user.findMany({
    where: {
      isStaff: false,
      isSuperuser: false,
      ...(status === "active"
        ? { isActive: true }
        : status === "inactive"
          ? { isActive: false }
          : {}),
    },
    orderBy: { dateJoined: "desc" },
    include: {
      _count: { select: { products: true, sales: true } },
    },
  });

  const salesByUser = await prisma.sale.groupBy({
    by: ["userId"],
    _sum: { totalPrice: true },
  });
  const totalByUser = new Map(
    salesByUser.map((group) => [group.userId, group._sum.totalPrice]),
  );

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Merchant Store Accounts</h1>
          <p className="text-muted small mb-0">
            Manage registered shop accounts and monitor individual store metrics.
          </p>
        </div>
        <div>
          <Link href="/admin-dashboard" className="sb-btn sb-btn-secondary sb-btn-sm">
            ← Back to Admin Console
          </Link>
        </div>
      </div>

      <div className="sb-card mb-4">
        <div className="sb-card-body p-3">
          <AdminStatusFilter status={status} count={owners.length} />
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Registered Store Owners</h2>
          <span className="badge bg-light text-dark border tabular">
            {owners.length} merchants
          </span>
        </div>

        <div className="sb-card-body p-0">
          {owners.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Merchant / Shop</th>
                    <th>Joined</th>
                    <th className="col-center">Products Listed</th>
                    <th className="col-center">Sales Logged</th>
                    <th className="col-right">Gross Sales</th>
                    <th className="col-center">Status</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id}>
                      <td>
                        <div className="fw-semibold text-dark">{owner.username}</div>
                        <span className="text-muted small">
                          {owner.email || "No email provided"}
                        </span>
                      </td>
                      <td className="text-muted small tabular">{formatDate(owner.dateJoined)}</td>
                      <td className="col-center tabular fw-semibold text-dark">
                        {owner._count.products || "0"}
                      </td>
                      <td className="col-center tabular fw-semibold text-dark">
                        {owner._count.sales || "0"}
                      </td>
                      <td className="col-right tabular fw-bold text-dark">
                        {rm(totalByUser.get(owner.id) ?? 0)}
                      </td>
                      <td className="col-center">
                        {owner.isActive ? (
                          <span className="sb-badge sb-badge-in-stock">Active</span>
                        ) : (
                          <span className="sb-badge sb-badge-out-of-stock">Deactivated</span>
                        )}
                      </td>
                      <td className="col-right">
                        <Link
                          href={`/admin-users/${owner.id}/toggle`}
                          className={`sb-btn sb-btn-sm ${
                            owner.isActive ? "sb-btn-outline-danger" : "sb-btn-secondary"
                          } py-1 px-2`}
                        >
                          {owner.isActive ? "Deactivate" : "Activate"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-center text-muted">
              <h3 className="h5 text-dark mb-1">No merchant accounts found</h3>
              <p className="small text-muted mb-0">
                No business owners match the selected filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
