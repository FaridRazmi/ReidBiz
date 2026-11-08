"use client";

import Link from "next/link";
import { useState } from "react";
import { createProduct, updateProduct } from "@/app/actions/products";

type ProductInput = {
  id: number;
  name: string;
  quantity: number;
  buyingPrice: string;
  sellingPrice: string;
  isRentable: boolean;
  rentalPrice3h: string;
  rentalPriceDay: string;
  rentalPriceWeek: string;
  rentalPriceMonth: string;
  accountExpiryDate: string;
};

export default function ProductForm({
  product,
  mode,
}: {
  product?: ProductInput;
  mode: "create" | "edit";
}) {
  const [cost, setCost] = useState(Number(product?.buyingPrice ?? 0));
  const [sell, setSell] = useState(Number(product?.sellingPrice ?? 0));
  const [rentable, setRentable] = useState(product?.isRentable ?? false);

  const profit = sell - cost;
  const marginPercent = sell > 0 ? (profit / sell) * 100 : 0;

  const badgeClass =
    sell <= 0
      ? "sb-badge sb-badge-in-stock tabular"
      : profit > 0
        ? "sb-badge sb-badge-in-stock tabular"
        : profit === 0
          ? "sb-badge sb-badge-neutral tabular"
          : "sb-badge sb-badge-out-of-stock tabular";

  const detail =
    sell <= 0
      ? "Enter cost and selling prices above to see profit calculations."
      : profit > 0
        ? `Healthy margin: you make RM ${profit.toFixed(2)} on each sale.`
        : profit === 0
          ? "Break-even: cost equals selling price."
          : "Warning: selling price is below wholesale cost!";

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
            <h1 className="h5 mb-0">
              {mode === "edit" ? "Edit Product Details" : "Add New Inventory Item"}
            </h1>
            <span className="text-muted small">
              {mode === "edit"
                ? "Update stock levels or pricing"
                : "Record a new item to sell in your shop"}
            </span>
          </div>
          {product && <span className="sb-badge sb-badge-neutral">ID #{product.id}</span>}
        </div>

        <div className="sb-card-body p-4">
          <form action={mode === "edit" ? updateProduct : createProduct}>
            {product && <input type="hidden" name="id" value={product.id} />}

            <div className="sb-form-group">
              <label htmlFor="name" className="sb-label">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                className="sb-input"
                required
                autoFocus
                placeholder="e.g. Maize Flour 2kg Bale"
                defaultValue={product?.name ?? ""}
              />
              <div className="sb-input-hint">
                Specify brand, size, or pack quantity for quick identification.
              </div>
            </div>

            {!rentable && (
              <div className="sb-form-group">
                <label htmlFor="quantity" className="sb-label">
                  Units in Stock
                </label>
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  className="sb-input tabular"
                  required
                  min="0"
                  placeholder="0"
                  defaultValue={product?.quantity ?? 0}
                />
                <div className="sb-input-hint">
                  Current physical count available on store shelves.
                </div>
              </div>
            )}

            <div className="p-3 bg-light border rounded mb-4">
              <div className="form-check mb-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  name="is_rentable"
                  id="is_rentable"
                  checked={rentable}
                  onChange={(event) => setRentable(event.target.checked)}
                />
                <label className="form-check-label fw-semibold text-dark" htmlFor="is_rentable">
                  Rental item (can be rented)
                </label>
              </div>
              <div className="small text-muted">
                Tick if this item is rented out (e.g. a cloud gaming account). Prices are per
                duration below.
              </div>
            </div>

            {rentable && (
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="sb-form-group">
                    <label htmlFor="rental_price_3h" className="sb-label">
                      3 Hours Price (RM)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rental_price_3h"
                      id="rental_price_3h"
                      className="sb-input tabular"
                      placeholder="0.00"
                      defaultValue={product?.rentalPrice3h ?? ""}
                    />
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="sb-form-group">
                    <label htmlFor="rental_price_day" className="sb-label">
                      1 Day Price (RM)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rental_price_day"
                      id="rental_price_day"
                      className="sb-input tabular"
                      placeholder="0.00"
                      defaultValue={product?.rentalPriceDay ?? ""}
                    />
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="sb-form-group">
                    <label htmlFor="rental_price_week" className="sb-label">
                      1 Week Price (RM)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rental_price_week"
                      id="rental_price_week"
                      className="sb-input tabular"
                      placeholder="0.00"
                      defaultValue={product?.rentalPriceWeek ?? ""}
                    />
                  </div>
                </div>
                <div className="col-sm-6">
                  <div className="sb-form-group">
                    <label htmlFor="rental_price_month" className="sb-label">
                      1 Month Price (RM)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="rental_price_month"
                      id="rental_price_month"
                      className="sb-input tabular"
                      placeholder="0.00"
                      defaultValue={product?.rentalPriceMonth ?? ""}
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="sb-form-group mb-0">
                    <label htmlFor="account_expiry" className="sb-label">
                      Account Expiry Date
                    </label>
                    <input
                      type="date"
                      name="account_expiry"
                      id="account_expiry"
                      className="sb-input tabular"
                      defaultValue={product?.accountExpiryDate ?? ""}
                    />
                    <div className="sb-input-hint">
                      The date this account&apos;s subscription ends. The system warns near
                      expiry and blocks rentals after it lapses.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="row g-3">
              <div className="col-sm-6">
                <div className="sb-form-group">
                  <label htmlFor="buying_price" className="sb-label">
                    {rentable ? "Capital Cost / Account Cost (RM)" : "Wholesale Cost Price (RM)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="buying_price"
                    id="buying_price"
                    className="sb-input tabular"
                    placeholder="0.00"
                    defaultValue={product?.buyingPrice ?? ""}
                    onChange={(event) => setCost(Number(event.target.value) || 0)}
                  />
                  <div className="sb-input-hint">
                    {rentable
                      ? "What you paid for this account."
                      : "What you paid your supplier per unit."}
                  </div>
                </div>
              </div>

              {!rentable && (
                <div className="col-sm-6">
                  <div className="sb-form-group">
                    <label htmlFor="selling_price" className="sb-label">
                      Retail Selling Price (RM)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="selling_price"
                      id="selling_price"
                      className="sb-input tabular"
                      required
                      placeholder="0.00"
                      defaultValue={product?.sellingPrice ?? ""}
                      onChange={(event) => setSell(Number(event.target.value) || 0)}
                    />
                    <div className="sb-input-hint">What your retail customers pay.</div>
                  </div>
                </div>
              )}
            </div>

            {!rentable && (
              <div className="p-3 bg-light border rounded mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small fw-semibold text-dark">
                    Estimated Gross Profit Margin
                  </span>
                  <span className={badgeClass}>
                    {sell <= 0
                      ? "RM 0.00 / unit"
                      : `RM ${profit.toFixed(2)} (${marginPercent.toFixed(1)}%)`}
                  </span>
                </div>
                <div className="small text-muted">{detail}</div>
              </div>
            )}

            <div className="d-flex align-items-center justify-content-end gap-2 pt-2 border-top">
              <Link href="/products" className="sb-btn sb-btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="sb-btn sb-btn-primary">
                {mode === "edit" ? "Save Changes" : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
