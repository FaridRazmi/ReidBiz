import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProduct } from "@/app/actions/products";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rm } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id: Number(id), userId: user.id },
  });
  return {
    title: product ? `Delete ${product.name} | ReidBiz` : "Delete Product | ReidBiz",
  };
}

export default async function DeleteProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: { id: Number(id), userId: user.id },
  });
  if (!product) notFound();

  const [saleRecords, rentalRecords] = await Promise.all([
    prisma.sale.count({ where: { productId: product.id } }),
    prisma.rental.count({ where: { productId: product.id } }),
  ]);
  const inUse = saleRecords > 0 || rentalRecords > 0;

  return (
    <div className="py-3" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="mb-3">
        <Link
          href="/products"
          className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Cancel and Return to Inventory
        </Link>
      </div>

      <div className="sb-card">
        <div
          className={`sb-card-header ${
            inUse ? "bg-warning-subtle border-warning-subtle" : "bg-danger-subtle border-danger-subtle"
          }`}
        >
          <h1 className={`h5 mb-0 fw-semibold ${inUse ? "text-warning-emphasis" : "text-danger"}`}>
            {inUse ? "Item Has Sales History" : "Confirm Item Deletion"}
          </h1>
          <span className="sb-badge sb-badge-out-of-stock">{inUse ? "Blocked" : "Permanent"}</span>
        </div>

        <div className="sb-card-body p-4">
          <p className="text-muted small mb-4">
            {inUse ? (
              <>
                <strong>{product.name}</strong> already has {saleRecords} sale record
                {saleRecords === 1 ? "" : "s"} and {rentalRecords} rental record
                {rentalRecords === 1 ? "" : "s"}. Deleting it would wipe that income history,
                so it is blocked.
              </>
            ) : (
              <>
                Are you sure you want to remove <strong>{product.name}</strong> from your store
                catalog? This item and its active inventory will no longer be available for sale
                recording.
              </>
            )}
          </p>

          <div className="p-3 bg-light border rounded mb-4">
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted small">Product Name</span>
              <strong className="text-dark">{product.name}</strong>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted small">Current Units in Stock</span>
              <span className="tabular fw-bold text-dark">{product.quantity} units</span>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted small">Selling Price</span>
              <span className="tabular text-dark">{rm(product.sellingPrice, { decimals: 2 })}</span>
            </div>
            <div className="d-flex justify-content-between py-1 border-bottom">
              <span className="text-muted small">Wholesale Cost</span>
              <span className="tabular text-dark">{rm(product.buyingPrice, { decimals: 2 })}</span>
            </div>
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted small">Linked Records</span>
              <span className="tabular text-dark">
                {saleRecords} sales · {rentalRecords} rentals
              </span>
            </div>
          </div>

          {inUse ? (
            <div className="d-flex flex-column gap-2">
              <div className="sb-alert sb-alert-warning mb-0">
                <span>
                  Keep the item and set its stock to 0 if you no longer sell it. The records stay
                  intact so your monthly income report remains correct.
                </span>
              </div>
              <Link href={`/products/${product.id}/edit`} className="sb-btn sb-btn-primary w-100">
                Edit Instead (Set Stock to 0)
              </Link>
              <Link href="/products" className="sb-btn sb-btn-secondary w-100 text-center">
                Back to Inventory
              </Link>
            </div>
          ) : (
            <form action={deleteProduct}>
              <input type="hidden" name="id" value={product.id} />
              <div className="d-flex flex-column gap-2">
                <button type="submit" className="sb-btn sb-btn-danger w-100">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Yes, Delete Product Permanently
                </button>
                <Link href="/products" className="sb-btn sb-btn-secondary w-100">
                  Keep Item
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
