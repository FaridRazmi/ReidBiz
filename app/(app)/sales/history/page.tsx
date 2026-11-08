import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import { formatShopDateTimeFull } from "@/lib/time";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Sales Ledger & History | ReidBiz" };
export const dynamic = "force-dynamic";

export default async function SalesHistoryPage() {
  const user = await getSessionUser();

  const sales = await prisma.sale.findMany({
    where: { userId: user.id },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalSalesValue = sales.reduce((sum, sale) => sum + toNumber(sale.totalPrice), 0);
  const totalUnitsSold = sales.reduce((sum, sale) => sum + sale.quantitySold, 0);
  const transactionCount = sales.length;

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Sales Transaction Ledger</h1>
          <p className="text-muted small mb-0">
            Complete historical record of customer transactions and cash collected.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="d-none d-sm-block no-print">
            <PrintButton />
          </div>
          <Link href="/products" className="sb-btn sb-btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>New Sale</span>
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Total Revenue Collected</span>
            <div className="sb-stat-value tabular text-success fs-4">{rm(totalSalesValue)}</div>
            <span className="sb-stat-meta positive">Gross intake</span>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Total Inventory Units Sold</span>
            <div className="sb-stat-value tabular fs-4">{totalUnitsSold} Units</div>
            <span className="sb-stat-meta">Items processed</span>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Total Transactions</span>
            <div className="sb-stat-value tabular fs-4">{transactionCount} Sales</div>
            <span className="sb-stat-meta">Completed orders</span>
          </div>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Completed Transactions Log</h2>
          <span className="badge bg-light text-dark border tabular">{sales.length} records</span>
        </div>

        <div className="sb-card-body p-0">
          {sales.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>Date &amp; Time</th>
                    <th>Product Item</th>
                    <th className="col-right">Unit Price</th>
                    <th className="col-center">Quantity</th>
                    <th className="col-right">Total Amount</th>
                    <th className="col-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => {
                    const unitPrice =
                      sale.quantitySold > 0
                        ? toNumber(sale.totalPrice) / sale.quantitySold
                        : toNumber(sale.totalPrice);
                    return (
                      <tr key={sale.id}>
                        <td data-label="Receipt #" className="tabular fw-bold text-dark">#SL-{sale.id}</td>
                        <td data-label="Date & Time" className="text-muted tabular small">
                          {formatShopDateTimeFull(sale.createdAt)}
                        </td>
                        <td data-label="Product Item">
                          <span className="fw-semibold text-dark">{sale.product.name}</span>
                        </td>
                        <td data-label="Unit Price" className="col-right tabular text-muted">
                          {rm(unitPrice, { decimals: 2 })}
                        </td>
                        <td data-label="Quantity" className="col-center tabular fw-semibold text-dark">
                          {sale.quantitySold}
                        </td>
                        <td data-label="Total Amount" className="col-right tabular fw-bold text-dark fs-6">
                          {rm(sale.totalPrice)}
                        </td>
                        <td data-label="Status" className="col-center">
                          <span className="sb-badge sb-badge-in-stock">Paid</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5 text-center text-muted">
              <div className="mb-3">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                  <path d="M12 20v-6M6 20V10M18 20V4" />
                </svg>
              </div>
              <h3 className="h5 text-dark mb-1">No sales records found</h3>
              <p className="small text-muted mb-3">
                You haven&apos;t recorded any customer transactions yet.
              </p>
              <Link href="/products" className="sb-btn sb-btn-primary sb-btn-sm">
                Go to Inventory &amp; Record Sale
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
