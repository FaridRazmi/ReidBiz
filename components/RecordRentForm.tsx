"use client";

import { useActionState, useState } from "react";
import { createRental, type RentState } from "@/app/actions/rentals";
import {
  DURATION_LABELS,
  DURATION_TYPES,
  rentalEndAt,
  type DurationType,
} from "@/lib/rental";

const initialState: RentState = {};

function formatDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function RecordRentForm({
  product,
  defaultStartAt,
}: {
  product: {
    id: number;
    name: string;
    prices: Record<DurationType, number>;
    available: boolean;
    slots: number;
    activeCount: number;
  };
  defaultStartAt: string;
}) {
  const [state, formAction, pending] = useActionState(createRental, initialState);
  const [duration, setDuration] = useState<DurationType>("3h");
  const [start, setStart] = useState(defaultStartAt);
  const [priceInput, setPriceInput] = useState(product.prices["3h"].toFixed(2));

  const tierPrice = product.prices[duration];
  const price = Number(priceInput);
  const validPrice = Number.isFinite(price) && price >= 0;
  const discount = validPrice ? tierPrice - price : 0;

  const endAt = start ? rentalEndAt(new Date(start), duration) : null;
  const validEnd = endAt && !Number.isNaN(endAt.getTime()) ? endAt : null;

  function changeDuration(type: DurationType) {
    setDuration(type);
    setPriceInput(product.prices[type].toFixed(2));
  }

  return (
    <>
      {state.error && (
        <div className="sb-alert sb-alert-danger mb-4 p-2 small" role="alert">
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction}>
        <input type="hidden" name="id" value={product.id} />

        <div className="sb-form-group">
          <label className="sb-label">Rental Duration</label>
          <div className="row g-2">
            {DURATION_TYPES.map((type) => (
              <div className="col-6" key={type}>
                <label
                  className="sb-card p-3 d-block mb-0"
                  style={{
                    cursor: product.prices[type] > 0 ? "pointer" : "not-allowed",
                    opacity: product.prices[type] > 0 ? 1 : 0.55,
                    borderColor:
                      duration === type ? "var(--sb-border-focus)" : "var(--sb-border)",
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="radio"
                      name="duration_type"
                      value={type}
                      checked={duration === type}
                      disabled={product.prices[type] <= 0}
                      onChange={() => changeDuration(type)}
                      className="form-check-input mt-0"
                    />
                    <div>
                      <div className="fw-semibold text-dark">{DURATION_LABELS[type]}</div>
                      <div className="small text-muted tabular">
                        {product.prices[type] > 0
                          ? `RM ${product.prices[type].toFixed(2)}`
                          : "Not priced"}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="row g-3">
          <div className="col-sm-6">
            <div className="sb-form-group">
              <label htmlFor="start_at" className="sb-label">
                Start Date &amp; Time
              </label>
              <input
                type="datetime-local"
                name="start_at"
                id="start_at"
                className="sb-input tabular"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="col-sm-6">
            <div className="sb-form-group">
              <label htmlFor="price" className="sb-label">
                Rental Price (RM)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="price"
                id="price"
                className="sb-input tabular"
                value={priceInput}
                onChange={(event) => setPriceInput(event.target.value)}
                required
              />
              <div className="sb-input-hint">
                Auto-filled by duration. Change it to give a promo (e.g. 3.00).
              </div>
            </div>
          </div>
        </div>

        <div className="sb-form-group">
          <label htmlFor="promo_note" className="sb-label">
            Promo Note (optional)
          </label>
          <input
            type="text"
            name="promo_note"
            id="promo_note"
            className="sb-input"
            placeholder="e.g. Promo RM3 per day"
          />
        </div>

        <div className="sb-form-group">
          <label htmlFor="customer_name" className="sb-label">
            Customer Name
          </label>
          <input
            type="text"
            name="customer_name"
            id="customer_name"
            className="sb-input"
            required
            placeholder="e.g. Ahmad"
          />
        </div>

        <div className="sb-form-group">
          <label htmlFor="customer_phone" className="sb-label">
            Phone Number (optional)
          </label>
          <input
            type="text"
            name="customer_phone"
            id="customer_phone"
            className="sb-input"
            placeholder="e.g. 0123456789"
          />
        </div>

        <div className="p-3 bg-light border rounded mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <span className="small fw-semibold text-dark">Total Payment</span>
            <span className="fs-4 fw-bold text-success tabular">
              RM {(validPrice ? price : tierPrice).toFixed(2)}
            </span>
          </div>
          {discount > 0 && (
            <div className="small text-muted mt-1">
              Original price <span style={{ textDecoration: "line-through" }}>RM {tierPrice.toFixed(2)}</span>{" "}
              · <span className="text-success fw-semibold">promo saves RM {discount.toFixed(2)}</span>
            </div>
          )}
          <div className="small text-muted mt-1">
            Ends: {validEnd ? formatDateTime(validEnd) : "-"}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || tierPrice <= 0}
          className="sb-btn sb-btn-primary w-100 sb-btn-lg"
        >
          {tierPrice <= 0
            ? "Set a price for this duration first"
            : pending
              ? "Processing..."
              : "Start Rental"}
        </button>
      </form>
    </>
  );
}
