"use server";

import { createList } from "./lists";
import { addGift } from "./gifts";
import { getListsByOwner } from "./lists";
import { extractGiftFromUrl } from "@/lib/ai/extract-gift";

export async function createGiftFromUrl(
  fingerprintId: string,
  url: string,
  listId?: string,
) {
  const extracted = await extractGiftFromUrl(url);

  let targetListId: string;
  let isNewList = false;
  
  if (listId) {
    // Use the provided list ID
    targetListId = listId;
  } else {
    // Auto-create logic: only when user has no lists
    const existingLists = await getListsByOwner(fingerprintId);
    
    if (existingLists.lists.length === 0) {
      // First time user - create new list
      const newList = await createList(fingerprintId, extracted.listName);
      targetListId = newList.id;
      isNewList = true;
    } else {
      // User has lists - find by name or use first list
      const existingList = existingLists.lists.find(
        (list) => list.name === extracted.listName
      );

      if (existingList) {
        targetListId = existingList.id;
      } else {
        // Use first list if name doesn't match
        targetListId = existingLists.lists[0].id;
      }
    }
  }

  const gift = await addGift(targetListId, fingerprintId, {
    name: extracted.name,
    url: extracted.url,
    price: extracted.price,
    priority: extracted.priority,
  });

  return {
    listId: targetListId,
    gift,
    isNewList,
  };
}

export async function createGiftsFromUrls(
  fingerprintId: string,
  urls: string[],
  listId?: string,
) {
  if (urls.length === 0) {
    throw new Error("No URLs provided");
  }

  let targetListId: string | null = null;
  let isNewList = false;
  const results: Array<{
    success: boolean;
    gift?: any;
    error?: string;
    url: string;
  }> = [];

  if (listId) {
    // Use the provided list ID
    targetListId = listId;
  } else {
    // Auto-create logic: only when user has no lists
    const existingLists = await getListsByOwner(fingerprintId);
    
    if (existingLists.lists.length === 0) {
      // First time user - extract first URL to get list name
      const firstExtracted = await extractGiftFromUrl(urls[0]);
      const newList = await createList(fingerprintId, firstExtracted.listName);
      targetListId = newList.id;
      isNewList = true;
    } else {
      // User has lists - use first list
      targetListId = existingLists.lists[0].id;
    }
  }

  for (const url of urls) {
    try {
      const extracted = await extractGiftFromUrl(url);

      const gift = await addGift(targetListId!, fingerprintId, {
        name: extracted.name,
        url: extracted.url,
        price: extracted.price,
        priority: extracted.priority,
      });

      results.push({
        success: true,
        gift,
        url,
      });
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        url,
      });
    }
  }

  const existingLists = await getListsByOwner(fingerprintId);
  const finalList = existingLists.lists.find((l) => l.id === targetListId);

  return {
    listId: targetListId!,
    listName: finalList?.name || "",
    results,
    isNewList,
  };
}
