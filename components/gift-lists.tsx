"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ExternalLink, Copy, Trash2, Share2, Menu, X, Github, Heart } from "lucide-react"
import { CrafterStationLogo } from "@/components/logos/crafter-station"
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (err) {
        console.warn("Clipboard API failed, trying fallback", err)
      }
    }

    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.setAttribute("readonly", "")
    textArea.style.position = "absolute"
    textArea.style.left = "-9999px"
    textArea.style.top = "0"
    textArea.style.width = "2em"
    textArea.style.height = "2em"
    textArea.style.padding = "0"
    textArea.style.border = "none"
    textArea.style.outline = "none"
    textArea.style.boxShadow = "none"
    textArea.style.background = "transparent"
    
    document.body.appendChild(textArea)
    
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange()
      range.selectNodeContents(textArea)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      textArea.setSelectionRange(0, 999999)
    } else {
      textArea.select()
    }

    try {
      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)
      return successful
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  }

  const handleShareList = async (list: GiftListWithGifts) => {
    const shareToken = list.shareToken
    if (!shareToken) return

    const url = `${window.location.origin}/l/${shareToken}`

    if (navigator.share && /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: list.name,
          text: `Check out my gift list: ${list.name}`,
          url: url,
        })
        return
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.warn("Web Share API failed, falling back to copy", err)
        } else {
          return
        }
      }
    }

    const success = await copyToClipboard(url)
    if (success) {
      toast.success("Link copied!", {
        description: "Share this link with others",
      })
    } else {
      toast.error("Copy failed", {
        description: url,
        duration: 5000,
        action: {
          label: "Select URL",
          onClick: () => {
            const input = document.createElement("input")
            input.value = url
            input.style.position = "fixed"
            input.style.top = "0"
            input.style.left = "0"
            input.style.width = "100%"
            input.style.height = "100%"
            input.style.opacity = "0"
            input.style.pointerEvents = "none"
            document.body.appendChild(input)
            input.focus()
            input.select()
            if (navigator.userAgent.match(/ipad|iphone/i)) {
              input.setSelectionRange(0, 999999)
            }
            setTimeout(() => {
              document.body.removeChild(input)
            }, 100)
            toast.info("URL selected - tap to paste", {
              duration: 3000,
            })
          },
        },
      })
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
        <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-0">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-balance">gift0</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">Share wishlists with friends</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/crafter-station/gift0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 sm:h-9 sm:w-9 p-0"
              title="View on GitHub"
            >
              <Github className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
            <Button
              onClick={() => {
                setGiftUrl("")
                setIsCreatingGiftModal(true)
              }}
              size="sm"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Add Gift</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`absolute md:relative inset-y-0 left-0 z-50 md:z-auto w-64 border-r border-border flex flex-col bg-background transition-transform duration-200 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Lists</p>
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-1"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => {
                  setActiveList(list.id)
                  setIsMobileMenuOpen(false)
                }}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-left border-b border-border hover:bg-accent transition-colors touch-manipulation ${
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
                    className="p-1.5 hover:bg-muted transition-colors cursor-pointer touch-manipulation"
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
                    <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
        
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-background/80 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto">
          {currentList ? (
            <div>
              <div className="border-b border-border px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-balance">{currentList.name}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {currentList.gifts?.length || 0} {currentList.gifts?.length === 1 ? "gift" : "gifts"} on this list
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => {
                      setGiftUrl("")
                      setIsCreatingGiftModal(true)
                    }} className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Gift</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShareList(currentList)} className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Copy Link</span>
                      <span className="sm:hidden">Link</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteList(currentList.id)}
                      className="gap-1.5 sm:gap-2 text-xs sm:text-sm text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                      <span className="sm:hidden">Del</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-6">
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
                        className="bg-card p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:bg-accent transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm sm:text-base font-medium text-balance leading-tight">{gift.name}</h3>
                              {gift.price && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{gift.price}</p>}
                              <div className="flex items-center gap-2 mt-2">
                                <span
                                  className={`text-xs font-mono px-1.5 sm:px-2 py-0.5 border ${
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
                            <div className="flex items-center gap-1 sm:gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(gift.url, "_blank")}
                                className="gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 touch-manipulation"
                                title="Open link"
                              >
                                <ExternalLink className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteGift(gift.id)}
                                className="gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive p-2 touch-manipulation"
                                title="Delete gift"
                              >
                                <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-card border border-border w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="border-b border-border p-3 sm:p-4 shrink-0">
              <h3 className="text-base sm:text-lg font-semibold">Add Gift</h3>
            </div>
            <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
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
            <div className="border-t border-border p-3 sm:p-4 flex justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreatingGiftModal(false)
                  setGiftUrl("")
                }}
                disabled={isCreatingGiftFromUrl || isCreatingGiftsFromUrls}
                className="text-xs sm:text-sm touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGiftFromUrl}
                disabled={(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0) || !giftUrl.trim()}
                className="text-xs sm:text-sm touch-manipulation"
              >
                {(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0) ? `Creating... (${completedUrls.size}/${processingUrls.length || 1})` : "Add Gift"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="border-t border-border py-3 px-3 sm:px-6">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Made with</span>
          <Heart className="w-3.5 h-3.5 fill-[#F8BC31] text-[#F8BC31]" />
          <span>by</span>
          <a
            href="https://crafter.station"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <CrafterStationLogo className="w-4 h-4" />
            <span className="font-medium">Crafter Station</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
