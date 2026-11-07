import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import SalesTrendChart, { type DailySale } from "@/components/SalesTrendChart";

export const metadata = { title: "Dashboard | ReidBiz Sales Ledger" };
export const dynamic = "force-dynamic";

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatTime(date: Date) {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month} ${day}, ${hours}:${minutes}`;
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const userId = user.id;

  const now = new Date();
  const todayStart = startOfDay(now);
  const sevenStart = startOfDay(now);
  sevenStart.setDate(sevenStart.getDate() - 6);

  const [
    todayAgg,
    todayCount,
    weekAgg,
    weekCount,
    allAgg,
    allCount,
    todayRentalAgg,
    todayRentalCount,
    weekRentalAgg,
    weekRentalCount,
    allRentalAgg,
    allRentalCount,
    activeRentals,
    products,
    recentSales,
    topGroups,
    weekSales,
    weekRentals,
  ] = await Promise.all([
    prisma.sale.aggregate({ _sum: { totalPrice: true }, where: { userId, createdAt: { gte: todayStart } } }),
    prisma.sale.count({ where: { userId, createdAt: { gte: todayStart } } }),
    prisma.sale.aggregate({ _sum: { totalPrice: true }, where: { userId, createdAt: { gte: sevenStart } } }),
    prisma.sale.count({ where: { userId, createdAt: { gte: sevenStart } } }),
    prisma.sale.aggregate({ _sum: { totalPrice: true }, where: { userId } }),
    prisma.sale.count({ where: { userId } }),
    prisma.rental.aggregate({ _sum: { price: true }, where: { userId, createdAt: { gte: todayStart } } }),
    prisma.rental.count({ where: { userId, createdAt: { gte: todayStart } } }),
    prisma.rental.aggregate({ _sum: { price: true }, where: { userId, createdAt: { gte: sevenStart } } }),
    prisma.rental.count({ where: { userId, createdAt: { gte: sevenStart } } }),
    prisma.rental.aggregate({ _sum: { price: true }, where: { userId } }),
    prisma.rental.count({ where: { userId } }),
    prisma.rental.count({ where: { userId, status: "active", endAt: { gt: now } } }),
    prisma.product.findMany({ where: { userId }, select: { quantity: true } }),
    prisma.sale.findMany({
      where: { userId },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.sale.groupBy({
      by: ["productId"],
      where: { userId },
      _sum: { quantitySold: true, totalPrice: true },
      orderBy: { _sum: { totalPrice: "desc" } },
      take: 5,
    }),
    prisma.sale.findMany({
      where: { userId, createdAt: { gte: sevenStart } },
      select: { createdAt: true, totalPrice: true },
    }),
    prisma.rental.findMany({
      where: { userId, createdAt: { gte: sevenStart } },
      select: { createdAt: true, price: true },
    }),
  ]);

  const salesToday = toNumber(todayAgg._sum.totalPrice);
  const salesWeek = toNumber(weekAgg._sum.totalPrice);
  const salesAllTime = toNumber(allAgg._sum.totalPrice);
  const rentToday = toNumber(todayRentalAgg._sum.price);
  const rentWeek = toNumber(weekRentalAgg._sum.price);
  const rentAllTime = toNumber(allRentalAgg._sum.price);

  const incomeToday = salesToday + rentToday;
  const incomeWeek = salesWeek + rentWeek;
  const incomeAllTime = salesAllTime + rentAllTime;

  const weekTransactions = weekCount + weekRentalCount;
  const avgSaleValue = weekTransactions > 0 ? Math.round((incomeWeek / weekTransactions) * 100) / 100 : 0;

  const totalProducts = products.length;
  const outOfStock = products.filter((p) => p.quantity <= 0).length;
  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity < 10).length;
  const inStock = totalProducts - lowStock - outOfStock;

  const topIds = topGroups.map((group) => group.productId);
  const topNames = await prisma.product.findMany({
    where: { id: { in: topIds } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topNames.map((item) => [item.id, item.name]));
  const topProducts = topGroups.map((group) => ({
    id: group.productId,
    name: nameById.get(group.productId) ?? "Unknown",
    totalSold: group._sum.quantitySold ?? 0,
    revenue: toNumber(group._sum.totalPrice),
  }));

  const dailySales: DailySale[] = [];
  for (let i = 0; i < 7; i += 1) {
    const dayStart = startOfDay(now);
    dayStart.setDate(dayStart.getDate() - (6 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const saleTotal = weekSales
      .filter((sale) => sale.createdAt >= dayStart && sale.createdAt < dayEnd)
      .reduce((sum, sale) => sum + toNumber(sale.totalPrice), 0);
    const rentalTotal = weekRentals
      .filter((rental) => rental.createdAt >= dayStart && rental.createdAt < dayEnd)
      .reduce((sum, rental) => sum + toNumber(rental.price), 0);

    dailySales.push({
      day: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
      date: dayStart.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      total: saleTotal + rentalTotal,
    });
  }

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Store Overview</h1>
          <p className="text-muted small mb-0">
            Sales and rental income, plus stock health for today.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/products/new" className="sb-btn sb-btn-secondary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>New Product</span>
          </Link>
          <Link href="/products" className="sb-btn sb-btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span>Record A Sale</span>
          </Link>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card">
            <div>
              <span className="sb-stat-label">
                Today&apos;s Income
                <span className="sb-status-dot green" />
              </span>
              <div className="sb-stat-value text-dark tabular">{rm(incomeToday)}</div>
            </div>
            <div className="sb-stat-meta positive">
              {todayCount} sale{todayCount === 1 ? "" : "s"} · {todayRentalCount} rental
              {todayRentalCount === 1 ? "" : "s"} today
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card">
            <div>
              <span className="sb-stat-label">Last 7 Days</span>
              <div className="sb-stat-value tabular">{rm(incomeWeek)}</div>
            </div>
            <div className="sb-stat-meta">
              {rm(salesWeek)} sales · {rm(rentWeek)} rentals
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card">
            <div>
              <span className="sb-stat-label">Healthy Stock</span>
              <div className="sb-stat-value tabular">{inStock} Items</div>
            </div>
            <div className="sb-stat-meta">Out of {totalProducts} total listed products</div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="sb-stat-card">
            <div>
              <span className="sb-stat-label">
                Attention Needed
                {(lowStock > 0 || outOfStock > 0) && <span className="sb-status-dot red" />}
              </span>
              <div
                className={`sb-stat-value tabular ${
                  lowStock > 0 || outOfStock > 0 ? "text-danger" : "text-muted"
                }`}
              >
                {lowStock + outOfStock} Items
              </div>
            </div>
            <div className={`sb-stat-meta ${lowStock > 0 || outOfStock > 0 ? "critical" : ""}`}>
              {lowStock > 0 || outOfStock > 0
                ? `${lowStock} low stock, ${outOfStock} out of stock`
                : "All items sufficiently stocked"}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <div>
                <h2 className="sb-card-title">7-Day Income</h2>
                <span className="text-muted small">
                  Daily income from sales and rentals over the past week
                </span>
              </div>
              <span className="badge bg-light text-dark border">RM Currency</span>
            </div>
            <div className="sb-card-body">
              <div style={{ position: "relative", height: 260, width: "100%" }}>
                <SalesTrendChart data={dailySales} />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Stock Summary</h2>
              <Link href="/products" className="text-decoration-none small text-dark fw-semibold">
                View All →
              </Link>
            </div>
            <div className="sb-card-body d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">In Stock (&ge;10 units)</span>
                  <span className="sb-badge sb-badge-in-stock tabular">{inStock} items</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Low Stock (&lt;10 units)</span>
                  <span className="sb-badge sb-badge-low-stock tabular">{lowStock} items</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Out of Stock (0 units)</span>
                  <span className="sb-badge sb-badge-out-of-stock tabular">{outOfStock} items</span>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                  <span className="text-muted small">Rentals running now</span>
                  <Link href="/rentals" className="sb-badge sb-badge-neutral tabular text-decoration-none">
                    {activeRentals} slots
                  </Link>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-muted small">Average transaction (7 days)</span>
                  <strong className="tabular text-dark">{rm(avgSaleValue, { decimals: 2 })}</strong>
                </div>
              </div>

              <div className="p-3 bg-light border rounded">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="small fw-semibold text-dark">All-Time Income</span>
                  <span className="badge bg-dark text-white tabular">
                    {allCount + allRentalCount} records
                  </span>
                </div>
                <div className="fs-5 fw-bold text-dark tabular">{rm(incomeAllTime)}</div>
                <div className="small text-muted">
                  {rm(salesAllTime)} sales · {rm(rentAllTime)} rentals
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Top Products by Revenue</h2>
              <span className="text-muted small">Most profitable inventory items</span>
            </div>
            <div className="sb-card-body p-0">
              {topProducts.length > 0 ? (
                <div className="sb-table-responsive">
                  <table className="sb-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="col-center">Units Sold</th>
                        <th className="col-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product) => (
                        <tr key={product.id}>
                          <td data-label="Product" className="fw-semibold text-dark">{product.name}</td>
                          <td data-label="Units Sold" className="col-center tabular">{product.totalSold}</td>
                          <td data-label="Total Revenue" className="col-right tabular fw-bold text-dark">
                            {rm(product.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted small">
                  <p className="mb-2">No top selling products logged yet.</p>
                  <Link href="/products" className="sb-btn sb-btn-secondary sb-btn-sm">
                    Record your first sale
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="sb-card h-100">
            <div className="sb-card-header">
              <h2 className="sb-card-title">Recent Transactions</h2>
              <Link
                href="/sales/history"
                className="text-decoration-none small text-dark fw-semibold"
              >
                Full Ledger →
              </Link>
            </div>
            <div className="sb-card-body p-0">
              {recentSales.length > 0 ? (
                <div className="sb-table-responsive">
                  <table className="sb-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Time</th>
                        <th className="col-center">Qty</th>
                        <th className="col-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((sale) => (
                        <tr key={sale.id}>
                          <td data-label="Item" className="fw-semibold text-dark">{sale.product.name}</td>
                          <td data-label="Time" className="text-muted small tabular">
                            {formatTime(sale.createdAt)}
                          </td>
                          <td data-label="Qty" className="col-center tabular">{sale.quantitySold}</td>
                          <td data-label="Amount" className="col-right tabular fw-bold text-success">
                            {rm(sale.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 text-center text-muted small">
                  <p className="mb-2">No transaction history recorded yet.</p>
                  <Link href="/products/new" className="sb-btn sb-btn-secondary sb-btn-sm">
                    Add an item to sell
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
