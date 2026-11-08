import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import { formatShopDateTimeFull } from "@/lib/time";
import { DURATION_LABELS, isDurationType } from "@/lib/rental";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Monthly Income Receipt | ReidBiz" };
export const dynamic = "force-dynamic";

function durationLabel(type: string) {
  return isDurationType(type) ? DURATION_LABELS[type] : type;
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getSessionUser();

  const { month = "" } = await searchParams;
  const now = new Date();
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  const year = match ? Number(match[1]) : now.getFullYear();
  const monthIndex = match ? Number(match[2]) - 1 : now.getMonth();

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const monthValue = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthLabel = `${monthNames[monthIndex]} ${year}`;

  const [rentals, sales] = await Promise.all([
    prisma.rental.findMany({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
      include: { product: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.sale.findMany({
      where: { userId: user.id, createdAt: { gte: start, lt: end } },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rentalRevenue = rentals.reduce((sum, rental) => sum + toNumber(rental.price), 0);
  const salesRevenue = sales.reduce((sum, sale) => sum + toNumber(sale.totalPrice), 0);
  const totalRevenue = rentalRevenue + salesRevenue;
  const promoDiscount = rentals.reduce(
    (sum, rental) =>
      sum +
      (rental.isPromo && rental.originalPrice != null
        ? toNumber(rental.originalPrice) - toNumber(rental.price)
        : 0),
    0,
  );

  return (
    <>
      <style>{`
        @media print {
          @page { margin: 8mm; }
          .sb-sidebar, .sb-topbar, .sb-mobile-bottom-bar, .no-print { display: none !important; }
          .sb-main { margin-left: 0 !important; }
          .sb-content { padding: 0 !important; max-width: 100% !important; }
          body { background: #fff !important; }
          .receipt-print { max-width: 520px; margin: 0 auto; font-size: 10px; line-height: 1.3; color: #000; }
          .receipt-print table { border-collapse: collapse; width: 100%; }
          .receipt-print table th, .receipt-print table td { padding: 1px 3px; font-size: 10px; }
          .receipt-print table th { font-weight: 600; }
        }
      `}</style>

      <div className="d-none d-print-block receipt-print">
        <div className="text-center mb-2">
          <div className="fw-bold" style={{ fontSize: "13px" }}>{user.username}&apos;s Shop</div>
          <div>Income Receipt | {monthLabel}</div>
          <div className="text-muted">Generated {formatShopDateTimeFull(now)}</div>
        </div>

        <table className="mb-2">
          <tbody>
            <tr>
              <td>Rentals ({rentals.length})</td>
              <td className="text-end">{rm(rentalRevenue)}</td>
            </tr>
            <tr>
              <td>Sales ({sales.length})</td>
              <td className="text-end">{rm(salesRevenue)}</td>
            </tr>
            <tr>
              <td>Promo Discount</td>
              <td className="text-end">{rm(promoDiscount)}</td>
            </tr>
            <tr className="fw-bold" style={{ borderTop: "1px solid #000" }}>
              <td>Total Income</td>
              <td className="text-end">{rm(totalRevenue)}</td>
            </tr>
          </tbody>
        </table>

        {rentals.length > 0 && (
          <>
            <div className="fw-bold mt-2 mb-1">Rental Details</div>
            <table>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th className="text-start">Date</th>
                  <th className="text-start">Item</th>
                  <th className="text-start">Customer</th>
                  <th className="text-start">Duration</th>
                  <th className="text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                {rentals.map((rental) => (
                  <tr key={rental.id}>
                    <td>{formatShopDateTimeFull(rental.startAt)}</td>
                    <td>{rental.product.name}</td>
                    <td>{rental.customerName}</td>
                    <td>{durationLabel(rental.durationType)}</td>
                    <td className="text-end">{rm(rental.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {sales.length > 0 && (
          <>
            <div className="fw-bold mt-2 mb-1">Sales Details</div>
            <table>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th className="text-start">Date</th>
                  <th className="text-start">Item</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{formatShopDateTimeFull(sale.createdAt)}</td>
                    <td>{sale.product.name}</td>
                    <td className="text-end">{sale.quantitySold}</td>
                    <td className="text-end">{rm(sale.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="text-center mt-2">Thank you</div>
      </div>

      <div className="d-print-none">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Monthly Income Receipt</h1>
          <p className="text-muted small mb-0">
            {user.username}&apos;s Shop · {monthLabel}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 no-print">
          <form method="GET" action="/reports/monthly" className="d-flex align-items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={monthValue}
              className="sb-input py-1"
              style={{ maxWidth: 180 }}
            />
            <button type="submit" className="sb-btn sb-btn-secondary">
              View
            </button>
          </form>
          <PrintButton />
        </div>
      </div>

      <div className="sb-card mb-4">
        <div className="sb-card-body p-4">
          <div className="d-flex flex-wrap justify-content-between gap-3 mb-4 pb-3 border-bottom">
            <div>
              <div className="fw-bold text-dark fs-5">ReidBiz | Income Statement</div>
              <div className="text-muted small">
                Month: {monthLabel} · Generated at {formatShopDateTimeFull(now)}
              </div>
            </div>
            <div className="text-end">
              <div className="sb-stat-label mb-0">Total Income</div>
              <div className="sb-stat-value text-success tabular">{rm(totalRevenue)}</div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-sm-4">
              <div className="p-3 border rounded h-100">
                <div className="small text-muted">Rental Income</div>
                <div className="fw-bold text-dark tabular fs-5">{rm(rentalRevenue)}</div>
                <div className="small text-muted">{rentals.length} rentals</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="p-3 border rounded h-100">
                <div className="small text-muted">Sales Income</div>
                <div className="fw-bold text-dark tabular fs-5">{rm(salesRevenue)}</div>
                <div className="small text-muted">{sales.length} sales</div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="p-3 border rounded h-100">
                <div className="small text-muted">Total Promo Discount</div>
                <div className="fw-bold text-dark tabular fs-5">{rm(promoDiscount)}</div>
                <div className="small text-muted">Promo value given</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sb-card mb-4">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Rental Details</h2>
          <span className="badge bg-dark text-white tabular">{rentals.length} records</span>
        </div>
        <div className="sb-card-body p-0">
          {rentals.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table sb-table-plain">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Duration</th>
                    <th className="col-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {rentals.map((rental) => (
                    <tr key={rental.id}>
                      <td className="text-muted small tabular">{formatShopDateTimeFull(rental.startAt)}</td>
                      <td className="fw-semibold text-dark">{rental.product.name}</td>
                      <td className="text-muted">{rental.customerName}</td>
                      <td>
                        <span className="sb-badge sb-badge-neutral">
                          {durationLabel(rental.durationType)}
                        </span>
                        {rental.isPromo && (
                          <span className="sb-badge sb-badge-low-stock ms-1">Promo</span>
                        )}
                      </td>
                      <td className="col-right tabular fw-bold text-dark">
                        {rm(rental.price)}
                        {rental.isPromo && rental.originalPrice != null && (
                          <span
                            className="text-muted small d-block"
                            style={{ textDecoration: "line-through" }}
                          >
                            {rm(rental.originalPrice)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="fw-semibold text-dark">
                      Total Rentals
                    </td>
                    <td className="col-right tabular fw-bold text-success">{rm(rentalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-muted small">No rentals this month.</div>
          )}
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Sales Details</h2>
          <span className="badge bg-dark text-white tabular">{sales.length} records</span>
        </div>
        <div className="sb-card-body p-0">
          {sales.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table sb-table-plain">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item</th>
                    <th className="col-center">Quantity</th>
                    <th className="col-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="text-muted small tabular">{formatShopDateTimeFull(sale.createdAt)}</td>
                      <td className="fw-semibold text-dark">{sale.product.name}</td>
                      <td className="col-center tabular">{sale.quantitySold}</td>
                      <td className="col-right tabular fw-bold text-dark">
                        {rm(sale.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="fw-semibold text-dark">
                      Total Sales
                    </td>
                    <td className="col-right tabular fw-bold text-success">{rm(salesRevenue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-muted small">No sales this month.</div>
          )}
        </div>
      </div>

      <div className="text-center text-muted small mt-4 no-print">
        <Link href="/rentals" className="text-decoration-none text-muted">
          ← Back to Rentals
        </Link>
      </div>
      </div>
    </>
  );
}
