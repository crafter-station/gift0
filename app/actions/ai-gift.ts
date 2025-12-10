"use server";

import { createList } from "./lists";
import { addGift } from "./gifts";
import { getListsByOwner } from "./lists";
import { extractGiftFromUrl } from "@/lib/ai/extract-gift";

export async function createGiftFromUrl(
  fingerprintId: string,
  url: string,
) {
  const extracted = await extractGiftFromUrl(url);

  let listId: string;
  
  const existingLists = await getListsByOwner(fingerprintId);
  
  const existingList = existingLists.lists.find(
    (list) => list.name === extracted.listName
  );

  if (existingList) {
    listId = existingList.id;
  } else {
    const newList = await createList(fingerprintId, extracted.listName);
    listId = newList.id;
  }

  const gift = await addGift(listId, fingerprintId, {
    name: extracted.name,
    url: extracted.url,
    price: extracted.price,
    priority: extracted.priority,
  });

  return {
    listId,
    gift,
    isNewList: !existingList,
  };
}

export async function createGiftsFromUrls(
  fingerprintId: string,
  urls: string[],
) {
  if (urls.length === 0) {
    throw new Error("No URLs provided");
  }

  const existingLists = await getListsByOwner(fingerprintId);
  
  let listId: string | null = null;
  let listName: string | null = null;
  const results: Array<{
    success: boolean;
    gift?: any;
    error?: string;
    url: string;
  }> = [];

  for (const url of urls) {
    try {
      const extracted = await extractGiftFromUrl(url);
      
      if (!listName) {
        listName = extracted.listName;
        const existingList = existingLists.lists.find(
          (list) => list.name === listName
        );

        if (existingList) {
          listId = existingList.id;
        } else {
          const newList = await createList(fingerprintId, listName);
          listId = newList.id;
        }
      }

      const gift = await addGift(listId!, fingerprintId, {
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

  return {
    listId: listId!,
    listName: listName!,
    results,
    isNewList: !existingLists.lists.find((l) => l.name === listName),
  };
}
