"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { ExternalLink, Check, Heart, Gift, Loader2 } from "lucide-react"
import { getListByShareToken } from "@/app/actions/lists"
import { toggleGiftPurchasedPublic } from "@/app/actions/gifts"
import { toast } from "sonner"
import type { GiftListWithOwner } from "@/lib/db/schema"
import { getPriorityLabel } from "@/lib/utils"
import { CrafterStationLogo } from "@/components/logos/crafter-station"
import Link from "next/link"

export default function SharedListContent({ token }: { token: string }) {
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
      <main className="min-h-screen p-4 sm:p-6 md:p-8 bg-background">
        <div className="max-w-3xl mx-auto">
          <div className="h-[60vh] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Loading gift list...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!list) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto border-x border-edge min-h-screen">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="mb-8 pb-6 border-b border-edge">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">{list.name}</h1>
          <p className="text-sm text-muted-foreground">
            {list.gifts?.length || 0} {list.gifts?.length === 1 ? "gift" : "gifts"}
            {list.gifts && list.gifts.length > 0 && (
              <span className="ml-2">
                • {list.gifts.filter(g => g.purchased).length} purchased
              </span>
            )}
          </p>
        </div>

        {list.gifts && list.gifts.length > 0 ? (
          <div className="space-y-3">
            {list.gifts.map((gift, index) => (
              <a
                key={gift.id}
                href={gift.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex items-start gap-4 bg-card border border-border/50 rounded-xl p-4 transition-all duration-200 touch-manipulation animate-fade-in ${
                  gift.purchased 
                    ? "opacity-60 bg-muted/20" 
                    : "hover:border-border hover:shadow-md cursor-pointer active:scale-[0.99]"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={(e) => {
                  if (togglePurchasedMutation.isPending) {
                    e.preventDefault()
                  }
                }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    togglePurchasedMutation.mutate(gift.id)
                  }}
                  disabled={togglePurchasedMutation.isPending}
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all touch-manipulation z-10 relative ${
                    gift.purchased
                      ? "bg-foreground border-foreground text-background scale-105"
                      : "border-border hover:border-foreground/50 hover:scale-105 active:scale-95"
                  }`}
                  title={gift.purchased ? "Mark as not purchased" : "Mark as purchased"}
                >
                  {gift.purchased && <Check className="w-3 h-3" />}
                </button>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <h3 className={`text-sm sm:text-base font-semibold leading-snug ${
                        gift.purchased 
                          ? "line-through text-muted-foreground" 
                          : "text-foreground"
                      }`}>
                        {gift.name}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        {gift.price && (
                          <span className={`text-sm font-medium ${
                            gift.purchased 
                              ? "line-through text-muted-foreground/70" 
                              : "text-muted-foreground"
                          }`}>
                            {gift.price}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            gift.purchased
                              ? "bg-muted/50 text-muted-foreground/50"
                              : gift.priority === "high"
                                ? "bg-foreground/10 text-foreground"
                                : gift.priority === "medium"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-muted/50 text-muted-foreground/70"
                          }`}
                        >
                          {getPriorityLabel(gift.priority)}
                        </span>
                        {gift.purchased && (
                          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Purchased
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                        gift.purchased
                          ? "bg-muted/50 text-muted-foreground/50"
                          : "bg-accent text-foreground group-hover:bg-foreground group-hover:text-background group-hover:scale-105"
                      }`}>
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center bg-card/30">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-lg bg-accent/50 flex items-center justify-center">
                <Gift className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No gifts on this list yet.</p>
            </div>
          </div>
        )}

          <div className="mt-12 pt-8 border-t border-edge">
            <div className="bg-card border border-edge rounded-md p-6 text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center">
                  <Gift className="w-5 h-5 text-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Want to create your own gift list?
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors bg-gradient-to-b from-zinc-600 to-zinc-700 text-white px-4 py-2 rounded-md shadow-sm hover:from-zinc-500 hover:to-zinc-600"
              >
                Create your list
              </Link>
            </div>
          </div>
        </div>

        <footer className="screen-line-before py-4 px-4 sm:px-6">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>by</span>
            <a
              href="https://www.crafterstation.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors font-medium"
            >
              <CrafterStationLogo className="w-4 h-4" />
              <span>Crafter Station</span>
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}
