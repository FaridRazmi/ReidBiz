import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import { formatShopDateTimeFull } from "@/lib/time";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Profit Report | ReidBiz" };
export const dynamic = "force-dynamic";

export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getSessionUser();
  const { month = "" } = await searchParams;
  const now = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const year = match ? Number(match[1]) : now.getUTCFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 1));
  const monthValue = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthLabel = `${monthNames[monthIndex]} ${year}`;

  const select = {
    id: true,
    quantitySold: true,
    totalPrice: true,
    createdAt: true,
    product: { select: { name: true, buyingPrice: true } },
  } as const;

  const [monthSales, allSales] = await Promise.all([
    prisma.sale.findMany({
      where: { userId: user.id, createdAt: { gte: monthStart, lt: monthEnd } },
      select,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.findMany({
      where: { userId: user.id },
      select,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function costOf(sale: (typeof allSales)[number]) {
    return toNumber(sale.product?.buyingPrice) * sale.quantitySold;
  }

  const monthRevenue = monthSales.reduce((sum, s) => sum + toNumber(s.totalPrice), 0);
  const monthModal = monthSales.reduce((sum, s) => sum + costOf(s), 0);
  const monthProfit = monthRevenue - monthModal;
  const monthMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  const lifeRevenue = allSales.reduce((sum, s) => sum + toNumber(s.totalPrice), 0);
  const lifeModal = allSales.reduce((sum, s) => sum + costOf(s), 0);
  const lifeProfit = lifeRevenue - lifeModal;
  const lifeMargin = lifeRevenue > 0 ? (lifeProfit / lifeRevenue) * 100 : 0;

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Profit Report</h1>
          <p className="text-muted small mb-0">
            Untung = jualan − modal (kos barang dijual, ikut harga beli semasa).
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="no-print">
            <PrintButton />
          </div>
          <form method="GET" action="/reports/profit" className="d-flex align-items-center gap-2 no-print">
            <input
              type="month"
              name="month"
              defaultValue={monthValue}
              max={monthValue}
              className="sb-input tabular"
            />
            <button type="submit" className="sb-btn sb-btn-secondary sb-btn-sm">
              View
            </button>
          </form>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Monthly — {monthLabel}</h2>
              <span className="badge bg-light text-dark border tabular">
                {monthSales.length} sales
              </span>
            </div>
            <div className="sb-card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Jualan (Sales)</span>
                <span className="tabular fw-semibold text-dark">{rm(monthRevenue)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Modal (COGS)</span>
                <span className="tabular text-muted">−{rm(monthModal)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-top pt-2">
                <span className="fw-semibold text-dark">Untung</span>
                <span
                  className={`tabular fw-bold fs-4 ${monthProfit >= 0 ? "text-success" : "text-danger"}`}
                >
                  {rm(monthProfit)}
                </span>
              </div>
              <div className="text-muted small mt-1">
                Margin: {monthMargin.toFixed(1)}% daripada jualan
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Lifetime</h2>
              <span className="badge bg-light text-dark border tabular">
                {allSales.length} sales
              </span>
            </div>
            <div className="sb-card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Jualan (Sales)</span>
                <span className="tabular fw-semibold text-dark">{rm(lifeRevenue)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Modal (COGS)</span>
                <span className="tabular text-muted">−{rm(lifeModal)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center border-top pt-2">
                <span className="fw-semibold text-dark">Untung</span>
                <span
                  className={`tabular fw-bold fs-4 ${lifeProfit >= 0 ? "text-success" : "text-danger"}`}
                >
                  {rm(lifeProfit)}
                </span>
              </div>
              <div className="text-muted small mt-1">
                Margin: {lifeMargin.toFixed(1)}% daripada jualan
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Sales Breakdown — {monthLabel}</h2>
          <span className="text-muted small">Untung setiap transaksi</span>
        </div>
        <div className="sb-card-body p-0">
          {monthSales.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date &amp; Time</th>
                    <th>Item</th>
                    <th className="col-center">Qty</th>
                    <th className="col-right">Jualan</th>
                    <th className="col-right">Modal</th>
                    <th className="col-right">Untung</th>
                  </tr>
                </thead>
                <tbody>
                  {monthSales.map((sale) => {
                    const revenue = toNumber(sale.totalPrice);
                    const modal = costOf(sale);
                    const untung = revenue - modal;
                    return (
                      <tr key={sale.id}>
                        <td data-label="Receipt" className="tabular fw-bold text-dark">
                          #SL-{sale.id}
                        </td>
                        <td data-label="Date & Time" className="text-muted small tabular">
                          {formatShopDateTimeFull(sale.createdAt)}
                        </td>
                        <td data-label="Item" className="fw-semibold text-dark">
                          {sale.product?.name ?? "Unknown"}
                        </td>
                        <td data-label="Qty" className="col-center tabular">
                          {sale.quantitySold}
                        </td>
                        <td data-label="Jualan" className="col-right tabular">
                          {rm(revenue)}
                        </td>
                        <td data-label="Modal" className="col-right tabular text-muted">
                          {rm(modal)}
                        </td>
                        <td
                          data-label="Untung"
                          className={`col-right tabular fw-bold ${untung >= 0 ? "text-success" : "text-danger"}`}
                        >
                          {rm(untung)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-muted small">
              Tiada jualan bulan {monthLabel}.
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 no-print">
        <Link href="/reports/monthly" className="sb-btn sb-btn-secondary sb-btn-sm">
          ← Monthly Income Receipt
        </Link>
      </div>
    </>
  );
}
