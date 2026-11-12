import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import { formatShopDateTime, shopShortDate } from "@/lib/time";
import { DURATION_LABELS, formatRemaining, isDurationType } from "@/lib/rental";
import { deleteRental, endRental } from "@/app/actions/rentals";

export const metadata = { title: "Rentals | ReidBiz" };
export const dynamic = "force-dynamic";

function durationLabel(type: string) {
  return isDurationType(type) ? DURATION_LABELS[type] : type;
}

const RENTAL_ERRORS: Record<string, string> = {
  active: "That rental is still running. End it first, then you can delete the record.",
  missing: "That rental record no longer exists.",
};

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  const now = new Date();
  const { error } = await searchParams;
  const errorMessage = error ? RENTAL_ERRORS[error] : undefined;

  await prisma.rental.updateMany({
    where: { userId: user.id, status: "active", endAt: { lte: now } },
    data: { status: "completed" },
  });

  const rentals = await prisma.rental.findMany({
    where: { userId: user.id },
    include: { product: { select: { name: true, accountExpiryDate: true } } },
    orderBy: { createdAt: "desc" },
  });

  const isActive = (rental: (typeof rentals)[number]) =>
    rental.status === "active" && rental.endAt > now;

  const active = rentals.filter(isActive);
  const past = rentals.filter((rental) => !isActive(rental));

  const activeRevenue = active.reduce((sum, rental) => sum + toNumber(rental.price), 0);
  const totalRevenue = rentals
    .filter((rental) => rental.status !== "cancelled")
    .reduce((sum, rental) => sum + toNumber(rental.price), 0);

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Active Rentals &amp; History</h1>
          <p className="text-muted small mb-0">
            Track rented slots, time left, and past rentals.
          </p>
        </div>
        <Link href="/products" className="sb-btn sb-btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
          <span>Rent New Item</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="sb-alert sb-alert-danger mb-3">
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Currently Rented</span>
            <div className="sb-stat-value tabular fs-4">{active.length} Slots</div>
            <span className="sb-stat-meta">Active now</span>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Active Rental Value</span>
            <div className="sb-stat-value tabular text-success fs-4">{rm(activeRevenue)}</div>
            <span className="sb-stat-meta positive">Not yet ended</span>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Total Rental Revenue</span>
            <div className="sb-stat-value tabular fs-4">{rm(totalRevenue)}</div>
            <span className="sb-stat-meta">{rentals.length} records</span>
          </div>
        </div>
      </div>

      <div className="sb-card mb-4">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Active Rentals</h2>
          <span className="badge bg-dark text-white tabular">{active.length} active</span>
        </div>
        <div className="sb-card-body p-0">
          {active.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Duration</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="col-center">Remaining</th>
                    <th className="col-right">Price</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((rental) => (
                    <tr key={rental.id}>
                      <td data-label="Item" className="fw-semibold text-dark">
                        {rental.product.name}
                        {rental.product.accountExpiryDate && (
                          <span className="text-muted small d-block">
                            Account expires {shopShortDate(rental.product.accountExpiryDate)}
                          </span>
                        )}
                      </td>
                      <td data-label="Customer">
                        <div className="fw-semibold text-dark">{rental.customerName}</div>
                        {rental.customerPhone && (
                          <span className="text-muted small">{rental.customerPhone}</span>
                        )}
                      </td>
                      <td data-label="Duration">
                        <span className="sb-badge sb-badge-neutral">
                          {durationLabel(rental.durationType)}
                        </span>
                        {rental.isPromo && (
                          <span className="sb-badge sb-badge-low-stock ms-1">Promo</span>
                        )}
                      </td>
                      <td data-label="Start" className="text-muted small tabular">
                        {formatShopDateTime(rental.startAt)}
                      </td>
                      <td data-label="End" className="text-muted small tabular">{formatShopDateTime(rental.endAt)}</td>
                      <td data-label="Remaining" className="col-center tabular fw-semibold text-dark">
                        {rental.startAt > now
                          ? `Starts in ${formatRemaining(rental.startAt, now)}`
                          : formatRemaining(rental.endAt, now)}
                      </td>
                      <td data-label="Price" className="col-right tabular fw-bold text-success">
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
                      <td data-label="Action" className="col-right">
                        <form method="POST" action={endRental} className="m-0">
                          <input type="hidden" name="id" value={rental.id} />
                          <button type="submit" className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2">
                            End
                          </button>
                        </form>
                        <a
                          href="https://www.nebula.my"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="d-block text-muted small mt-1"
                        >
                          Tukar password ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-muted small">
              <p className="mb-2">No active rentals right now.</p>
              <Link href="/products" className="sb-btn sb-btn-secondary sb-btn-sm">
                Start a rental
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Rental History</h2>
          <span className="text-muted small">Past records</span>
        </div>
        <div className="sb-card-body p-0">
          {past.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Customer</th>
                    <th>Duration</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="col-right">Price</th>
                    <th className="col-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((rental) => (
                    <tr key={rental.id}>
                      <td data-label="Item" className="fw-semibold text-dark">
                        {rental.product.name}
                        {rental.product.accountExpiryDate && (
                          <span className="text-muted small d-block">
                            Account expires {shopShortDate(rental.product.accountExpiryDate)}
                          </span>
                        )}
                      </td>
                      <td data-label="Customer" className="text-muted">{rental.customerName}</td>
                      <td data-label="Duration">
                        <span className="sb-badge sb-badge-neutral">
                          {durationLabel(rental.durationType)}
                        </span>
                        {rental.isPromo && (
                          <span className="sb-badge sb-badge-low-stock ms-1">Promo</span>
                        )}
                      </td>
                      <td data-label="Start" className="text-muted small tabular">
                        {formatShopDateTime(rental.startAt)}
                      </td>
                      <td data-label="End" className="text-muted small tabular">{formatShopDateTime(rental.endAt)}</td>
                      <td data-label="Price" className="col-right tabular fw-bold text-dark">
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
                      <td data-label="Action" className="col-right">
                        <form method="POST" action={deleteRental} className="m-0">
                          <input type="hidden" name="id" value={rental.id} />
                          <button
                            type="submit"
                            className="sb-btn sb-btn-outline-danger sb-btn-sm py-1 px-2"
                            title="Delete this rental record"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-muted small">No past rental records.</div>
          )}
        </div>
      </div>
    </>
  );
}
