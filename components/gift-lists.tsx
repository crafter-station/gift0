"use client"

import { useState, useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { SimpleTooltip } from "@/components/ui/tooltip"
import { Onboarding } from "@/components/onboarding"
import { Plus, ExternalLink, Copy, Trash2, Share2, Menu, X, Heart, Pencil, Check, Gift as GiftIcon, HelpCircle, Loader2 } from "lucide-react"
import { CrafterStationLogo } from "@/components/logos/crafter-station"
import { toast } from "sonner"
import { useLists } from "@/lib/hooks/use-lists"
import { useOnboarding, DEMO_GIFT } from "@/lib/hooks/use-onboarding"
import { createDemoGift } from "@/app/actions/gifts"
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

  const {
    isOnboarding,
    currentStep,
    hasCheckedStorage,
    nextStep,
    completeOnboarding,
    skipOnboarding,
    setCurrentStep,
    resetOnboarding,
  } = useOnboarding()

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

  const [onboardingGiftId, setOnboardingGiftId] = useState<string | null>(null)
  const [isOnboardingExtracting, setIsOnboardingExtracting] = useState(false)

  // Handle onboarding - open modal with pre-filled URL
  const handleOnboardingOpenModal = () => {
    if (!isOnboarding || currentStep !== "add-gift") return
    setGiftUrl(DEMO_GIFT.url)
    setIsCreatingNewList(true)
    setIsCreatingGiftModal(true)
  }

  // Handle onboarding demo gift creation (instant - no Firecrawl)
  const handleOnboardingCreateGift = async () => {
    if (!isOnboarding || !fingerprintId) return
    
    setIsOnboardingExtracting(true)
    setCurrentStep("adding-gift")
    
    try {
      // Create demo gift directly (no extraction needed)
      const result = await createDemoGift(fingerprintId, {
        name: DEMO_GIFT.name,
        url: DEMO_GIFT.url,
        price: DEMO_GIFT.price,
        priority: DEMO_GIFT.priority,
      })
      
      setIsOnboardingExtracting(false)
      setIsCreatingGiftModal(false)
      setGiftUrl("")
      setIsCreatingNewList(false)
      
      // Refresh the lists
      await queryClient.invalidateQueries({ queryKey: ["gift-lists", fingerprintId] })
      
      // Set active list and highlight the gift
      setActiveList(result.list.id)
      setOnboardingGiftId(result.gift.id)
      setCurrentStep("gift-added")
    } catch {
      setIsOnboardingExtracting(false)
      setCurrentStep("add-gift")
      toast.error("Failed to create demo gift")
    }
  }

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
        // Progress onboarding if sharing during tutorial
        if (isOnboarding && currentStep === "share-list") {
          setCurrentStep("list-shared")
        }
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
      // Progress onboarding if sharing during tutorial
      if (isOnboarding && currentStep === "share-list") {
        setCurrentStep("list-shared")
      }
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

  const handleTogglePurchased = (giftId: string) => {
    toggleGiftPurchased(giftId)
    // Progress onboarding if marking purchased during tutorial
    if (isOnboarding && currentStep === "mark-purchased") {
      setOnboardingGiftId(null)
      setTimeout(() => {
        setCurrentStep("completed")
      }, 500)
    }
  }

  // Clear onboarding gift highlight when moving past gift-added step
  useEffect(() => {
    if (currentStep !== "gift-added" && currentStep !== "share-list" && currentStep !== "list-shared" && currentStep !== "mark-purchased") {
      setOnboardingGiftId(null)
    }
  }, [currentStep])

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

  if (isLoading || !hasCheckedStorage) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading your gifts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="screen-line-after bg-background sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 border-x border-edge">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex items-center gap-3">
              <Image
                src="/gift0_logo.png"
                alt="gift0"
                width={36}
                height={36}
                className="w-8 h-8 sm:w-9 sm:h-9 shrink-0"
                priority
              />
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">gift0</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Share wishlists with friends</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative max-w-6xl mx-auto w-full border-x border-edge">
        <aside className={`absolute md:relative inset-y-0 left-0 z-50 md:z-auto w-64 border-r border-edge flex flex-col bg-background transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          <div className="p-4 border-b border-edge flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GiftIcon className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lists</p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-3 border-b border-edge">
            <Button
              onClick={() => {
                if (isOnboarding && currentStep === "add-gift") {
                  handleOnboardingOpenModal()
                } else {
                  setGiftUrl("")
                  setIsCreatingNewList(true)
                  setIsCreatingGiftModal(true)
                }
              }}
              size="sm"
              className={`w-full gap-2 ${isOnboarding && currentStep === "add-gift" ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
            >
              <Plus className="w-4 h-4" />
              <span>New List</span>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-edge">
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => {
                    setActiveList(list.id)
                    setIsMobileMenuOpen(false)
                  }}
                  className={`w-full px-3 py-3 text-left transition-all touch-manipulation group ${
                    activeList === list.id 
                      ? "bg-accent" 
                      : "hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${activeList === list.id ? "text-foreground" : "text-foreground/80"}`}>
                        {list.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {list.gifts?.length || 0} {list.gifts?.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <SimpleTooltip content="Share list">
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          handleShareList(list)
                        }}
                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all cursor-pointer touch-manipulation"
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
                    </SimpleTooltip>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
        
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 overflow-y-auto">
          {currentList ? (
            <div className="animate-fade-in">
              <div className="border-b border-edge px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
                          className="text-lg sm:text-xl font-semibold h-auto py-1.5"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleSaveListName}>
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingListId(null)
                            setEditingListName("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{currentList.name}</h2>
                        <SimpleTooltip content="Edit name">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEditListName(currentList)}
                            className="opacity-50 hover:opacity-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </SimpleTooltip>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentList.gifts?.length || 0} {currentList.gifts?.length === 1 ? "gift" : "gifts"} on this list
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => {
                      setGiftUrl("")
                      setIsCreatingNewList(false)
                      setIsCreatingGiftModal(true)
                    }} className="gap-2">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add Gift</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                    <SimpleTooltip content="Copy share link">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleShareList(currentList)} 
                        className={`gap-2 ${isOnboarding && currentStep === "share-list" ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                      >
                        <Copy className="w-4 h-4" />
                        <span className="hidden sm:inline">Share</span>
                      </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content="Delete list">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteList(currentList.id)}
                        className="gap-2 text-destructive hover:text-destructive hover:border-destructive/50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </SimpleTooltip>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {currentList.gifts?.length === 0 ? (
                  <div className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center bg-card/30">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-accent/50 flex items-center justify-center">
                        <GiftIcon className="w-7 h-7 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-foreground font-medium">No gifts yet</p>
                        <p className="text-sm text-muted-foreground">Add your first item to get started</p>
                      </div>
                      <Button onClick={() => {
                        setGiftUrl("")
                        setIsCreatingNewList(false)
                        setIsCreatingGiftModal(true)
                      }} className="gap-2 mt-2">
                        <Plus className="w-4 h-4" />
                        Add your first gift
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(currentList.gifts || []).map((gift: Gift, index: number) => (
                      <div
                        key={gift.id}
                        className={`group relative bg-card border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                          gift.purchased ? "opacity-60 bg-muted/20 border-border/50" : ""
                        } ${isOnboarding && onboardingGiftId === gift.id && ["gift-added", "share-list", "list-shared", "mark-purchased"].includes(currentStep) ? "border-foreground ring-1 ring-foreground shadow-lg" : "border-border/50 hover:border-border"}`}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleTogglePurchased(gift.id)}
                            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all touch-manipulation ${
                              gift.purchased
                                ? "bg-foreground border-foreground text-background scale-105"
                                : "border-border hover:border-foreground/50 hover:scale-105"
                            } ${isOnboarding && currentStep === "mark-purchased" && !gift.purchased ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}`}
                            title={gift.purchased ? "Mark as not purchased" : "Mark as purchased"}
                          >
                            {gift.purchased && <Check className="w-3 h-3" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0 space-y-2">
                                <h3 className={`text-sm sm:text-base font-semibold leading-snug ${
                                  gift.purchased ? "line-through text-muted-foreground" : "text-foreground"
                                }`}>
                                  {gift.name}
                                </h3>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {gift.price && (
                                    <span className={`text-sm font-medium ${
                                      gift.purchased ? "line-through text-muted-foreground/70" : "text-muted-foreground"
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
                              <div className="flex items-center gap-1 shrink-0">
                                <SimpleTooltip content="Open link">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => window.open(gift.url, "_blank")}
                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </SimpleTooltip>
                                <SimpleTooltip content="Edit gift">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleEditGift(gift)}
                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </SimpleTooltip>
                                <SimpleTooltip content="Delete gift">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => handleDeleteGift(gift.id)}
                                    className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive touch-manipulation"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </SimpleTooltip>
                              </div>
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
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center space-y-6 max-w-md">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-muted flex items-center justify-center">
                    <GiftIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">
                    {lists.length === 0 ? "Create your first list" : "Select a list"}
                  </h3>
                  <p className="text-muted-foreground">
                    {lists.length === 0 
                      ? "Start by adding a product URL and we'll create a beautiful gift list for you." 
                      : "Choose a list from the sidebar to view and manage your gifts."}
                  </p>
                </div>
                {lists.length === 0 && (
                  <Button
                    onClick={() => {
                      setGiftUrl("")
                      setIsCreatingNewList(true)
                      setIsCreatingGiftModal(true)
                    }}
                    size="lg"
                    className="gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create New List
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={!!editingGiftId && !!editingGift} onOpenChange={(open) => {
        if (!open) {
          setEditingGiftId(null)
          setEditingGift(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Gift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="editGiftName" className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                id="editGiftName"
                value={editingGift?.name || ""}
                onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGiftUrl" className="text-sm font-medium text-foreground">
                URL
              </label>
              <Input
                id="editGiftUrl"
                value={editingGift?.url || ""}
                onChange={(e) => setEditingGift({ ...editingGift, url: e.target.value })}
                placeholder="https://example.com/product"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGiftPrice" className="text-sm font-medium text-foreground">
                Price <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                id="editGiftPrice"
                value={editingGift?.price || ""}
                onChange={(e) => setEditingGift({ ...editingGift, price: e.target.value })}
                placeholder="$99.99"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="editGiftPriority" className="text-sm font-medium text-foreground">
                Priority
              </label>
              <select
                id="editGiftPriority"
                value={editingGift?.priority || "medium"}
                onChange={(e) => setEditingGift({ ...editingGift, priority: e.target.value as "high" | "medium" | "low" })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="low">{getPriorityLabel("low")}</option>
                <option value="medium">{getPriorityLabel("medium")}</option>
                <option value="high">{getPriorityLabel("high")}</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="editGiftPurchased"
                checked={editingGift?.purchased || false}
                onChange={(e) => setEditingGift({ ...editingGift, purchased: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-success"
              />
              <span className="text-sm text-foreground">Mark as purchased</span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setEditingGiftId(null)
                setEditingGift(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGift}
              disabled={!editingGift?.name?.trim() || !editingGift?.url?.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingGiftModal} onOpenChange={(open) => {
        if (!open && !isCreatingGiftFromUrl && !isCreatingGiftsFromUrls && !isOnboardingExtracting) {
          setIsCreatingGiftModal(false)
          setGiftUrl("")
          setIsCreatingNewList(false)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isCreatingNewList ? "Create New List" : "Add Gift"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="giftUrlInput" className="text-sm font-medium text-foreground">
                Product URL{parseUrls(giftUrl).length > 1 ? `s (${parseUrls(giftUrl).length})` : ""}
              </label>
              <textarea
                id="giftUrlInput"
                value={giftUrl}
                onChange={(e) => !isOnboardingExtracting && setGiftUrl(e.target.value)}
                placeholder="https://amazon.com/product/...&#10;https://example.com/product/...&#10;&#10;Separate multiple URLs with spaces, commas, or new lines"
                rows={4}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                autoFocus={!(isOnboarding && currentStep === "add-gift")}
                disabled={isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0 || isOnboardingExtracting}
                readOnly={isOnboarding && currentStep === "add-gift"}
              />
              {giftUrl.trim() && parseUrls(giftUrl).length === 0 && (
                <p className="text-xs text-destructive">No valid URLs detected</p>
              )}
              <p className="text-xs text-muted-foreground">
                We&apos;ll automatically extract the product name and price
              </p>
            </div>
            {(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0 || isOnboardingExtracting) && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">
                  {processingUrls.length > 0 
                    ? `Creating gifts... (${completedUrls.size}/${processingUrls.length})` 
                    : "Extracting product info..."}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreatingGiftModal(false)
                setGiftUrl("")
                setIsCreatingNewList(false)
              }}
              disabled={isCreatingGiftFromUrl || isCreatingGiftsFromUrls || isOnboardingExtracting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (isOnboarding && currentStep === "add-gift") {
                  handleOnboardingCreateGift()
                } else {
                  handleCreateGiftFromUrl()
                }
              }}
              disabled={(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0 || isOnboardingExtracting) || !giftUrl.trim() || parseUrls(giftUrl).length === 0}
              autoFocus={isOnboarding && currentStep === "add-gift"}
              className={isOnboarding && currentStep === "add-gift" ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""}
            >
              {(isCreatingGiftFromUrl || isCreatingGiftsFromUrls || processingUrls.length > 0 || isOnboardingExtracting) 
                ? "Extracting..." 
                : isCreatingNewList 
                  ? "Create List" 
                  : "Add Gift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <footer className="screen-line-before">
        <div className="max-w-6xl mx-auto border-x border-edge">
          <div className="py-4 px-4 sm:px-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
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
            <div className="w-px h-4 bg-edge" />
            <button
              onClick={resetOnboarding}
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tutorial</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Onboarding Tutorial */}
      {isOnboarding && (
        <Onboarding
          currentStep={currentStep}
          onNext={nextStep}
          onSkip={skipOnboarding}
          onComplete={completeOnboarding}
        />
      )}
    </div>
  )
}
