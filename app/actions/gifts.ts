"use server";

import { db } from "@/lib/db";
import { gifts, giftLists } from "@/lib/db/schema";
import { getOrCreateUser } from "@/lib/db/user";
import { eq } from "drizzle-orm";

export async function addGift(
  listId: string,
  fingerprintId: string,
  data: {
    name: string;
    url: string;
    price?: string;
    priority: "high" | "medium" | "low";
  },
) {
  const { user } = await getOrCreateUser(fingerprintId);

  const list = await db.query.giftLists.findFirst({
    where: eq(giftLists.id, listId),
  });

  if (!list || list.ownerId !== user.id) {
    throw new Error("Unauthorized");
  }

  const [gift] = await db
    .insert(gifts)
    .values({
      listId,
      name: data.name,
      url: data.url,
      price: data.price,
      priority: data.priority,
    })
    .returning();

  return gift;
}

export async function deleteGift(giftId: string, fingerprintId: string) {
  const { user } = await getOrCreateUser(fingerprintId);

  const gift = await db.query.gifts.findFirst({
    where: eq(gifts.id, giftId),
    with: {
      list: true,
    },
  });

  if (!gift || gift.list.ownerId !== user.id) {
    throw new Error("Unauthorized");
  }

  await db.delete(gifts).where(eq(gifts.id, giftId));
}

