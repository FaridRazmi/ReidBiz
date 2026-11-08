import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import { formatShopDateTimeFull } from "@/lib/time";
import { DURATION_LABELS, isDurationType } from "@/lib/rental";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Profit Report | ReidBiz" };
export const dynamic = "force-dynamic";

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function durationLabel(type: string) {
  return isDurationType(type) ? DURATION_LABELS[type] : type;
}

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
  const monthLabel = `${monthNames[monthIndex]} ${year}`;

  const saleSelect = {
    id: true,
    quantitySold: true,
    totalPrice: true,
    createdAt: true,
    product: { select: { name: true, buyingPrice: true } },
  } as const;

  const rentalSelect = {
    id: true,
    customerName: true,
    durationType: true,
    price: true,
    createdAt: true,
    status: true,
    product: { select: { name: true, buyingPrice: true } },
  } as const;

  const [monthSales, allSales, monthRentals, allRentals] = await Promise.all([
    prisma.sale.findMany({
      where: { userId: user.id, createdAt: { gte: monthStart, lt: monthEnd } },
      select: saleSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.findMany({
      where: { userId: user.id },
      select: saleSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rental.findMany({
      where: {
        userId: user.id,
        status: { not: "cancelled" },
        createdAt: { gte: monthStart, lt: monthEnd },
      },
      select: rentalSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.rental.findMany({
      where: { userId: user.id, status: { not: "cancelled" } },
      select: rentalSelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  function saleCost(sale: (typeof allSales)[number]) {
    return toNumber(sale.product?.buyingPrice) * sale.quantitySold;
  }

  // Modal untuk rental = harga beli (wholesale cost) akaun yang disewa.
  // Setiap akaun ialah satu produk, jadi kos penuh dikenakan sekali sewa.
  function rentalCost(rental: (typeof allRentals)[number]) {
    return toNumber(rental.product?.buyingPrice);
  }

  const monthSalesRevenue = monthSales.reduce((sum, s) => sum + toNumber(s.totalPrice), 0);
  const monthRentalRevenue = monthRentals.reduce((sum, r) => sum + toNumber(r.price), 0);
  const monthModal =
    monthSales.reduce((sum, s) => sum + saleCost(s), 0) +
    monthRentals.reduce((sum, r) => sum + rentalCost(r), 0);
  const monthRevenue = monthSalesRevenue + monthRentalRevenue;
  const monthProfit = monthRevenue - monthModal;
  const monthMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  const lifeSalesRevenue = allSales.reduce((sum, s) => sum + toNumber(s.totalPrice), 0);
  const lifeRentalRevenue = allRentals.reduce((sum, r) => sum + toNumber(r.price), 0);
  const lifeModal =
    allSales.reduce((sum, s) => sum + saleCost(s), 0) +
    allRentals.reduce((sum, r) => sum + rentalCost(r), 0);
  const lifeRevenue = lifeSalesRevenue + lifeRentalRevenue;
  const lifeProfit = lifeRevenue - lifeModal;
  const lifeMargin = lifeRevenue > 0 ? (lifeProfit / lifeRevenue) * 100 : 0;

  type Row = {
    key: string;
    receipt: string;
    date: Date;
    item: string;
    customer: string;
    qtyLabel: string;
    revenue: number;
    modal: number;
    kind: "sale" | "rental";
  };

  const monthRows: Row[] = [
    ...monthSales.map<Row>((s) => ({
      key: `s-${s.id}`,
      receipt: `#SL-${s.id}`,
      date: s.createdAt,
      item: s.product?.name ?? "Unknown",
      customer: "—",
      qtyLabel: `${s.quantitySold} unit`,
      revenue: toNumber(s.totalPrice),
      modal: saleCost(s),
      kind: "sale",
    })),
    ...monthRentals.map<Row>((r) => ({
      key: `r-${r.id}`,
      receipt: `#RT-${r.id}`,
      date: r.createdAt,
      item: r.product?.name ?? "Unknown",
      customer: r.customerName,
      qtyLabel: durationLabel(r.durationType),
      revenue: toNumber(r.price),
      modal: rentalCost(r),
      kind: "rental",
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const transactionCount = monthRows.length;

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Profit Report</h1>
          <p className="text-muted small mb-0">
            Untung = jualan + hasil rental − modal. Modal = harga beli barang yang dijual.
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
                {transactionCount} transaksi
              </span>
            </div>
            <div className="sb-card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Jualan (Sales)</span>
                <span className="tabular fw-semibold text-dark">{rm(monthSalesRevenue)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Hasil Rental</span>
                <span className="tabular fw-semibold text-dark">{rm(monthRentalRevenue)}</span>
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
                Margin: {monthMargin.toFixed(1)}% daripada hasil
              </div>
            </div>
          </div>
        </div>

        <div className="col-sm-6">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Lifetime</h2>
              <span className="badge bg-light text-dark border tabular">
                {allSales.length + allRentals.length} transaksi
              </span>
            </div>
            <div className="sb-card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Jualan (Sales)</span>
                <span className="tabular fw-semibold text-dark">{rm(lifeSalesRevenue)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-muted small">Hasil Rental</span>
                <span className="tabular fw-semibold text-dark">{rm(lifeRentalRevenue)}</span>
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
                Margin: {lifeMargin.toFixed(1)}% daripada hasil
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Breakdown — {monthLabel}</h2>
          <span className="text-muted small">Jualan + rental, setiap transaksi</span>
        </div>
        <div className="sb-card-body p-0">
          {monthRows.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Date &amp; Time</th>
                    <th>Item</th>
                    <th>Customer</th>
                    <th className="col-center">Qty / Duration</th>
                    <th className="col-right">Hasil</th>
                    <th className="col-right">Modal</th>
                    <th className="col-right">Untung</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((row) => {
                    const untung = row.revenue - row.modal;
                    return (
                      <tr key={row.key}>
                        <td data-label="Receipt" className="tabular fw-bold text-dark">
                          {row.receipt}
                          {row.kind === "rental" && (
                            <span className="sb-badge sb-badge-neutral ms-1">Rental</span>
                          )}
                        </td>
                        <td data-label="Date & Time" className="text-muted small tabular">
                          {formatShopDateTimeFull(row.date)}
                        </td>
                        <td data-label="Item" className="fw-semibold text-dark">
                          {row.item}
                        </td>
                        <td data-label="Customer" className="text-muted">
                          {row.customer}
                        </td>
                        <td data-label="Qty / Duration" className="col-center">
                          <span className="sb-badge sb-badge-neutral">{row.qtyLabel}</span>
                        </td>
                        <td data-label="Hasil" className="col-right tabular">
                          {rm(row.revenue)}
                        </td>
                        <td data-label="Modal" className="col-right tabular text-muted">
                          {rm(row.modal)}
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
              Tiada transaksi bulan {monthLabel}.
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
