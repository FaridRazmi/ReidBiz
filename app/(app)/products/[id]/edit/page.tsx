import { notFound } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { toNumber } from "@/lib/format";
import { toLocalInputValue } from "@/lib/rental";

export const metadata = { title: "Edit Product | ReidBiz" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({
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
    <ProductForm
      mode="edit"
      product={{
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        buyingPrice: toNumber(product.buyingPrice).toString(),
        sellingPrice: toNumber(product.sellingPrice).toString(),
        isRentable: product.isRentable,
        rentalPrice3h:
          product.rentalPrice3h == null ? "" : toNumber(product.rentalPrice3h).toString(),
        rentalPriceDay:
          product.rentalPriceDay == null ? "" : toNumber(product.rentalPriceDay).toString(),
        rentalPriceWeek:
          product.rentalPriceWeek == null ? "" : toNumber(product.rentalPriceWeek).toString(),
        rentalPriceMonth:
          product.rentalPriceMonth == null ? "" : toNumber(product.rentalPriceMonth).toString(),
        accountExpiryDate:
          product.accountExpiryDate == null
            ? ""
            : toLocalInputValue(product.accountExpiryDate).slice(0, 10),
      }}
    />
  );
}
