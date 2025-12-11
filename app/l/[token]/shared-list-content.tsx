"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { notFound } from "next/navigation"
import { ExternalLink, Check, Heart } from "lucide-react"
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
    <main className="min-h-screen p-3 sm:p-4 md:p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 pb-5 sm:pb-7 border-b-2 border-border/50">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-balance">{list.name}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {list.gifts?.length || 0} {list.gifts?.length === 1 ? "gift" : "gifts"}
            {list.gifts && list.gifts.length > 0 && (
              <span className="ml-2">
                ({list.gifts.filter(g => g.purchased).length} purchased)
              </span>
            )}
          </p>
        </div>

        {list.gifts && list.gifts.length > 0 ? (
          <div className="space-y-2 sm:space-y-2.5">
            {list.gifts.map((gift) => (
              <a
                key={gift.id}
                href={gift.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative flex items-start gap-3 sm:gap-4 bg-card border border-border rounded-lg p-3 sm:p-4 transition-all duration-200 touch-manipulation ${
                  gift.purchased 
                    ? "opacity-70 bg-muted/30" 
                    : "hover:border-primary/50 hover:shadow-sm hover:bg-accent/50 cursor-pointer active:scale-[0.99]"
                }`}
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
                  className={`mt-0.5 flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center transition-all touch-manipulation z-10 relative ${
                    gift.purchased
                      ? "bg-primary border-primary text-primary-foreground scale-110"
                      : "border-border hover:border-primary hover:scale-105 active:scale-95"
                  }`}
                  title={gift.purchased ? "Mark as not purchased" : "Mark as purchased"}
                >
                  {gift.purchased && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                </button>
                <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm sm:text-base font-medium text-balance leading-snug mb-1.5 sm:mb-2 ${
                        gift.purchased 
                          ? "line-through text-muted-foreground" 
                          : "text-foreground group-hover:text-primary transition-colors"
                      }`}>
                        {gift.name}
                      </h3>
                      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        {gift.price && (
                          <span className={`text-xs sm:text-sm font-medium ${
                            gift.purchased 
                              ? "line-through text-muted-foreground/70" 
                              : "text-muted-foreground"
                          }`}>
                            {gift.price}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 border rounded-md font-medium transition-colors ${
                            gift.purchased
                              ? "border-muted-foreground/30 text-muted-foreground/50 bg-muted/20"
                              : gift.priority === "high"
                                ? "border-foreground/20 text-foreground bg-foreground/5"
                                : gift.priority === "medium"
                                  ? "border-muted-foreground/30 text-muted-foreground bg-muted/10"
                                  : "border-border/50 text-muted-foreground bg-muted/5"
                          }`}
                        >
                          {getPriorityLabel(gift.priority)}
                        </span>
                        {gift.purchased && (
                          <span className="text-xs text-muted-foreground/70 font-medium">
                            Purchased
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 pt-0.5">
                      <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md transition-all ${
                        gift.purchased
                          ? "bg-muted/50 text-muted-foreground/50"
                          : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-105"
                      }`}>
                        <ExternalLink className="w-4 h-4 sm:w-4 sm:h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-8 sm:p-12 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">No gifts on this list yet.</p>
          </div>
        )}

        <div className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t-2 border-border/50">
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 border border-border/60 rounded-xl p-6 sm:p-8 text-center space-y-4 sm:space-y-5 shadow-sm">
            <p className="text-sm sm:text-base text-muted-foreground font-medium">
              Want to create your own list?
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors underline underline-offset-4 decoration-2"
            >
              Create your gift list →
            </Link>
          </div>
        </div>
      </div>

      <footer className="border-t-2 border-border/50 bg-muted/30 backdrop-blur-sm py-5 sm:py-6 px-3 sm:px-6 mt-12 sm:mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 fill-[#F8BC31] text-[#F8BC31] heart-pulse" />
              <span>by</span>
              <a
                href="https://www.crafterstation.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <CrafterStationLogo className="w-4 h-4" />
                <span className="font-medium">Crafter Station</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
