"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { recordSale } from "@/app/actions/sales";
import { rm } from "@/lib/format";

export default function RecordSaleForm({
  product,
}: {
  product: { id: number; name: string; sellingPrice: number; quantity: number };
}) {
  const [state, formAction, pending] = useActionState(recordSale, {});
  const maxStock = Math.max(product.quantity, 0);
  const [quantity, setQuantity] = useState(maxStock > 0 ? 1 : 0);

  const total = quantity * product.sellingPrice;
  const remaining = Math.max(maxStock - quantity, 0);

  function updateQuantity(value: number) {
    let next = value;
    if (next < 1) next = 1;
    if (next > maxStock) next = maxStock;
    setQuantity(next);
  }

  return (
    <>
      <div className="p-3 bg-light border rounded mb-4">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div className="fw-bold text-dark fs-5">{product.name}</div>
            <span className="text-muted small">Item ID #{product.id}</span>
          </div>
          <div className="text-end">
            <span className="text-muted small d-block">Unit Price</span>
            <strong className="tabular fs-5 text-dark">
              {rm(product.sellingPrice, { decimals: 2 })}
            </strong>
          </div>
        </div>
      </div>

      {state.error && (
        <div className="sb-alert sb-alert-danger mb-3 p-2 small">
          <span>{state.error}</span>
        </div>
      )}

      {maxStock === 0 ? (
        <div className="d-flex flex-column gap-3">
          <div className="sb-alert sb-alert-warning mb-0">
            <span>This item has 0 units in stock, so there is nothing to sell.</span>
          </div>
          <Link href={`/products/${product.id}/edit`} className="sb-btn sb-btn-primary w-100">
            Update stock
          </Link>
          <Link href="/products" className="sb-btn sb-btn-secondary w-100 text-center">
            Back to inventory
          </Link>
        </div>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="id" value={product.id} />

          <div className="sb-form-group">
            <label htmlFor="quantity_sold" className="sb-label">
              Quantity to Sell
            </label>
            <div className="input-group mb-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => updateQuantity(quantity - 1)}
                style={{ minWidth: 44 }}
              >
                −
              </button>
              <input
                type="number"
                name="quantity_sold"
                id="quantity_sold"
                className="sb-input text-center tabular fw-bold fs-5"
                required
                min="1"
                max={maxStock}
                value={quantity}
                onChange={(event) => updateQuantity(parseInt(event.target.value, 10) || 1)}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => updateQuantity(quantity + 1)}
                style={{ minWidth: 44 }}
              >
                +
              </button>
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="sb-btn sb-btn-secondary sb-btn-sm py-1 flex-grow-1"
                onClick={() => updateQuantity(1)}
              >
                1
              </button>
              {maxStock >= 2 && (
                <button
                  type="button"
                  className="sb-btn sb-btn-secondary sb-btn-sm py-1 flex-grow-1"
                  onClick={() => updateQuantity(2)}
                >
                  2
                </button>
              )}
              {maxStock >= 5 && (
                <button
                  type="button"
                  className="sb-btn sb-btn-secondary sb-btn-sm py-1 flex-grow-1"
                  onClick={() => updateQuantity(5)}
                >
                  5
                </button>
              )}
              {maxStock >= 10 && (
                <button
                  type="button"
                  className="sb-btn sb-btn-secondary sb-btn-sm py-1 flex-grow-1"
                  onClick={() => updateQuantity(10)}
                >
                  10
                </button>
              )}
              <button
                type="button"
                className="sb-btn sb-btn-secondary sb-btn-sm py-1 flex-grow-1"
                onClick={() => updateQuantity(maxStock)}
              >
                All ({maxStock})
              </button>
            </div>
          </div>

          <div className="p-3 border rounded mb-4" style={{ background: "var(--sb-surface-muted)" }}>
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small">Total Transaction Bill</span>
              <div className="fs-4 fw-bold text-success tabular" id="displayTotal">
                RM {total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center small text-muted">
              <span>Remaining stock after sale:</span>
              <strong className="tabular" id="displayRemaining">
                {remaining} units
              </strong>
            </div>
          </div>

          <div className="d-flex flex-column gap-2">
            <button
              type="submit"
              className="sb-btn sb-btn-primary sb-btn-lg w-100"
              id="submitBtn"
              disabled={pending}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span id="btnText">Confirm Sale &amp; Deduct Stock</span>
            </button>
            <Link href="/products" className="sb-btn sb-btn-secondary text-center">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </>
  );
}
