"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function revalidateApp() {
  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/sales/history");
  revalidatePath("/rentals");
  revalidatePath("/reports/monthly");
}

function parseMoney(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100) / 100;
}

function parsePrice(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100) / 100;
}

function parseQuantity(formData: FormData, key: string): number {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return 0;
  const value = Math.trunc(Number(raw));
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function parseExpiry(formData: FormData): Date | null {
  const raw = String(formData.get("account_expiry") ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rentalFields(formData: FormData) {
  const isRentable = formData.get("is_rentable") === "on";
  return {
    isRentable,
    accountExpiryDate: isRentable ? parseExpiry(formData) : null,
    rentalPrice3h: isRentable ? parsePrice(formData, "rental_price_3h") : null,
    rentalPriceDay: isRentable ? parsePrice(formData, "rental_price_day") : null,
    rentalPriceWeek: isRentable ? parsePrice(formData, "rental_price_week") : null,
    rentalPriceMonth: isRentable ? parsePrice(formData, "rental_price_month") : null,
  };
}

function productFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    quantity: parseQuantity(formData, "quantity"),
    buyingPrice: parseMoney(formData, "buying_price"),
    sellingPrice: parseMoney(formData, "selling_price"),
    ...rentalFields(formData),
  };
}

export async function createProduct(formData: FormData) {
  const user = await getSessionUser();
  const fields = productFields(formData);
  if (!fields.name) redirect("/products/new?error=name");

  await prisma.product.create({
    data: {
      userId: user.id,
      ...fields,
    },
  });

  revalidateApp();
  redirect("/products");
}

export async function updateProduct(formData: FormData) {
  const user = await getSessionUser();

  const id = Number(formData.get("id"));
  const fields = productFields(formData);
  if (!id) redirect("/products");
  if (!fields.name) redirect(`/products/${id}/edit?error=name`);

  const product = await prisma.product.findFirst({ where: { id, userId: user.id } });
  if (!product) redirect("/products");

  await prisma.product.update({
    where: { id },
    data: fields,
  });

  revalidateApp();
  redirect("/products");
}

export async function deleteProduct(formData: FormData) {
  const user = await getSessionUser();

  const id = Number(formData.get("id"));
  if (!id) return;

  const product = await prisma.product.findFirst({ where: { id, userId: user.id } });
  if (!product) redirect("/products?error=missing");

  const [saleRecords, rentalRecords] = await Promise.all([
    prisma.sale.count({ where: { productId: id } }),
    prisma.rental.count({ where: { productId: id } }),
  ]);

  if (saleRecords > 0 || rentalRecords > 0) {
    redirect(`/products/${id}/delete?error=in-use&sales=${saleRecords}&rentals=${rentalRecords}`);
  }

  await prisma.product.delete({ where: { id } });

  revalidateApp();
  redirect("/products");
}
