import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm, toNumber } from "@/lib/format";
import { accountExpiryStatus, daysUntil } from "@/lib/rental";

export const metadata = { title: "Inventory & Products | ReidBiz" };
export const dynamic = "force-dynamic";

const PRODUCT_ERRORS: Record<string, string> = {
  missing: "That product no longer exists.",
  name: "Product name cannot be empty.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; error?: string }>;
}) {
  const user = await getSessionUser();

  const { q = "", status = "all", error } = await searchParams;
  const errorMessage = error ? PRODUCT_ERRORS[error] : undefined;
  const query = q.trim();
  const now = new Date();

  const allProducts = await prisma.product.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  const activeRentalGroups = await prisma.rental.groupBy({
    by: ["productId"],
    where: { userId: user.id, status: "active", endAt: { gt: now } },
    _count: { _all: true },
  });
  const activeByProduct = new Map(
    activeRentalGroups.map((group) => [group.productId, group._count._all]),
  );

  const totalInventoryItems = allProducts.length;
  const lowStockCount = allProducts.filter((p) => p.quantity > 0 && p.quantity < 10).length;
  const outOfStockCount = allProducts.filter((p) => p.quantity <= 0).length;
  const totalInventoryValue = allProducts.reduce(
    (sum, p) => sum + p.quantity * toNumber(p.buyingPrice),
    0,
  );

  const products = allProducts.filter((product) => {
    if (query && !product.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (status === "low") return product.quantity > 0 && product.quantity < 10;
    if (status === "out") return product.quantity <= 0;
    if (status === "in_stock") return product.quantity >= 10;
    return true;
  });

  return (
    <>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h3 mb-1">Inventory Management</h1>
          <p className="text-muted small mb-0">
            Track stock levels, monitor wholesale costs, and record instant sales.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link href="/products/new" className="sb-btn sb-btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Add New Item</span>
          </Link>
        </div>
      </div>

      {errorMessage && (
        <div className="sb-alert sb-alert-danger mb-3">
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Total Catalog</span>
            <div className="sb-stat-value fs-4 tabular">{totalInventoryItems} Items</div>
            <span className="sb-stat-meta">Active products</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Inventory Asset Value</span>
            <div className="sb-stat-value fs-4 tabular text-dark">{rm(totalInventoryValue)}</div>
            <span className="sb-stat-meta">Wholesale cost</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Low Stock</span>
            <div className={`sb-stat-value fs-4 tabular ${lowStockCount > 0 ? "text-warning" : ""}`}>
              {lowStockCount} Items
            </div>
            <span className="sb-stat-meta warning">&lt; 10 units left</span>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="sb-stat-card p-3">
            <span className="sb-stat-label">Out of Stock</span>
            <div className={`sb-stat-value fs-4 tabular ${outOfStockCount > 0 ? "text-danger" : ""}`}>
              {outOfStockCount} Items
            </div>
            <span className="sb-stat-meta critical">Needs restocking</span>
          </div>
        </div>
      </div>

      <div className="sb-card mb-4">
        <div className="sb-card-body p-3">
          <form method="GET" action="/products" className="row g-2 align-items-center">
            <div className="col-md-5">
              <div
                className="d-flex align-items-center border rounded px-2"
                style={{ background: "#ffffff" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  className="form-control border-0 shadow-none ps-2"
                  placeholder="Search product by name..."
                  style={{ fontSize: "0.875rem" }}
                />
              </div>
            </div>

            <div className="col-md-4">
              <select name="status" className="sb-select py-1" defaultValue={status}>
                <option value="all">All Stock Levels</option>
                <option value="in_stock">In Stock (&ge; 10 units)</option>
                <option value="low">Low Stock (&lt; 10 units)</option>
                <option value="out">Out of Stock (0 units)</option>
              </select>
            </div>

            <div className="col-md-3 d-flex gap-2">
              <button type="submit" className="sb-btn sb-btn-secondary flex-grow-1">
                Filter
              </button>
              {(query || status !== "all") && (
                <Link href="/products" className="sb-btn sb-btn-secondary" title="Clear Filters">
                  Reset
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <h2 className="sb-card-title">Inventory Catalog ({products.length})</h2>
          <span className="text-muted small">Updated in real-time</span>
        </div>

        <div className="sb-card-body p-0">
          {products.length > 0 ? (
            <div className="sb-table-responsive">
              <table className="sb-table">
                <thead>
                  <tr>
                    <th>Product Item</th>
                    <th>Stock Status</th>
                    <th className="col-right">Units In Stock</th>
                    <th className="col-right">Cost Price</th>
                    <th className="col-right">Selling Price</th>
                    <th className="col-right" style={{ minWidth: 190 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const activeCount = activeByProduct.get(product.id) ?? 0;
                    const slots = Math.max(product.quantity, 0);
                    const available = slots > 0 && activeCount < slots;
                    const expiry = accountExpiryStatus(product.accountExpiryDate, now);
                    return (
                    <tr key={product.id}>
                      <td data-label="Product Item">
                        <div className="fw-semibold text-dark">
                          {product.name}
                          {product.isRentable && (
                            <span className="sb-badge sb-badge-neutral ms-2">Rental</span>
                          )}
                        </div>
                        <span className="text-muted small">Item #{product.id}</span>
                        {product.isRentable && (
                          <span className="text-muted small d-block">
                            3h {rm(product.rentalPrice3h)} · day {rm(product.rentalPriceDay)} ·
                            week {rm(product.rentalPriceWeek)} · month {rm(product.rentalPriceMonth)}
                          </span>
                        )}
                        {product.isRentable && expiry !== "none" && (
                          <span className="d-block mt-1">
                            {expiry === "expired" ? (
                              <span className="sb-badge sb-badge-out-of-stock">Account Expired</span>
                            ) : expiry === "expiring" ? (
                              <span className="sb-badge sb-badge-low-stock">
                                Expires in {daysUntil(product.accountExpiryDate ?? now, now)} days
                              </span>
                            ) : (
                              <span className="sb-badge sb-badge-in-stock">Account Active</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td data-label="Stock Status">
                        {product.isRentable ? (
                          slots === 0 ? (
                            <span className="sb-badge sb-badge-out-of-stock">
                              <span className="sb-status-dot red" /> No slots
                            </span>
                          ) : available ? (
                            <span className="sb-badge sb-badge-in-stock">
                              <span className="sb-status-dot green" /> Available
                            </span>
                          ) : (
                            <span className="sb-badge sb-badge-low-stock">
                              <span className="sb-status-dot amber" /> Rented
                            </span>
                          )
                        ) : product.quantity === 0 ? (
                          <span className="sb-badge sb-badge-out-of-stock">
                            <span className="sb-status-dot red" /> Out of Stock
                          </span>
                        ) : product.quantity < 10 ? (
                          <span className="sb-badge sb-badge-low-stock">
                            <span className="sb-status-dot amber" /> Low Stock
                          </span>
                        ) : (
                          <span className="sb-badge sb-badge-in-stock">
                            <span className="sb-status-dot green" /> Healthy
                          </span>
                        )}
                      </td>
                      <td data-label="Units In Stock" className="col-right tabular fw-bold text-dark fs-6">{product.quantity}</td>
                      <td data-label="Cost Price" className="col-right tabular text-muted">{rm(product.buyingPrice, { decimals: 2 })}</td>
                      <td data-label="Selling Price" className="col-right tabular fw-bold text-dark">
                        {product.isRentable ? "-" : rm(product.sellingPrice, { decimals: 2 })}
                      </td>
                      <td data-label="Actions" className="col-right">
                        <div className="d-inline-flex align-items-center gap-1">
                          {product.isRentable ? (
                            expiry === "expired" ? (
                              <button
                                className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2 disabled text-muted"
                                disabled
                                title="Account has expired"
                              >
                                <span>Expired</span>
                              </button>
                            ) : slots === 0 ? (
                              <Link
                                href={`/products/${product.id}/edit`}
                                className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2"
                                title="Set the number of rental slots"
                              >
                                <span>Set slots</span>
                              </Link>
                            ) : available ? (
                              <Link
                                href={`/products/${product.id}/rent`}
                                className="sb-btn sb-btn-primary sb-btn-sm py-1 px-2"
                                title="Rent this item"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="9" cy="21" r="1" />
                                  <circle cx="20" cy="21" r="1" />
                                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                                </svg>
                                <span>Rent</span>
                              </Link>
                            ) : (
                              <button
                                className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2 disabled text-muted"
                                disabled
                              >
                                <span>Rented</span>
                              </button>
                            )
                          ) : product.quantity > 0 ? (
                            <Link
                              href={`/products/${product.id}/sale`}
                              className="sb-btn sb-btn-primary sb-btn-sm py-1 px-2"
                              title="Record a sale for this item"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="9" cy="21" r="1" />
                                <circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                              </svg>
                              <span>Sale</span>
                            </Link>
                          ) : (
                            <button
                              className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2 disabled text-muted"
                              disabled
                            >
                              <span>Sold Out</span>
                            </button>
                          )}

                          <Link
                            href={`/products/${product.id}/edit`}
                            className="sb-btn sb-btn-secondary sb-btn-sm py-1 px-2"
                            title="Edit item"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </Link>

                          <Link
                            href={`/products/${product.id}/delete`}
                            className="sb-btn sb-btn-outline-danger sb-btn-sm py-1 px-2"
                            title="Delete item"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </Link>
                        </div>
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
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                </svg>
              </div>
              <h3 className="h5 text-dark mb-1">No products found</h3>
              <p className="small text-muted mb-3">
                {query
                  ? `No items match your search for "${query}".`
                  : "Your catalog is currently empty. Add your first item to begin tracking sales!"}
              </p>
              {query ? (
                <Link href="/products" className="sb-btn sb-btn-secondary sb-btn-sm">
                  Clear Search
                </Link>
              ) : (
                <Link href="/products/new" className="sb-btn sb-btn-primary sb-btn-sm">
                  Add Item Now
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
