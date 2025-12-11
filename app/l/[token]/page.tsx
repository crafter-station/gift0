"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { use } from "react"
import { notFound } from "next/navigation"
import { ExternalLink, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getListByShareToken } from "@/app/actions/lists"
import { toggleGiftPurchasedPublic } from "@/app/actions/gifts"
import { toast } from "sonner"
import type { GiftListWithOwner } from "@/lib/db/schema"
import { getPriorityLabel } from "@/lib/utils"

function SharedListContent({ token }: { token: string }) {
  const queryClient = useQueryClient()

  const { data: list, isLoading } = useQuery({
    queryKey: ["shared-list", token],
    queryFn: async () => {
      const result = await getListByShareToken(token)
      if (!result) throw new Error("List not found")
      return result
    },
    retry: false,
  })

  const togglePurchasedMutation = useMutation({
    mutationFn: async (giftId: string) => {
      return await toggleGiftPurchasedPublic(giftId, token)
    },
    onMutate: async (giftId) => {
      await queryClient.cancelQueries({ queryKey: ["shared-list", token] })

      const previousData = queryClient.getQueryData<GiftListWithOwner>(["shared-list", token])

      queryClient.setQueryData<GiftListWithOwner>(["shared-list", token], (old) => {
        if (!old) return old
        return {
          ...old,
          gifts: (old.gifts || []).map((gift) =>
            gift.id === giftId ? { ...gift, purchased: !gift.purchased } : gift,
          ),
        }
      })

      return { previousData }
    },
    onError: (err, giftId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["shared-list", token], context.previousData)
      }
      toast.error("Failed to update gift", {
        description: "Please try again",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-list", token] })
    },
  })

  if (isLoading) {
    return (
      <main className="min-h-screen p-3 sm:p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!list) {
    notFound()
  }

  return (
    <main className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">{list.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {list.gifts?.length || 0} {list.gifts?.length === 1 ? "gift" : "gifts"}
          </p>
        </div>

        {list.gifts && list.gifts.length > 0 ? (
          <div className="space-y-0.5">
            {list.gifts.map((gift) => (
              <div
                key={gift.id}
                className={`bg-card border border-border rounded-md p-2.5 sm:p-3 hover:bg-accent transition-colors touch-manipulation ${
                  gift.purchased ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <button
                    onClick={() => togglePurchasedMutation.mutate(gift.id)}
                    disabled={togglePurchasedMutation.isPending}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors touch-manipulation ${
                      gift.purchased
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-border hover:border-primary/50"
                    }`}
                    title={gift.purchased ? "Mark as not purchased" : "Mark as purchased"}
                  >
                    {gift.purchased && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs sm:text-sm font-medium text-balance leading-tight ${
                        gift.purchased ? "line-through text-muted-foreground" : ""
                      }`}>
                        {gift.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {gift.price && (
                        <span className={`text-xs text-muted-foreground ${
                          gift.purchased ? "line-through" : ""
                        }`}>
                          {gift.price}
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 border rounded ${
                          gift.purchased
                            ? "border-muted-foreground/50 text-muted-foreground/50"
                            : gift.priority === "high"
                              ? "border-foreground text-foreground"
                              : gift.priority === "medium"
                                ? "border-muted-foreground text-muted-foreground"
                                : "border-border text-muted-foreground"
                        }`}
                      >
                        {getPriorityLabel(gift.priority)}
                      </span>
                      {gift.purchased && (
                        <span className="text-xs text-muted-foreground/70">Purchased</span>
                      )}
                    </div>
                  </div>
                  <a
                    href={gift.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 sm:gap-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 sm:h-7 px-2 sm:px-2 shrink-0 touch-manipulation"
                  >
                    <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">View</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-md p-6 sm:p-8 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">No gifts on this list yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}

export default function SharedListPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  return <SharedListContent token={token} />
}
