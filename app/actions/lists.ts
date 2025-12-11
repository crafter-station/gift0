"use server";

import { db } from "@/lib/db";
import { giftLists, gifts } from "@/lib/db/schema";
import { getOrCreateUser } from "@/lib/db/user";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { desc } from "drizzle-orm";

export async function createList(fingerprintId: string, name: string) {
  const { user } = await getOrCreateUser(fingerprintId);
  const shareToken = nanoid(12);

  const [list] = await db
    .insert(giftLists)
    .values({
      name,
      ownerId: user.id,
      shareToken,
    })
    .returning();

  return list;
}

export async function getListsByOwner(fingerprintId: string) {
  const { user, isNew } = await getOrCreateUser(fingerprintId);

  const lists = await db.query.giftLists.findMany({
    where: eq(giftLists.ownerId, user.id),
    with: {
      gifts: true,
    },
  });

  lists.forEach((list) => {
    list.gifts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  });

  lists.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return { lists, isNewUser: isNew };
}

export async function getListById(listId: string, fingerprintId?: string) {
  const list = await db.query.giftLists.findFirst({
    where: eq(giftLists.id, listId),
    with: {
      owner: true,
      gifts: true,
    },
  });

  if (list && list.gifts) {
    list.gifts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  if (!list) return null;

  if (fingerprintId) {
    const { user } = await getOrCreateUser(fingerprintId);
    return {
      ...list,
      canEdit: list.ownerId === user.id,
    };
  }

  return {
    ...list,
    canEdit: false,
  };
}

export async function getListByShareToken(shareToken: string) {
  const list = await db.query.giftLists.findFirst({
    where: eq(giftLists.shareToken, shareToken),
    with: {
      owner: true,
      gifts: {
        orderBy: (gifts, { desc }) => [desc(gifts.createdAt)],
      },
    },
  });

  return list;
}

export async function deleteList(listId: string, fingerprintId: string) {
  const { user } = await getOrCreateUser(fingerprintId);

  const list = await db.query.giftLists.findFirst({
    where: eq(giftLists.id, listId),
  });

  if (!list || list.ownerId !== user.id) {
    throw new Error("Unauthorized");
  }

  await db.delete(giftLists).where(eq(giftLists.id, listId));
}

export async function updateListName(
  listId: string,
  fingerprintId: string,
  name: string,
) {
  const { user } = await getOrCreateUser(fingerprintId);

  const list = await db.query.giftLists.findFirst({
    where: eq(giftLists.id, listId),
  });

  if (!list || list.ownerId !== user.id) {
    throw new Error("Unauthorized");
  }

  const [updated] = await db
    .update(giftLists)
    .set({ name, updatedAt: new Date() })
    .where(eq(giftLists.id, listId))
    .returning();

  return updated;
}

