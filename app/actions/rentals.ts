"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { accountExpiryStatus, isDurationType, priceForProduct, rentalEndAt } from "@/lib/rental";

export type RentState = { error?: string };

function revalidateAll() {
  revalidatePath("/rentals");
  revalidatePath("/products");
  revalidatePath("/dashboard");
  revalidatePath("/reports/monthly");
}

export async function createRental(
  _prev: RentState,
  formData: FormData,
): Promise<RentState> {
  const user = await getSessionUser();

  const id = Number(formData.get("id"));
  const product = await prisma.product.findFirst({ where: { id, userId: user.id } });
  if (!product || !product.isRentable) redirect("/products");

  const durationType = String(formData.get("duration_type") ?? "");
  if (!isDurationType(durationType)) {
    return { error: "Choose a valid rental duration." };
  }

  const customerName = String(formData.get("customer_name") ?? "").trim();
  if (!customerName) {
    return { error: "Customer name is required." };
  }
  const customerPhone = String(formData.get("customer_phone") ?? "").trim();

  const startRaw = String(formData.get("start_at") ?? "").trim();
  const parsedStart = startRaw ? new Date(startRaw) : new Date();
  const startAt = Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart;
  const endAt = rentalEndAt(startAt, durationType);

  if (endAt.getTime() <= Date.now()) {
    return {
      error: "That rental would already be over. Check the start date and the duration.",
    };
  }

  const expiryAtEnd = accountExpiryStatus(product.accountExpiryDate, endAt);
  if (expiryAtEnd === "expired") {
    return {
      error:
        "The account expires before this rental ends. Pick a shorter duration or update the expiry date.",
    };
  }

  const slots = product.quantity;
  if (slots <= 0) {
    return {
      error: "This item has 0 slots. Set Units in Stock to the number of accounts you can rent out.",
    };
  }

  const conflicts = await prisma.rental.count({
    where: {
      productId: product.id,
      status: { in: ["active", "completed"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (conflicts >= slots) {
    return {
      error: "All slots are taken for this period. Pick a different time.",
    };
  }

  const tierPrice = priceForProduct(product, durationType);
  if (tierPrice <= 0) {
    return {
      error: "This duration has no price set. Update the item pricing before renting it out.",
    };
  }

  const priceRaw = String(formData.get("price") ?? "").trim();
  const parsedPrice = priceRaw ? Number(priceRaw) : tierPrice;
  const price =
    Number.isFinite(parsedPrice) && parsedPrice >= 0 ? Math.round(parsedPrice * 100) / 100 : tierPrice;
  const promoNote = String(formData.get("promo_note") ?? "").trim();
  const isPromo = price < tierPrice;

  await prisma.rental.create({
    data: {
      userId: user.id,
      productId: product.id,
      customerName,
      customerPhone,
      durationType,
      startAt,
      endAt,
      price,
      originalPrice: tierPrice,
      isPromo,
      promoNote,
      status: "active",
    },
  });

  revalidateAll();
  redirect("/rentals");
}

export async function endRental(formData: FormData) {
  const user = await getSessionUser();

  const id = Number(formData.get("id"));
  const rental = await prisma.rental.findFirst({ where: { id, userId: user.id } });
  if (!rental) redirect("/rentals?error=missing");

  if (rental.status !== "active" || rental.endAt.getTime() <= Date.now()) {
    if (rental.status === "active") {
      await prisma.rental.update({ where: { id }, data: { status: "completed" } });
      revalidateAll();
    }
    redirect("/rentals");
  }

  const endedAt = new Date();
  await prisma.rental.update({
    where: { id },
    data: {
      status: "completed",
      endAt: endedAt < rental.endAt ? endedAt : rental.endAt,
    },
  });

  revalidateAll();
  redirect("/rentals");
}

export async function deleteRental(formData: FormData) {
  const user = await getSessionUser();

  const id = Number(formData.get("id"));
  const rental = await prisma.rental.findFirst({ where: { id, userId: user.id } });
  if (!rental) redirect("/rentals?error=missing");

  if (rental.status === "active" && rental.endAt.getTime() > Date.now()) {
    redirect("/rentals?error=active");
  }

  await prisma.rental.delete({ where: { id } });

  revalidateAll();
  redirect("/rentals");
}
