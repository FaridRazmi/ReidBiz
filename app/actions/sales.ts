"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export type SaleState = { error?: string };

export async function recordSale(
  _prev: SaleState,
  formData: FormData,
): Promise<SaleState> {
  const user = await getSessionUser();

  const id = Number(formData.get("id"));
  const product = await prisma.product.findFirst({ where: { id, userId: user.id } });
  if (!product) redirect("/products");

  const quantitySold = Math.trunc(Number(formData.get("quantity_sold") ?? 0) || 0);

  if (!(quantitySold > 0) || quantitySold > product.quantity) {
    return {
      error: `Invalid quantity. You only have ${product.quantity} units in stock.`,
    };
  }

  const unitPrice = Math.round(Number(product.sellingPrice) * 100) / 100;
  const totalPrice = Math.round(unitPrice * quantitySold * 100) / 100;

  const recorded = await prisma.$transaction(async (tx) => {
    const stock = await tx.product.updateMany({
      where: { id: product.id, userId: user.id, quantity: { gte: quantitySold } },
      data: { quantity: { decrement: quantitySold } },
    });
    if (stock.count === 0) return false;

    await tx.sale.create({
      data: {
        userId: user.id,
        productId: product.id,
        quantitySold,
        totalPrice,
      },
    });
    return true;
  });

  if (!recorded) {
    return {
      error: "Stock changed while this sale was being recorded. Reload and check the current quantity.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/products");
  revalidatePath("/sales/history");
  revalidatePath("/reports/monthly");
  redirect("/sales/history");
}
