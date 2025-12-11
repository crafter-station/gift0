"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ExternalLink, Copy, Trash2, Share2, Menu, X, Heart, Pencil, Check } from "lucide-react"
import { CrafterStationLogo } from "@/components/logos/crafter-station"
import { toast } from "sonner"
import { useLists } from "@/lib/hooks/use-lists"
import type { GiftListWithGifts, Gift } from "@/lib/db/schema"
import { getPriorityLabel } from "@/lib/utils"
import Image from "next/image"

export function GiftLists() {
  const queryClient = useQueryClient()
  const {
    lists,
    isLoading,
    fingerprintId,
    deleteList,
    updateListName,
    deleteGift,
    updateGift,
    toggleGiftPurchased,
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
  const [editingListId, setEditingListId] = useState<string | null>(null)
  const [editingListName, setEditingListName] = useState("")
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null)
  const [editingGift, setEditingGift] = useState<Partial<Gift> | null>(null)
  const [isCreatingNewList, setIsCreatingNewList] = useState(false)

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

  const handleEditListName = (list: GiftListWithGifts) => {
    setEditingListId(list.id)
    setEditingListName(list.name)
  }

  const handleSaveListName = () => {
    if (!editingListId || !editingListName.trim()) return
    
    updateListName(
      { listId: editingListId, name: editingListName.trim() },
      {
        onSuccess: () => {
          setEditingListId(null)
          setEditingListName("")
          toast.success("List name updated")
        },
        onError: (error) => {
          toast.error("Failed to update list name", {
            description: error.message || "Please try again",
          })
        },
      }
    )
  }

  const handleEditGift = (gift: Gift) => {
    setEditingGiftId(gift.id)
    setEditingGift({
      name: gift.name,
      url: gift.url,
      price: gift.price || "",
      priority: gift.priority,
      purchased: gift.purchased,
    })
  }

  const handleSaveGift = () => {
    if (!editingGiftId || !editingGift) return
    
    updateGift(
      {
        giftId: editingGiftId,
        data: {
          name: editingGift.name,
          url: editingGift.url,
          price: editingGift.price || undefined,
          priority: editingGift.priority,
          purchased: editingGift.purchased,
        },
      },
      {
        onSuccess: () => {
          setEditingGiftId(null)
          setEditingGift(null)
          toast.success("Gift updated")
        },
        onError: (error) => {
          toast.error("Failed to update gift", {
            description: error.message || "Please try again",
          })
        },
      }
    )
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
      createGiftFromUrl({ 
        url: urls[0], 
        listId: isCreatingNewList ? undefined : (activeList || undefined),
        forceNewList: isCreatingNewList,
      }, {
        onSuccess: (result: { listId: string; gift: any; isNewList: boolean }) => {
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
          setIsCreatingNewList(false)
        },
        onError: (error: Error) => {
          toast.error("Failed to create gift", {
            description: error.message || "Please try again",
          })
          setIsCreatingNewList(false)
        },
      })
    } else {
      setProcessingUrls(urls)
      setCompletedUrls(new Set())
      setFailedUrls(new Set())

      createGiftsFromUrls({ 
        urls, 
        listId: isCreatingNewList ? undefined : (activeList || undefined),
        forceNewList: isCreatingNewList,
      }, {
        onSuccess: (result: { listId: string; listName: string; results: Array<{ success: boolean; gift?: any; error?: string; url: string }>; isNewList: boolean }) => {
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
          setIsCreatingNewList(false)
          setProcessingUrls([])
          setCompletedUrls(new Set())
          setFailedUrls(new Set())
        },
        onError: (error: Error) => {
          toast.error("Failed to create gifts", {
            description: error.message || "Please try again",
          })
          setGiftUrl("")
          setIsCreatingGiftModal(false)
          setIsCreatingNewList(false)
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
            <div className="flex items-center gap-2.5">
              <Image
                src="/gift0_logo.png"
                alt="gift0"
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8 shrink-0"
                priority
              />
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-balance leading-none translate-y-[10px]">gift0</h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block leading-tight translate-y-[10px]">Share wishlists with friends</p>
              </div>
            </div>
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
          <div className="p-3 sm:p-4 border-b border-border">
            <Button
              onClick={() => {
                setGiftUrl("")
                setIsCreatingNewList(true)
                setIsCreatingGiftModal(true)
              }}
              size="sm"
              className="w-full gap-2 text-xs sm:text-sm"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Create New List</span>
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
                    {editingListId === currentList.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveListName()
                            if (e.key === "Escape") {
                              setEditingListId(null)
                              setEditingListName("")
                            }
                          }}
                          className="text-lg sm:text-xl font-semibold h-auto py-1"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveListName}
                          className="h-8"
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingListId(null)
                            setEditingListName("")
                          }}
                          className="h-8"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-semibold text-balance">{currentList.name}</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditListName(currentList)}
                          className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                          title="Edit list name"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      {currentList.gifts?.length || 0} {currentList.gifts?.length === 1 ? "gift" : "gifts"} on this list
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => {
                      setGiftUrl("")
                      setIsCreatingNewList(false)
                      setIsCreatingGiftModal(true)
                    }} className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add gift to this list</span>
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
                      setIsCreatingNewList(false)
                      setIsCreatingGiftModal(true)
                    }} className="gap-2 mt-4">
                      <Plus className="w-3.5 h-3.5" />
                      Add gift to this list
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-px bg-border">
                    {(currentList.gifts || []).map((gift: Gift) => (
                      <div
                        key={gift.id}
                        className={`bg-card p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:bg-accent transition-colors group ${
                          gift.purchased ? "opacity-60" : ""
                        }`}
                      >
                        <button
                          onClick={() => toggleGiftPurchased(gift.id)}
                          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors touch-manipulation ${
                            gift.purchased
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border hover:border-primary/50"
                          }`}
                          title={gift.purchased ? "Mark as not purchased" : "Mark as purchased"}
                        >
                          {gift.purchased && <Check className="w-3 h-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className={`text-sm sm:text-base font-medium text-balance leading-tight ${
                                gift.purchased ? "line-through text-muted-foreground" : ""
                              }`}>
                                {gift.name}
                              </h3>
                              {gift.price && (
                                <p className={`text-xs sm:text-sm text-muted-foreground mt-1 ${
                                  gift.purchased ? "line-through" : ""
                                }`}>
                                  {gift.price}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span
                                  className={`text-xs px-1.5 sm:px-2 py-0.5 border rounded ${
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
                                onClick={() => handleEditGift(gift)}
                                className="gap-1 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity p-2 touch-manipulation"
                                title="Edit gift"
                              >
                                <Pencil className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
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
                      setIsCreatingNewList(false)
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

      {editingGiftId && editingGift && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-card border border-border w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="border-b border-border p-3 sm:p-4 shrink-0">
              <h3 className="text-base sm:text-lg font-semibold">Edit Gift</h3>
            </div>
            <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1">
              <div>
                <label htmlFor="editGiftName" className="text-sm text-muted-foreground block mb-2">
                  Name
                </label>
                <Input
                  id="editGiftName"
                  value={editingGift.name || ""}
                  onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                  placeholder="Product name"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="editGiftUrl" className="text-sm text-muted-foreground block mb-2">
                  URL
                </label>
                <Input
                  id="editGiftUrl"
                  value={editingGift.url || ""}
                  onChange={(e) => setEditingGift({ ...editingGift, url: e.target.value })}
                  placeholder="https://example.com/product"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="editGiftPrice" className="text-sm text-muted-foreground block mb-2">
                  Price (optional)
                </label>
                <Input
                  id="editGiftPrice"
                  value={editingGift.price || ""}
                  onChange={(e) => setEditingGift({ ...editingGift, price: e.target.value })}
                  placeholder="$99.99"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="editGiftPriority" className="text-sm text-muted-foreground block mb-2">
                  Priority
                </label>
                <select
                  id="editGiftPriority"
                  value={editingGift.priority || "medium"}
                  onChange={(e) => setEditingGift({ ...editingGift, priority: e.target.value as "high" | "medium" | "low" })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">{getPriorityLabel("low")}</option>
                  <option value="medium">{getPriorityLabel("medium")}</option>
                  <option value="high">{getPriorityLabel("high")}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editGiftPurchased"
                  checked={editingGift.purchased || false}
                  onChange={(e) => setEditingGift({ ...editingGift, purchased: e.target.checked })}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="editGiftPurchased" className="text-sm text-muted-foreground cursor-pointer">
                  Mark as purchased
                </label>
              </div>
            </div>
            <div className="border-t border-border p-3 sm:p-4 flex justify-end gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingGiftId(null)
                  setEditingGift(null)
                }}
                className="text-xs sm:text-sm touch-manipulation"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveGift}
                disabled={!editingGift.name?.trim() || !editingGift.url?.trim()}
                className="text-xs sm:text-sm touch-manipulation"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {isCreatingGiftModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-card border border-border w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="border-b border-border p-3 sm:p-4 shrink-0">
              <h3 className="text-base sm:text-lg font-semibold">
                {isCreatingNewList ? "Create New List" : activeList ? "Add gift to this list" : "Add Gift"}
              </h3>
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
                  setIsCreatingNewList(false)
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
                {(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0) 
                  ? `Creating... (${completedUrls.size}/${processingUrls.length || 1})` 
                  : isCreatingNewList 
                    ? "Create List" 
                    : activeList
                      ? "Add gift to this list"
                      : "Add Gift"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <footer className="border-t border-border py-3 px-3 sm:px-6">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
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
      </footer>
    </div>
  )
}
