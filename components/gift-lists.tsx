"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ExternalLink, Copy, Trash2, Share2 } from "lucide-react"
import { toast } from "sonner"
import { useLists } from "@/lib/hooks/use-lists"
import type { GiftListWithGifts, Gift } from "@/lib/db/schema"

export function GiftLists() {
  const queryClient = useQueryClient()
  const {
    lists,
    isLoading,
    fingerprintId,
    deleteList,
    deleteGift,
    createGiftFromUrl,
    createGiftsFromUrls,
    isCreatingGiftFromUrl,
    isCreatingGiftsFromUrls,
  } = useLists()

  const [processingUrls, setProcessingUrls] = useState<string[]>([])
  const [completedUrls, setCompletedUrls] = useState<Set<string>>(new Set())
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const [activeList, setActiveList] = useState<string>("")
  const [isCreatingGiftModal, setIsCreatingGiftModal] = useState(false)
  const [giftUrl, setGiftUrl] = useState("")

  useEffect(() => {
    if (lists.length > 0 && !activeList) {
      setActiveList(lists[0].id)
    }
  }, [lists, activeList])

  const currentList = lists.find((l) => l.id === activeList)


  const handleDeleteList = (id: string) => {
    deleteList(id, {
      onSuccess: () => {
        if (activeList === id) {
          const remainingLists = lists.filter((l) => l.id !== id)
          setActiveList(remainingLists[0]?.id || "")
        }
      },
    })
  }

  const handleShareList = async (list: GiftListWithGifts) => {
    const shareToken = list.shareToken
    if (shareToken) {
      const url = `${window.location.origin}/l/${shareToken}`
      try {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied!", {
          description: "Share this link with others",
        })
      } catch (error) {
        toast.error("Failed to copy link", {
          description: "Please try again",
        })
      }
    }
  }

  const handleDeleteGift = (giftId: string) => {
    deleteGift(giftId)
  }

  const parseUrls = (input: string): string[] => {
    return input
      .split(/[\s,\n]+/)
      .map((url) => url.trim())
      .filter((url) => {
        try {
          new URL(url)
          return true
        } catch {
          return false
        }
      })
  }

  const handleCreateGiftFromUrl = async () => {
    if (!giftUrl.trim()) return
    
    const urls = parseUrls(giftUrl)
    if (urls.length === 0) {
      toast.error("No valid URLs found", {
        description: "Please paste one or more product URLs",
      })
      return
    }

    if (urls.length === 1) {
      createGiftFromUrl(urls[0], {
        onSuccess: (result) => {
          setTimeout(() => {
            const updatedData = queryClient.getQueryData<{
              lists: GiftListWithGifts[];
              isNewUser: boolean;
            }>(["gift-lists", fingerprintId]);
            if (updatedData?.lists) {
              const list = updatedData.lists.find((l) => l.id === result.listId)
              if (list) {
                toast.success("Gift added!", {
                  description: result.isNewList ? `Created list "${list.name}"` : `Added to "${list.name}"`,
                })
                setActiveList(list.id)
              }
            }
          }, 100)
          setGiftUrl("")
          setIsCreatingGiftModal(false)
        },
        onError: (error) => {
          toast.error("Failed to create gift", {
            description: error.message || "Please try again",
          })
        },
      })
    } else {
      setProcessingUrls(urls)
      setCompletedUrls(new Set())
      setFailedUrls(new Set())

      createGiftsFromUrls(urls, {
        onSuccess: (result) => {
          const successCount = result.results.filter((r) => r.success).length
          const errorCount = result.results.filter((r) => !r.success).length

          setTimeout(() => {
            const updatedData = queryClient.getQueryData<{
              lists: GiftListWithGifts[];
              isNewUser: boolean;
            }>(["gift-lists", fingerprintId]);
            if (updatedData?.lists) {
              const list = updatedData.lists.find((l) => l.id === result.listId)
              if (list) {
                setActiveList(list.id)
                if (successCount > 0) {
                  toast.success(`${successCount} gift${successCount > 1 ? "s" : ""} added!`, {
                    description: errorCount > 0 ? `${errorCount} failed` : result.isNewList ? `Created list "${list.name}"` : `Added to "${list.name}"`,
                  })
                } else {
                  toast.error("Failed to create gifts", {
                    description: "Please try again",
                  })
                }
              }
            }
          }, 100)

          setGiftUrl("")
          setIsCreatingGiftModal(false)
          setProcessingUrls([])
          setCompletedUrls(new Set())
          setFailedUrls(new Set())
        },
        onError: (error) => {
          toast.error("Failed to create gifts", {
            description: error.message || "Please try again",
          })
          setGiftUrl("")
          setIsCreatingGiftModal(false)
          setProcessingUrls([])
          setCompletedUrls(new Set())
          setFailedUrls(new Set())
        },
      })
    }
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-balance">gift0</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Share wishlists with friends</p>
          </div>
          <Button
            onClick={() => {
              setGiftUrl("")
              setIsCreatingGiftModal(true)
            }}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Gift
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Lists</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => setActiveList(list.id)}
                className={`w-full px-4 py-3 text-left border-b border-border hover:bg-accent transition-colors ${
                  activeList === list.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{list.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {list.gifts?.length || 0} {list.gifts?.length === 1 ? "item" : "items"}
                    </p>
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleShareList(list)
                    }}
                    className="p-1 hover:bg-muted transition-colors cursor-pointer"
                    title="Copy share link"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        handleShareList(list)
                      }
                    }}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {currentList ? (
            <div>
              <div className="border-b border-border px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-balance">{currentList.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentList.gifts?.length || 0} {currentList.gifts?.length === 1 ? "gift" : "gifts"} on this list
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      setGiftUrl("")
                      setIsCreatingGiftModal(true)
                    }} className="gap-2">
                      <Plus className="w-3.5 h-3.5" />
                      Add Gift
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShareList(currentList)} className="gap-2">
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteList(currentList.id)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {currentList.gifts?.length === 0 ? (
                  <div className="border border-dashed border-border p-12 text-center">
                    <p className="text-muted-foreground">No gifts yet. Add your first item to get started.</p>
                    <Button size="sm" onClick={() => {
                      setGiftUrl("")
                      setIsCreatingGiftModal(true)
                    }} className="gap-2 mt-4">
                      <Plus className="w-3.5 h-3.5" />
                      Add Gift
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-px bg-border">
                    {(currentList.gifts || []).map((gift: Gift) => (
                      <div
                        key={gift.id}
                        className="bg-card p-4 flex items-start gap-4 hover:bg-accent transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-balance">{gift.name}</h3>
                              {gift.price && <p className="text-sm text-muted-foreground mt-1">{gift.price}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <span
                                  className={`text-xs font-mono px-2 py-0.5 border ${
                                    gift.priority === "high"
                                      ? "border-foreground text-foreground"
                                      : gift.priority === "medium"
                                        ? "border-muted-foreground text-muted-foreground"
                                        : "border-border text-muted-foreground"
                                  }`}
                                >
                                  {gift.priority}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(gift.url, "_blank")}
                                className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGift(gift.id)}
                                className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {lists.length === 0 ? "No lists yet. Create your first gift list." : "Select a list to view gifts"}
                </p>
                {lists.length === 0 && (
                  <Button
                    onClick={() => {
                      setGiftUrl("")
                      setIsCreatingGiftModal(true)
                    }}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Gift
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {isCreatingGiftModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border w-full max-w-md">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold">Add Gift</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="giftUrlInput" className="text-sm text-muted-foreground block mb-2">
                  Product URL{parseUrls(giftUrl).length > 1 ? `s (${parseUrls(giftUrl).length})` : ""}
                </label>
                <textarea
                  id="giftUrlInput"
                  value={giftUrl}
                  onChange={(e) => setGiftUrl(e.target.value)}
                  placeholder="https://amazon.com/product/...&#10;https://example.com/product/...&#10;&#10;Separate multiple URLs with spaces, commas, or new lines"
                  rows={4}
                  className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-none"
                  autoFocus
                  disabled={isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0}
                />
                {giftUrl.trim() && parseUrls(giftUrl).length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No valid URLs detected</p>
                )}
              </div>
              {(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                  <span>
                    {processingUrls.length > 0 
                      ? `Creating... (${completedUrls.size}/${processingUrls.length})` 
                      : "Creating..."}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-border p-4 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingGiftModal(false)
                  setGiftUrl("")
                }}
                disabled={isCreatingGiftFromUrl || isCreatingGiftsFromUrls}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGiftFromUrl}
                disabled={(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0) || !giftUrl.trim()}
              >
                {(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0) ? `Creating... (${completedUrls.size}/${processingUrls.length || 1})` : "Add Gift"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
