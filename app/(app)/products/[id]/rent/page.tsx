import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { rentalPrices, toLocalInputValue } from "@/lib/rental";
import RecordRentForm from "@/components/RecordRentForm";

export const metadata = { title: "Rent Item | ReidBiz" };
export const dynamic = "force-dynamic";

export default async function RentProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id: Number(id), userId: user.id },
  });
  if (!product || !product.isRentable) notFound();

  const slots = Math.max(product.quantity, 0);
  const activeCount = await prisma.rental.count({
    where: {
      productId: product.id,
      status: "active",
      startAt: { lte: new Date() },
      endAt: { gt: new Date() },
    },
  });
  const available = slots > 0 && activeCount < slots;

  return (
    <div className="py-2" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="mb-3">
        <Link
          href="/products"
          className="text-decoration-none text-muted small d-inline-flex align-items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Inventory Catalog
        </Link>
      </div>

      <div className="sb-card">
        <div className="sb-card-header">
          <div>
            <h1 className="h5 mb-0">Rent: {product.name}</h1>
            <span className="text-muted small">
              Choose a duration and save the customer details
            </span>
          </div>
          {available ? (
            <span className="sb-badge sb-badge-in-stock">Available</span>
          ) : (
            <span className="sb-badge sb-badge-out-of-stock">Currently Rented</span>
          )}
        </div>

        <div className="sb-card-body p-4">
          {!available && (
            <div className="sb-alert sb-alert-warning mb-4">
              <span>
                {slots === 0
                  ? "This item has 0 slots. Set Units in Stock to the number of accounts you can rent out."
                  : `All ${slots} slot(s) are taken right now (${activeCount}/${slots}). End a rental before starting a new one.`}
              </span>
              <Link href={slots === 0 ? `/products/${product.id}/edit` : "/rentals"} className="sb-btn sb-btn-secondary sb-btn-sm">
                {slots === 0 ? "Update stock" : "View Rentals"}
              </Link>
            </div>
          )}

          {available && (
            <RecordRentForm
              product={{
                id: product.id,
                name: product.name,
                prices: rentalPrices(product),
                available,
                slots,
                activeCount,
              }}
              defaultStartAt={toLocalInputValue(new Date())}
            />
          )}
        </div>
      </div>
    </div>
  );
}
