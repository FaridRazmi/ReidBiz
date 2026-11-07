import Link from "next/link";
import { notFound } from "next/navigation";
import RecordSaleForm from "@/components/RecordSaleForm";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { toNumber } from "@/lib/format";

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
    title: product ? `Record Sale: ${product.name} | ReidBiz` : "Record Sale | ReidBiz",
  };
}

export default async function RecordSalePage({
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

  return (
    <div className="py-2" style={{ maxWidth: 520, margin: "0 auto" }}>
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
            <h1 className="h5 mb-0">Record Customer Sale</h1>
            <span className="text-muted small">Instant transaction logging</span>
          </div>
          {product.quantity > 0 ? (
            <span className="sb-badge sb-badge-in-stock">
              <span className="sb-status-dot green"></span>
              In Stock: {product.quantity}
            </span>
          ) : (
            <span className="sb-badge sb-badge-out-of-stock">
              <span className="sb-status-dot red"></span>
              Out of stock
            </span>
          )}
        </div>

        <div className="sb-card-body p-4">
          <RecordSaleForm
            product={{
              id: product.id,
              name: product.name,
              sellingPrice: toNumber(product.sellingPrice),
              quantity: product.quantity,
            }}
          />
        </div>
      </div>
    </div>
  );
}
