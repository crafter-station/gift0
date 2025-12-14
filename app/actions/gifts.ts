"use server";

import { db } from "@/lib/db";
import { gifts, giftLists } from "@/lib/db/schema";
import { getOrCreateUser } from "@/lib/db/user";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

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

export async function updateGift(
  giftId: string,
  fingerprintId: string,
  data: {
    name?: string;
    url?: string;
    price?: string;
    priority?: "high" | "medium" | "low";
    purchased?: boolean;
  },
) {
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

  const updateData: Partial<typeof gifts.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.purchased !== undefined) updateData.purchased = data.purchased;

  const [updated] = await db
    .update(gifts)
    .set(updateData)
    .where(eq(gifts.id, giftId))
    .returning();

  return updated;
}

export async function toggleGiftPurchased(giftId: string, fingerprintId: string) {
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

  const [updated] = await db
    .update(gifts)
    .set({ purchased: !gift.purchased, updatedAt: new Date() })
    .where(eq(gifts.id, giftId))
    .returning();

  return updated;
}

export async function toggleGiftPurchasedPublic(giftId: string, shareToken: string) {
  const list = await db.query.giftLists.findFirst({
    where: eq(giftLists.shareToken, shareToken),
  });

  if (!list) {
    throw new Error("List not found");
  }

  const gift = await db.query.gifts.findFirst({
    where: eq(gifts.id, giftId),
  });

  if (!gift || gift.listId !== list.id) {
    throw new Error("Gift not found in this list");
  }

  const [updated] = await db
    .update(gifts)
    .set({ purchased: !gift.purchased, updatedAt: new Date() })
    .where(eq(gifts.id, giftId))
    .returning();

  return updated;
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

// Create a demo gift with list for onboarding (no Firecrawl)
export async function createDemoGift(
  fingerprintId: string,
  data: {
    name: string;
    url: string;
    price: string;
    priority: "high" | "medium" | "low";
  },
) {
  const { user } = await getOrCreateUser(fingerprintId);
  const shareToken = nanoid(12);

  // Create new list
  const [list] = await db
    .insert(giftLists)
    .values({
      name: "My Wishlist",
      ownerId: user.id,
      shareToken,
    })
    .returning();

  // Add gift directly
  const [gift] = await db
    .insert(gifts)
    .values({
      listId: list.id,
      name: data.name,
      url: data.url,
      price: data.price,
      priority: data.priority,
    })
    .returning();

  return { list, gift };
}

