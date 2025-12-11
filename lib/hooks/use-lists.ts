"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { getFingerprint } from "@/lib/fingerprint";
import {
  createList,
  getListsByOwner,
  deleteList,
  updateListName,
} from "@/app/actions/lists";
import { addGift, deleteGift, updateGift, toggleGiftPurchased } from "@/app/actions/gifts";
import { createGiftFromUrl, createGiftsFromUrls } from "@/app/actions/ai-gift";
import type { GiftListWithGifts, Gift } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const LISTS_QUERY_KEY = "gift-lists";

export function useLists() {
  const queryClient = useQueryClient();

  const { data: fingerprintId } = useQuery({
    queryKey: ["fingerprint"],
    queryFn: getFingerprint,
    staleTime: Infinity,
  });

  const { data: listsData, isLoading } = useQuery({
    queryKey: [LISTS_QUERY_KEY, fingerprintId],
    queryFn: async () => {
      if (!fingerprintId) return { lists: [], isNewUser: false };
      const result = await getListsByOwner(fingerprintId);
      return {
        lists: result.lists as GiftListWithGifts[],
        isNewUser: result.isNewUser,
      };
    },
    enabled: !!fingerprintId,
  });

  const lists = listsData?.lists || [];

  useEffect(() => {
    if (listsData?.isNewUser) {
      toast.success("Welcome! Your anonymous account has been created.", {
        description: "You can now create and manage your gift lists.",
      });
    }
  }, [listsData?.isNewUser]);

  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await createList(fingerprintId, name);
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      const tempId = nanoid();
      const optimisticList: GiftListWithGifts = {
        id: tempId,
        name,
        ownerId: "",
        shareToken: nanoid(12),
        createdAt: new Date(),
        updatedAt: new Date(),
        gifts: [],
        owner: {
          id: "",
          fingerprintId: fingerprintId || "",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old ? [optimisticList, ...old.lists] : [optimisticList],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData, tempId };
    },
    onError: (err, name, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: async (newList, name, context) => {
      const result = await getListsByOwner(fingerprintId!);
      const createdList = result.lists.find(
        (l) => l.shareToken === newList.shareToken,
      ) as GiftListWithGifts;

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => {
          if (!old) return { lists: [createdList], isNewUser: false };
          const filtered = old.lists.filter((l) => l.id !== context?.tempId);
          return { lists: [createdList, ...filtered], isNewUser: old.isNewUser };
        },
      );
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async (listId: string) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      await deleteList(listId, fingerprintId);
    },
    onMutate: async (listId) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old ? old.lists.filter((list) => list.id !== listId) : [],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData };
    },
    onError: (err, listId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const addGiftMutation = useMutation({
    mutationFn: async ({
      listId,
      data,
    }: {
      listId: string;
      data: {
        name: string;
        url: string;
        price?: string;
        priority: "high" | "medium" | "low";
      };
    }) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await addGift(listId, fingerprintId, data);
    },
    onMutate: async ({ listId, data }) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      const optimisticGift: Gift = {
        id: nanoid(),
        listId,
        name: data.name,
        url: data.url,
        price: data.price || null,
        priority: data.priority,
        purchased: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old
            ? old.lists.map((list) =>
                list.id === listId
                  ? { ...list, gifts: [optimisticGift, ...(list.gifts || [])] }
                  : list,
              )
            : [],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const updateListNameMutation = useMutation({
    mutationFn: async ({ listId, name }: { listId: string; name: string }) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await updateListName(listId, fingerprintId, name);
    },
    onMutate: async ({ listId, name }) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old
            ? old.lists.map((list) =>
                list.id === listId ? { ...list, name } : list,
              )
            : [],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const updateGiftMutation = useMutation({
    mutationFn: async ({
      giftId,
      data,
    }: {
      giftId: string;
      data: {
        name?: string;
        url?: string;
        price?: string;
        priority?: "high" | "medium" | "low";
        purchased?: boolean;
      };
    }) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await updateGift(giftId, fingerprintId, data);
    },
    onMutate: async ({ giftId, data }) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old
            ? old.lists.map((list) => ({
                ...list,
                gifts: (list.gifts || []).map((gift) =>
                  gift.id === giftId ? { ...gift, ...data, updatedAt: new Date() } : gift,
                ),
              }))
            : [],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const toggleGiftPurchasedMutation = useMutation({
    mutationFn: async (giftId: string) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await toggleGiftPurchased(giftId, fingerprintId);
    },
    onMutate: async (giftId) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old
            ? old.lists.map((list) => ({
                ...list,
                gifts: (list.gifts || []).map((gift) =>
                  gift.id === giftId ? { ...gift, purchased: !gift.purchased } : gift,
                ),
              }))
            : [],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData };
    },
    onError: (err, giftId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const deleteGiftMutation = useMutation({
    mutationFn: async (giftId: string) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      await deleteGift(giftId, fingerprintId);
    },
    onMutate: async (giftId) => {
      await queryClient.cancelQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });

      const previousData = queryClient.getQueryData<{
        lists: GiftListWithGifts[];
        isNewUser: boolean;
      }>([LISTS_QUERY_KEY, fingerprintId]);

      queryClient.setQueryData<{ lists: GiftListWithGifts[]; isNewUser: boolean }>(
        [LISTS_QUERY_KEY, fingerprintId],
        (old) => ({
          lists: old
            ? old.lists.map((list) => ({
                ...list,
                gifts: (list.gifts || []).filter((gift) => gift.id !== giftId),
              }))
            : [],
          isNewUser: old?.isNewUser || false,
        }),
      );

      return { previousData };
    },
    onError: (err, giftId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          [LISTS_QUERY_KEY, fingerprintId],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const createGiftFromUrlMutation = useMutation({
    mutationFn: async ({ url, listId, forceNewList }: { url: string; listId?: string; forceNewList?: boolean }) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await createGiftFromUrl(fingerprintId, url, listId, forceNewList);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  const createGiftsFromUrlsMutation = useMutation({
    mutationFn: async ({ urls, listId, forceNewList }: { urls: string[]; listId?: string; forceNewList?: boolean }) => {
      if (!fingerprintId) throw new Error("No fingerprint");
      return await createGiftsFromUrls(fingerprintId, urls, listId, forceNewList);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LISTS_QUERY_KEY, fingerprintId] });
    },
  });

  return {
    lists,
    isLoading,
    fingerprintId,
    createList: createListMutation.mutate,
    deleteList: deleteListMutation.mutate,
    updateListName: updateListNameMutation.mutate,
    addGift: addGiftMutation.mutate,
    updateGift: updateGiftMutation.mutate,
    toggleGiftPurchased: toggleGiftPurchasedMutation.mutate,
    deleteGift: deleteGiftMutation.mutate,
    createGiftFromUrl: (params: { url: string; listId?: string; forceNewList?: boolean }, options?: any) => createGiftFromUrlMutation.mutate(params, options),
    createGiftsFromUrls: (params: { urls: string[]; listId?: string; forceNewList?: boolean }, options?: any) => createGiftsFromUrlsMutation.mutate(params, options),
    isCreatingList: createListMutation.isPending,
    isDeletingList: deleteListMutation.isPending,
    isUpdatingListName: updateListNameMutation.isPending,
    isAddingGift: addGiftMutation.isPending,
    isUpdatingGift: updateGiftMutation.isPending,
    isTogglingGiftPurchased: toggleGiftPurchasedMutation.isPending,
    isDeletingGift: deleteGiftMutation.isPending,
    isCreatingGiftFromUrl: createGiftFromUrlMutation.isPending,
    isCreatingGiftsFromUrls: createGiftsFromUrlsMutation.isPending,
  };
}

